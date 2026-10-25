import { PriceAlertItem, Product, SavedProductItem } from '../types';

const STATUSES = ['WATCHING', 'PRICE_DROPPED', 'TARGET_REACHED'];
const fmt = (n: number) => n.toFixed(2).replace('.', ',');
const round2 = (n: number) => Math.round(n * 100) / 100;

function bestOfferOf(product: Product) {
  return product.offers.find((o) => o.isBestPrice) ?? product.offers[0];
}

/** Alertă nouă, creată de utilizator, pornind de la prețul curent al produsului. */
export function buildAlert(product: Product, targetPrice: number, now: Date = new Date()): PriceAlertItem {
  const best = bestOfferOf(product);
  const alert: PriceAlertItem = {
    id: `alert-${product.id}`,
    productId: product.id,
    title: product.title,
    storeName: (best?.storeName ?? '').toUpperCase(),
    ean: product.ean,
    image: product.image,
    targetPrice,
    currentPrice: product.bestPrice,
    previousPrice: product.bestPrice, // price at creation
    dropAmount: 0,
    status: 'WATCHING',
    createdAt: now.toISOString(),
    timestamp: `Created ${now.toLocaleDateString('en-GB')}`,
    shippingNote: best?.shippingText ?? '',
    isUnread: false,
  };
  return evaluateAlert(alert, product, true);
}

/**
 * Compară prețul curent din catalog cu ținta. Rulează local, la deschiderea
 * aplicației. Un server va face aceeași comparație periodic, în fundal.
 */
export function evaluateAlert(alert: PriceAlertItem, product: Product, isNew = false): PriceAlertItem {
  const best = bestOfferOf(product);
  const current = product.bestPrice;
  const drop = round2(Math.max(0, alert.previousPrice - current));
  const reached = current <= alert.targetPrice;
  const status: PriceAlertItem['status'] = reached ? 'TARGET_REACHED' : drop > 0.005 ? 'PRICE_DROPPED' : 'WATCHING';
  const becameReached = status === 'TARGET_REACHED' && alert.status !== 'TARGET_REACHED';

  return {
    ...alert,
    title: product.title,
    image: product.image,
    ean: product.ean,
    storeName: (best?.storeName ?? alert.storeName).toUpperCase(),
    shippingNote: best?.shippingText ?? alert.shippingNote,
    currentPrice: current,
    dropAmount: drop,
    dropPercent: alert.previousPrice > 0 && drop > 0 ? Math.round((drop / alert.previousPrice) * 100) : undefined,
    status,
    isUnread: isNew ? false : becameReached ? true : alert.isUnread,
    matchDetails: reached
      ? `Your target of ${fmt(alert.targetPrice)} € has been reached (current price ${fmt(current)} €).`
      : `Tracking until ${fmt(alert.targetPrice)} € or less. Current price: ${fmt(current)} €.`,
  };
}

export function validateAlerts(value: unknown): PriceAlertItem[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (a): a is PriceAlertItem =>
      a &&
      typeof a.id === 'string' &&
      typeof a.productId === 'string' &&
      typeof a.title === 'string' &&
      typeof a.targetPrice === 'number' &&
      typeof a.currentPrice === 'number' &&
      typeof a.previousPrice === 'number' &&
      STATUSES.includes(a.status)
  );
}

/** Element salvat, creat din produs; scăderea se măsoară față de `savedPrice`. */
export function savedFromProduct(product: Product): SavedProductItem {
  const best = bestOfferOf(product);
  return {
    id: `save-${product.id}`,
    productId: product.id,
    title: product.title,
    storeName: best?.storeName ?? '',
    image: product.image,
    currentPrice: product.bestPrice,
    savedPrice: product.bestPrice,
    deliveryNote: best?.shippingText,
  };
}

/** Actualizează un element salvat cu prețul/imaginea curente din catalog. */
export function refreshSaved(item: SavedProductItem, product: Product): SavedProductItem {
  const saved = item.savedPrice ?? product.bestPrice;
  const drop = round2(Math.max(0, saved - product.bestPrice));
  return {
    ...item,
    title: product.title,
    image: product.image,
    storeName: bestOfferOf(product)?.storeName ?? item.storeName,
    currentPrice: product.bestPrice,
    savedPrice: saved,
    previousPrice: drop > 0 ? saved : undefined,
    dropAmount: drop > 0 ? drop : undefined,
    dropPercent: drop > 0 && saved > 0 ? Math.round((drop / saved) * 100) : undefined,
  };
}

export function validateSaved(value: unknown): SavedProductItem[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (i): i is SavedProductItem =>
      i && typeof i.id === 'string' && typeof i.title === 'string' && typeof i.currentPrice === 'number'
  );
}
