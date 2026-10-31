/**
 * Awin product feed reader (Ovosearch step 1: collect real prices).
 *
 * Turns the CSV of an Awin product feed into clean offers and groups them into products by EAN.
 * Pure functions, no network and no database: the scheduled job downloads the feed and stores
 * what this returns. Nothing here is shown in the app yet.
 *
 * Rules (from the Ovosearch plan):
 * - only EUR prices above 0, only products in stock, only safe http(s) links;
 * - total price = price + delivery cost (a missing delivery cost stays "unknown", it is never guessed);
 * - the store's "RRP / old price" is kept only as information, never used to claim a discount;
 * - products are matched only by a valid EAN/GTIN; rows without one are kept apart (no title guessing).
 */
import { isValidGtin, normalizeGtin } from '../utils/ean';
import { isSafeHttpUrl } from '../utils/url';

export interface FeedOffer {
  /** EAN-13 (normalized), or '' when the row has no valid code. */
  ean: string;
  merchantId: string;
  merchantName: string;
  merchantProductId: string;
  title: string;
  brand: string;
  category: string;
  image: string;
  /** Affiliate link (Awin deep link). */
  url: string;
  price: number;
  /** null = the feed does not say; shown as "check at the store", never as free. */
  shipping: number | null;
  /** price + shipping when shipping is known, otherwise the price alone. */
  total: number;
  rrp: number | null;
  inStock: boolean;
}

export interface FeedProduct {
  ean: string;
  title: string;
  brand: string;
  category: string;
  image: string;
  /** One offer per store, cheapest total first. */
  offers: FeedOffer[];
}

export type SkipReason = 'currency' | 'price' | 'stock' | 'url' | 'title';

export interface FeedReport {
  rows: number;
  offers: number;
  withoutEan: number;
  skipped: Record<SkipReason, number>;
}

/* ------------------------------------------------------------------ CSV ------------------------------------------------------------------ */

/** Splits CSV text into rows of cells. Handles quotes, "" inside quotes, commas/new lines inside quotes, CRLF and a BOM. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

/* ------------------------------------------------------------------ Values ------------------------------------------------------------------ */

/** "1.299,00" / "1299.00" / "1,299.00" / "12,5 EUR" -> number, or null. */
export function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  let v = value.replace(/[^\d.,-]/g, '');
  if (!v) return null;
  const lastComma = v.lastIndexOf(',');
  const lastDot = v.lastIndexOf('.');
  if (lastComma > lastDot) v = v.replace(/\./g, '').replace(',', '.'); // German format
  else v = v.replace(/,/g, '');
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}


const falsy = (v: string | undefined) => /^(0|no|false|n|nein|out of stock|outofstock|unavailable)$/i.test((v || '').trim());

/** Column names differ between feeds; the first one present wins. */
const COLUMNS = {
  ean: ['ean', 'product_GTIN', 'product_gtin', 'gtin', 'upc'],
  merchantId: ['merchant_id', 'advertiser_id'],
  merchantName: ['merchant_name', 'advertiser_name'],
  merchantProductId: ['merchant_product_id', 'aw_product_id', 'product_id'],
  title: ['product_name', 'title', 'name'],
  brand: ['brand_name', 'brand'],
  category: ['category_name', 'merchant_category', 'product_type'],
  image: ['merchant_image_url', 'aw_image_url', 'large_image', 'image_url'],
  url: ['aw_deep_link', 'deep_link', 'link'],
  price: ['search_price', 'store_price', 'display_price', 'price'],
  shipping: ['delivery_cost', 'shipping_cost', 'delivery_price'],
  currency: ['currency'],
  rrp: ['rrp_price', 'rrp', 'base_price'],
  inStock: ['in_stock', 'is_for_sale', 'availability', 'stock_status'],
} as const;

type Field = keyof typeof COLUMNS;

/* ------------------------------------------------------------------ Main ------------------------------------------------------------------ */

