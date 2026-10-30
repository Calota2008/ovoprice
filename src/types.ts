export interface Product {
  id: string;
  title: string;
  category: string;
  subtitle: string;
  brand: string;
  model: string;
  colorVariant: string;
  ean: string;
  image: string;
  originalSource: string;
  msrp?: number;
  bestPrice: number;
  originalPrice?: number;
  savingsPercent?: number;
  savingsAmount?: number;
  storesCount: number;
  lowestPriceInDays?: number;
  verifiedMatch: boolean;
  offers: StoreOffer[];
  history: PriceHistoryPoint[];
}

export interface StoreOffer {
  id: string;
  storeName: string;
  storeDomain: string;
  storeRating?: number;
  reviewCount?: string;
  badge?: string;
  isBestPrice?: boolean;
  basePrice: number;
  shippingPrice: number;
  shippingText: string;
  totalLandedPrice: number;
  priceDeltaVsBest?: number;
  deliveryEstimate: string;
  deliveryGuarantee?: string;
  stockStatus: string;
  sellerName: string;
  returnPolicy: string;
  warranty: string;
  affiliateUrl: string;
  /** True only when the link is a confirmed affiliate link. Never set for demo data. */
  isAffiliate?: boolean;
  /** Official store logo from the data source (affiliate network), used only with the store's permission. */
  storeLogo?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  movingAverage: number;
  isLowest?: boolean;
}

export interface PriceAlertItem {
  id: string;
  productId: string;
  title: string;
  storeName: string;
  ean: string;
  image: string;
  targetPrice: number;
  currentPrice: number;
  previousPrice: number;
  dropAmount: number;
  dropPercent?: number;
  /** WATCHING = urmărit, încă nu a scăzut; PRICE_DROPPED = a scăzut, dar nu a atins ținta. */
  status: 'WATCHING' | 'PRICE_DROPPED' | 'TARGET_REACHED';
  /** Data creării (ISO). */
  createdAt?: string;
  timestamp: string;
  shippingNote: string;
  isUnread: boolean;
  matchDetails?: string;
}

export interface SavedProductItem {
  id: string;
  productId: string;
  title: string;
  storeName: string;
  image: string;
  currentPrice: number;
  previousPrice?: number;
  targetPrice?: number;
  dropAmount?: number;
  dropPercent?: number;
  statusText?: string;
  isTargetReached?: boolean;
  statusBadge?: string;
  deliveryNote?: string;
  /** Prețul la momentul salvării; scăderea se calculează față de el. */
  savedPrice?: number;
}

export type ActiveScreen =
  | 'home'
  | 'search'
  | 'saved'
  | 'alerts'
  | 'product-overview'
  | 'offers-comparison'
  | 'breakdown'
  | 'price-history'
  | 'set-alert'
  | 'visual-result'
  | 'product-reels'
  | 'settings'
  | 'legal'
  | 'shared-list'
  | 'see-all';

export interface RecognizedRetailerLink {
  retailerName: string;
  retailerKey: 'mediamarkt' | 'otto' | 'amazon' | 'ebay';
  submittedUrl: string;
  articleId: string | null;
  /** Eticheta ID-ului (ID articol, ASIN, număr articol). */
  idLabel?: string;
  hostname: string;
  /** Numele produsului citit din adresă, ex. "dyson v15 detect absolute". */
  slugGuess?: string;
  /** Produs din catalog potrivit după nume (necesită verificare de către utilizator). */
  matchedProduct?: Product | null;
}

export interface VisualAnalysisResult {
  objectName: string;
  category: string;
  description: string;
  observableCharacteristics: string[];
  retailerSearchQuery: string;
  alternatives: string[];
  imagePreviewUrl?: string;
  timestamp?: string;
}

export interface PopularSearchItem {
  id: string;
  category: string;
  storesCount: number;
  title: string;
  price: number;
  badgeText: string;
  badgeType: string;
  shippingNote: string;
  image: string;
  /** Id-ul produsului din catalog, dacă există detalii pentru el. */
  productId?: string;
}

export interface RelatedModelItem {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  price: number;
  shippingNote: string;
  image: string;
  offersCount: number;
}

export interface ReelSpec {
  label: string;
  value: string;
}

export interface ReelItem {
  /** Stable key for the feed. */
  id: string;
  /** Catalog product this reel is about. Prices/offers always come from the product, never from the reel. */
  productId?: string;
  title: string;
  subtitle: string;
  category: string;
  /** Poster / still image. Optional for video-only reels. */
  image?: string;
  /** Optional vertical video. Without it the reel shows the image. */
  videoUrl?: string;
  creatorLabel: string;
  /** Key specs entered by the creator (shown as chips). */
  specs?: ReelSpec[];
  /** Merchant link entered by the creator (https only). Used for Buy only when there is no catalog product. */
  buyUrl?: string;
  /** Creator states that buyUrl is an affiliate link. */
  isAffiliate?: boolean;
  /** Reel created on this device, stored locally only. */
  isLocal?: boolean;
}
