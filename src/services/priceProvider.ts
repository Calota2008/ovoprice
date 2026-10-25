/**
 * PUNCTUL UNIC DE DATE PENTRU PREȚURI
 *
 * Toate ecranele cer produse, oferte, căutări populare etc. DOAR prin acest
 * fișier, niciodată direct din `data/mockData.ts`.
 *
 * Azi: `demoProvider` (date demonstrative, marcate vizibil ca "DEMO").
 * Mai târziu: `liveProvider` care apelează backend-ul. Se schimbă o singură
 * linie (`export const priceProvider = ...`) și ecranele rămân neatinse.
 */
import {
  Product,
  StoreOffer,
  PopularSearchItem,
  RelatedModelItem,
  ReelItem,
  RecognizedRetailerLink,
} from '../types';
import * as demo from '../data/mockData';
import { normalizeGtin } from '../utils/ean';
import { searchCatalog, matchBySlug } from '../utils/search';

import { tr } from '../i18n';
export interface PriceProvider {
  readonly id: 'demo' | 'live';
  /** true => toate datele sunt demonstrative și UI-ul trebuie să o spună. */
  readonly isDemo: boolean;

  /** Produsul afișat implicit în ecranele de detaliu (doar demo; live întoarce null). */
  getDefaultProduct(): Promise<Product | null>;
  getProductById(id: string): Promise<Product | null>;
  /** Pasul 3 (cod de bare): căutare după EAN/GTIN. */
  getProductByEan(ean: string): Promise<Product | null>;
  /** Pasul 4 (căutare textuală). */
  searchProducts(query: string): Promise<Product[]>;
  getPopularSearches(): Promise<PopularSearchItem[]>;
  getRelatedModels(productId: string): Promise<RelatedModelItem[]>;
  getReels(): Promise<ReelItem[]>;
  /** Pasul 5: încearcă să potrivească un link de magazin cu un produs din catalog. */
  matchProductFromLink(link: RecognizedRetailerLink): Promise<Product | null>;
}

/* ------------------------------------------------------------------ */
/* Implementarea demo                                                  */
/* ------------------------------------------------------------------ */

const NOT_AVAILABLE = tr('Check with the merchant');

/** URL-uri de căutare reale la magazine (în loc de linkuri de produs inventate). */
function storeSearchUrl(storeDomain: string, query: string): string {
  const q = encodeURIComponent(query);
  const d = storeDomain.toLowerCase();
  if (d.includes('amazon')) return `https://www.amazon.de/s?k=${q}`;
  if (d.includes('mediamarkt')) return `https://www.mediamarkt.de/de/search.html?query=${q}`;
  if (d.includes('otto')) return `https://www.otto.de/suche/${q}/`;
  if (d.includes('ebay')) return `https://www.ebay.de/sch/i.html?_nkw=${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${storeDomain}`)}`;
}

/**
 * Elimină din datele demo afirmațiile inventate (rating-uri, garanții de
 * livrare, politici de retur, linkuri de produs). Prețurile numerice rămân,
 * dar sunt marcate ca demo în interfață.
 */
function sanitizeOffer(offer: StoreOffer, productTitle: string): StoreOffer {
  return {
    ...offer,
    storeRating: undefined,
    reviewCount: undefined,
    badge: undefined,
    deliveryEstimate: NOT_AVAILABLE,
    deliveryGuarantee: undefined,
    stockStatus: NOT_AVAILABLE,
    sellerName: offer.storeName,
    returnPolicy: NOT_AVAILABLE,
    warranty: NOT_AVAILABLE,
    affiliateUrl: storeSearchUrl(offer.storeDomain, productTitle),
  };
}

function sanitizeProduct(product: Product): Product {
  // Offers live in a separate map in mockData; attach them here so every product is complete.
  const offers = demo.getDemoOffersByProductId(product.id).map((o) => sanitizeOffer(o, product.title));
  return {
    ...product,
    lowestPriceInDays: undefined,
    verifiedMatch: false,
    offers,
    storesCount: offers.length, // no invented store counts
  };
}

const POPULAR_TO_PRODUCT: Record<string, string> = {
  'pop-1': 'sony-wh1000xm5',
  'pop-2': 'samsung-crystal-tv',
  'pop-3': 'delonghi-magnifica',
};

const DEFAULT_PRODUCT_ID = 'dyson-v15-detect';

function demoCatalog(): Product[] {
  return Object.values(demo.demoProductsCatalog).map(sanitizeProduct);
}

const wait = <T,>(value: T): Promise<T> => Promise.resolve(value);

export const demoProvider: PriceProvider = {
  id: 'demo',
  isDemo: true,

  getDefaultProduct: () => wait(demoCatalog().find((p) => p.id === DEFAULT_PRODUCT_ID) ?? null),

  getProductById: (id) => wait(demoCatalog().find((p) => p.id === id) ?? null),

  getProductByEan: (ean) => {
    const clean = normalizeGtin(ean);
    return wait(demoCatalog().find((p) => normalizeGtin(p.ean) === clean) ?? null);
  },

  searchProducts: (query) => {
    if (!query.trim()) return wait([]);
    return wait(searchCatalog(demoCatalog(), query));
  },

  getPopularSearches: () =>
    wait(demo.popularSearches.map((p) => ({ ...p, productId: POPULAR_TO_PRODUCT[p.id] }))),

  getRelatedModels: () => wait(demo.relatedModels),

  getReels: () => wait(demo.demoReels),

  matchProductFromLink: (link) =>
    wait(link.slugGuess ? matchBySlug(demoCatalog(), link.slugGuess) : null),

};

/* ------------------------------------------------------------------ */
/* Provider activ. Pentru backend: înlocuiește cu liveProvider.        */
/* ------------------------------------------------------------------ */
export const priceProvider: PriceProvider = demoProvider;