export function readAwinFeed(csv: string): { products: FeedProduct[]; withoutEan: FeedOffer[]; report: FeedReport } {
  const table = parseCsv(csv);
  const report: FeedReport = {
    rows: Math.max(0, table.length - 1),
    offers: 0,
    withoutEan: 0,
    skipped: { currency: 0, price: 0, stock: 0, url: 0, title: 0 },
  };
  if (table.length < 2) return { products: [], withoutEan: [], report };

  const header = table[0].map((h) => h.trim());
  const index: Partial<Record<Field, number>> = {};
  (Object.keys(COLUMNS) as Field[]).forEach((f) => {
    const i = COLUMNS[f].map((name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase())).find((x) => x >= 0);
    if (i !== undefined) index[f] = i;
  });
  const get = (row: string[], f: Field) => (index[f] !== undefined ? (row[index[f] as number] ?? '').trim() : '');

  const offers: FeedOffer[] = [];
  for (const row of table.slice(1)) {
    const currency = get(row, 'currency');
    if (currency && currency.toUpperCase() !== 'EUR') {
      report.skipped.currency++;
      continue;
    }
    const price = parsePrice(get(row, 'price'));
    if (price === null || price <= 0) {
      report.skipped.price++;
      continue;
    }
    const stock = get(row, 'inStock');
    if (falsy(stock)) {
      report.skipped.stock++;
      continue;
    }
    const url = get(row, 'url');
    if (!isSafeHttpUrl(url)) {
      report.skipped.url++;
      continue;
    }
    const title = get(row, 'title');
    if (!title) {
      report.skipped.title++;
      continue;
    }
    const shippingRaw = get(row, 'shipping');
    const shipping = shippingRaw === '' ? null : parsePrice(shippingRaw);
    const rawEan = get(row, 'ean');
    const ean = rawEan && isValidGtin(rawEan) ? normalizeGtin(rawEan) : '';
    const image = get(row, 'image');
    offers.push({
      ean,
      merchantId: get(row, 'merchantId'),
      merchantName: get(row, 'merchantName'),
      merchantProductId: get(row, 'merchantProductId'),
      title,
      brand: get(row, 'brand'),
      category: get(row, 'category'),
      image: isSafeHttpUrl(image) ? image : '',
      url,
      price,
      shipping: shipping !== null && shipping >= 0 ? shipping : null,
      total: Math.round((price + (shipping !== null && shipping > 0 ? shipping : 0)) * 100) / 100,
      rrp: parsePrice(get(row, 'rrp')),
      inStock: true, // rows marked as out of stock were skipped above
    });
  }
  report.offers = offers.length;

  const withoutEan = offers.filter((o) => !o.ean);
  report.withoutEan = withoutEan.length;

  // Group by EAN; one offer per store (the cheapest total if a store lists the product twice).
  const byEan = new Map<string, Map<string, FeedOffer>>();
  for (const o of offers) {
    if (!o.ean) continue;
    const stores = byEan.get(o.ean) ?? new Map<string, FeedOffer>();
    const key = o.merchantId || o.merchantName;
    const existing = stores.get(key);
    if (!existing || o.total < existing.total) stores.set(key, o);
    byEan.set(o.ean, stores);
  }

  const products: FeedProduct[] = [...byEan.entries()].map(([ean, stores]) => {
    const list = [...stores.values()].sort((a, b) => a.total - b.total);
    const first = list[0];
    return {
      ean,
      title: first.title,
      brand: list.find((o) => o.brand)?.brand ?? '',
      category: list.find((o) => o.category)?.category ?? '',
      image: list.find((o) => o.image)?.image ?? '',
      offers: list,
    };
  });

  return { products, withoutEan, report };
}

/** Merges the products of several feeds (several stores) by EAN. */
export function mergeFeedProducts(lists: FeedProduct[][]): FeedProduct[] {
  const map = new Map<string, FeedProduct>();
  for (const list of lists) {
    for (const p of list) {
      const existing = map.get(p.ean);
      if (!existing) {
        map.set(p.ean, { ...p, offers: [...p.offers] });
        continue;
      }
      const stores = new Map(existing.offers.map((o) => [o.merchantId || o.merchantName, o]));
      for (const o of p.offers) {
        const key = o.merchantId || o.merchantName;
        const cur = stores.get(key);
        if (!cur || o.total < cur.total) stores.set(key, o);
      }
      existing.offers = [...stores.values()].sort((a, b) => a.total - b.total);
      if (!existing.image) existing.image = p.image;
      if (!existing.brand) existing.brand = p.brand;
    }
  }
  return [...map.values()];
}
