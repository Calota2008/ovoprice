// Awin feed reader: CSV parsing, price formats, filters, EAN grouping, one offer per store, merging feeds.
// Run: npx tsx tests/unit_awin_feed.ts   (test data below is invented, it is not a real feed)
import { mergeFeedProducts, parseCsv, parsePrice, readAwinFeed } from '../src/feeds/awinFeed';

let fails = 0;
const check = (name: string, ok: boolean) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) fails++;
};

check('csv: quotes, "" and commas/new lines inside quotes', JSON.stringify(parseCsv('a,b\n"x, ""y""","line1\nline2"\n')) === JSON.stringify([['a', 'b'], ['x, "y"', 'line1\nline2']]));
check('csv: BOM and CRLF', JSON.stringify(parseCsv('﻿a,b\r\n1,2\r\n')) === JSON.stringify([['a', 'b'], ['1', '2']]));
check('price: 1299.00', parsePrice('1299.00') === 1299);
check('price: German 1.299,90', parsePrice('1.299,90') === 1299.9);
check('price: 1,299.90', parsePrice('1,299.90') === 1299.9);
check('price: "12,5 EUR"', parsePrice('12,5 EUR') === 12.5);
check('price: empty/garbage -> null', parsePrice('') === null && parsePrice('n/a') === null);

const H = 'aw_deep_link,product_name,merchant_product_id,merchant_image_url,merchant_name,merchant_id,category_name,search_price,currency,delivery_cost,ean,brand_name,in_stock,rrp_price';
const row = (o: Record<string, string>) =>
  H.split(',').map((k) => {
    const v = o[k] ?? '';
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(',');
const base = { aw_deep_link: 'https://www.awin1.com/pclick.php?p=1', product_name: 'Sony WH-1000XM5', merchant_product_id: 'A1', merchant_image_url: 'https://img.example/a.jpg', merchant_name: 'Shop A', merchant_id: '111', category_name: 'Kopfhörer', search_price: '289.00', currency: 'EUR', delivery_cost: '0', ean: '4548736132580', brand_name: 'Sony', in_stock: '1', rrp_price: '419.00' };
const csvA = [
  H,
  row(base),
  row({ ...base, merchant_product_id: 'A1b', search_price: '299.00' }),                      // same store, dearer duplicate -> dropped
  row({ ...base, merchant_product_id: 'A2', ean: '4006381333931', product_name: 'Stift, blau "fein"', search_price: '1,99', delivery_cost: '' }), // German price, unknown shipping
  row({ ...base, merchant_product_id: 'A3', currency: 'CHF' }),                               // other currency
  row({ ...base, merchant_product_id: 'A4', search_price: '0' }),                              // no price
  row({ ...base, merchant_product_id: 'A5', in_stock: '0' }),                                  // out of stock
  row({ ...base, merchant_product_id: 'A6', aw_deep_link: 'javascript:alert(1)' }),            // unsafe link
  row({ ...base, merchant_product_id: 'A7', ean: '1234567890123', product_name: 'No valid EAN' }), // bad checksum
].join('\n');

const a = readAwinFeed(csvA);
check(`report: 8 rows, 4 offers kept (${a.report.rows}/${a.report.offers})`, a.report.rows === 8 && a.report.offers === 4);
check('skipped: currency 1, price 1, stock 1, url 1', a.report.skipped.currency === 1 && a.report.skipped.price === 1 && a.report.skipped.stock === 1 && a.report.skipped.url === 1);
check('rows without a valid EAN kept apart, never matched by title', a.report.withoutEan === 1 && a.withoutEan[0].title === 'No valid EAN');
const sony = a.products.find((p) => p.ean === '4548736132580')!;
check('one offer per store: the cheaper duplicate wins (289,00)', sony.offers.length === 1 && sony.offers[0].price === 289);
check('free delivery -> total = price', sony.offers[0].shipping === 0 && sony.offers[0].total === 289);
check('RRP kept only as information', sony.offers[0].rrp === 419);
const pen = a.products.find((p) => p.ean === '4006381333931')!;
check('quoted title with comma and quotes read correctly', pen.title === 'Stift, blau "fein"');
check('German price 1,99 and unknown delivery stays unknown (not free)', pen.offers[0].price === 1.99 && pen.offers[0].shipping === null && pen.offers[0].total === 1.99);

const csvB = [H, row({ ...base, merchant_name: 'Shop B', merchant_id: '222', merchant_product_id: 'B1', search_price: '279.00', delivery_cost: '4.99' }), row({ ...base, merchant_name: 'Shop B', merchant_id: '222', merchant_product_id: 'B2', ean: '04548736132580' }) /* same product written as GTIN-14 */].join('\n');
const b = readAwinFeed(csvB);
const merged = mergeFeedProducts([a.products, b.products]);
const m = merged.find((p) => p.ean === '4548736132580')!;
check('GTIN-14 with leading 0 is the same product as the EAN-13', b.products.length === 1);
check('merge: two stores for the same EAN, cheapest total first (283,99 vs 289,00)', m.offers.length === 2 && m.offers[0].merchantName === 'Shop B' && m.offers[0].total === 283.99 && m.offers[1].total === 289);
check('empty feed -> nothing, no crash', readAwinFeed('').products.length === 0 && readAwinFeed(H).report.rows === 0);

console.log(fails ? `\nFAILED: ${fails}` : '\nALL PASS');
process.exit(fails ? 1 : 0);
