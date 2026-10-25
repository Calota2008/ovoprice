import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { useLanguage } from './i18n';
import { useCountry } from './i18n/country';
import { AuthSheet, AuthMode } from './components/AuthSheet';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/screens/HomeScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { ProductOverviewScreen } from './components/screens/ProductOverviewScreen';
import { OffersComparisonScreen } from './components/screens/OffersComparisonScreen';
import { BreakdownScreen } from './components/screens/BreakdownScreen';
import { PriceHistoryScreen } from './components/screens/PriceHistoryScreen';
import { SetPriceAlertScreen } from './components/screens/SetPriceAlertScreen';
import { AlertsScreen } from './components/screens/AlertsScreen';
import { SavedScreen } from './components/screens/SavedScreen';
import { VisualMatchResultScreen } from './components/screens/VisualMatchResultScreen';
import { ProductReelsScreen, ReelsView } from './components/screens/ProductReelsScreen';
import { VisualMatcherModal } from './components/VisualMatcherModal';
import { ExternalRedirectModal } from './components/ExternalRedirectModal';

import { DemoBanner } from './components/DemoBadge';
import { parseProductLink } from './utils/retailerLinks';
import { loadJson, saveJson } from './utils/storage';
import {
  COLLECTIONS_KEY,
  Collection,
  newCollectionId,
  pruneCollections,
  toggleInCollection,
  validateCollections,
} from './utils/collections';
import { buildAlert, evaluateAlert, refreshSaved, savedFromProduct, validateAlerts, validateSaved } from './utils/alerts';
import { priceProvider } from './services/priceProvider';
import {
  ActiveScreen,
  StoreOffer,
  PriceAlertItem,
  SavedProductItem,
  RecognizedRetailerLink,
  VisualAnalysisResult,
  Product,
  PopularSearchItem,
} from './types';
import { Smartphone, Monitor } from 'lucide-react';

import { t } from './i18n';
const SAVED_STORAGE_KEY = 'ovoprice_saved_products_v1';
const ALERTS_STORAGE_KEY = 'ovoprice_alerts_v1';

const DEV_NAV =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('devnav');

export default function App() {
  // Subscribing here re-renders the whole tree when language or country changes.
  const language = useLanguage();
  useCountry();
  useEffect(() => {
    document.title = t('OvoPrice - Compare prices');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t("Search for a product, compare merchants' offers and buy from the store you choose."));
  }, [language]);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [screenHistory, setScreenHistory] = useState<ActiveScreen[]>(['home']);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVisualMatcherOpen, setIsVisualMatcherOpen] = useState(false);
  const [visualMatcherInitialTab, setVisualMatcherInitialTab] = useState<'link' | 'photo' | 'barcode'>('link');
  const [pendingLinkText, setPendingLinkText] = useState('');
  const [recognizedRetailerLink, setRecognizedRetailerLink] = useState<RecognizedRetailerLink | null>(null);
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<VisualAnalysisResult | null>(null);
  const [selectedOfferForRedirect, setSelectedOfferForRedirect] = useState<StoreOffer | null>(null);
  const [activeOffer, setActiveOffer] = useState<StoreOffer | null>(null);
  const [alerts, setAlerts] = useState<PriceAlertItem[]>(() => loadJson(ALERTS_STORAGE_KEY, validateAlerts, []));
  const [collections, setCollections] = useState<Collection[]>(() => loadJson(COLLECTIONS_KEY, validateCollections, []));
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [reelsView, setReelsView] = useState<ReelsView | undefined>(undefined);
  const [savedStorageFailed, setSavedStorageFailed] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedProductItem[]>(() => loadJson(SAVED_STORAGE_KEY, validateSaved, []));
  const [deviceFrameMode, setDeviceFrameMode] = useState<'mobile' | 'expanded'>('mobile');

  // Initial data comes ONLY from the price provider (demo today, backend later).
  useEffect(() => {
    let cancelled = false;
    priceProvider
      .getDefaultProduct()
      .then((product) => {
        if (!cancelled && product) setSelectedProduct((prev) => prev ?? product);
      })
      .catch((err) => console.error('Failed to load default product', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh prices/images of the user's alerts and saved items once at startup.
  // (A server will do this in the background later; the comparison logic is the same.)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const ids = Array.from(new Set([...alerts.map((a) => a.productId), ...savedItems.map((i) => i.productId ?? i.id)]));
    if (!ids.length) return;
    Promise.all(ids.map((id) => priceProvider.getProductById(id).catch(() => null))).then((products) => {
      const byId = new Map<string, Product>();
      products.forEach((p, i) => p && byId.set(ids[i], p));
      setAlerts((prev) => prev.map((a) => (byId.has(a.productId) ? evaluateAlert(a, byId.get(a.productId)!) : a)));
      setSavedItems((prev) =>
        prev.map((i) => {
          const p = byId.get(i.productId ?? i.id);
          return p ? refreshSaved(i, p) : i;
        })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSavedStorageFailed(!saveJson(SAVED_STORAGE_KEY, savedItems));
  }, [savedItems]);

  useEffect(() => {
    saveJson(COLLECTIONS_KEY, collections);
  }, [collections]);

  // A product that is no longer saved leaves its collections.
  useEffect(() => {
    setCollections((prev) => pruneCollections(prev, savedItems.map((i) => i.productId ?? i.id)));
  }, [savedItems]);

  useEffect(() => {
    saveJson(ALERTS_STORAGE_KEY, alerts);
  }, [alerts]);

  // Saved items show the target of their alert (if any).
  const savedView = useMemo(
    () =>
      savedItems.map((item) => {
        const alert = alerts.find((a) => a.productId === (item.productId ?? item.id));
        return alert
          ? { ...item, targetPrice: alert.targetPrice, isTargetReached: alert.status === 'TARGET_REACHED' }
          : { ...item, targetPrice: undefined, isTargetReached: false };
      }),
    [savedItems, alerts]
  );

  const handleRemoveSavedItem = (id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenVisualMatcher = (tab: 'link' | 'photo' | 'barcode' = 'link') => {
    setPendingLinkText('');
    setVisualMatcherInitialTab(tab);
    setIsVisualMatcherOpen(true);
  };

  // Link pasted from the clipboard on Home: analyze it, or open the scanner with the error shown.
  const handlePasteLink = async (text: string) => {
    const parsed = parseProductLink(text);
    if (parsed.ok === false) {
      setPendingLinkText(text);
      setVisualMatcherInitialTab('link');
      setIsVisualMatcherOpen(true);
      return;
    }
    let matchedProduct: Product | null = null;
    try {
      matchedProduct = await priceProvider.matchProductFromLink(parsed.link);
    } catch (err) {
      console.error('Link match failed', err);
    }
    setRecognizedRetailerLink({ ...parsed.link, matchedProduct });
    setVisualAnalysisResult(null);
    navigateTo('visual-result');
  };

  // Navigation handlers with backward stack
  const navigateTo = (screen: ActiveScreen) => {
    setScreenHistory((prev) => [...prev, screen]);
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const previous = nextHistory[nextHistory.length - 1];
      setScreenHistory(nextHistory);
      setActiveScreen(previous);
    } else {
      setActiveScreen('home');
    }
  };

  const handleOpenProduct = async (
    productId?: string,
    target: 'product-overview' | 'offers-comparison' | 'set-alert' = 'product-overview'
  ) => {
    try {
      const product = productId
        ? await priceProvider.getProductById(productId)
        : await priceProvider.getDefaultProduct();
      // null => ProductOverviewScreen shows its "details unavailable" state
      setSelectedProduct(product);
    } catch (err) {
      console.error('Failed to load product', err);
      setSelectedProduct(null);
    }
    setActiveOffer(null);
    navigateTo(target);
  };

  // Header title resolution
  const getHeaderTitle = (): string | undefined => {
    switch (activeScreen) {
      case 'product-overview':
      case 'offers-comparison':
      case 'breakdown':
      case 'set-alert':
      case 'visual-result':
        return t('Product Details');
      case 'price-history':
        return t('Price History');
      case 'product-reels':
        return t('Product Reels');
      case 'settings':
        return t('Account settings');
      default:
        return undefined;
    }
  };

  const showBackButton = [
    'product-overview',
    'offers-comparison',
    'breakdown',
    'price-history',
    'set-alert',
    'visual-result',
    'product-reels',
    'settings',
  ].includes(activeScreen);

  // Quick jump screens for reviewer convenience
  const screenPresets: { id: ActiveScreen; label: string; imageNumber: string }[] = [
    { id: 'alerts', label: 'Price Alerts', imageNumber: 'Image 1' },
    { id: 'product-overview', label: 'Product Details Overview', imageNumber: 'Image 3' },
    { id: 'breakdown', label: 'Landed Cost Breakdown', imageNumber: 'Image 5' },
    { id: 'home', label: 'Home / Discovery', imageNumber: 'Image 7' },
    { id: 'product-reels', label: 'Reels', imageNumber: 'Reels' },
    { id: 'set-alert', label: 'Set Price Radar', imageNumber: 'Image 9' },
    { id: 'price-history', label: 'Price History Chart', imageNumber: 'Image 11' },
    { id: 'search', label: 'Search & Variations', imageNumber: 'Image 13' },
    { id: 'offers-comparison', label: 'Offers Comparison (14)', imageNumber: 'Image 15' },
    { id: 'visual-result', label: 'Link / Foto (rezultat)', imageNumber: 'Image 17' },
    { id: 'saved', label: 'Saved Products', imageNumber: 'Image 19' },
  ];

  const handleSelectAlert = async (alert: PriceAlertItem) => {
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, isUnread: false } : a)));
    let product: Product | null = null;
    try {
      product = await priceProvider.getProductById(alert.productId);
    } catch (err) {
      console.error('Failed to load product for alert', err);
    }
    setSelectedProduct(product);
    if (product) {
      setActiveOffer(product.offers.find((o) => o.isBestPrice) ?? product.offers[0] ?? null);
      navigateTo('breakdown');
    } else {
      navigateTo('product-overview'); // shows the "details unavailable" state
    }
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // One alert per product: creating again updates the target.
  const handleConfirmAlert = (targetPrice: number) => {
    if (!selectedProduct) return;
    const newAlert = buildAlert(selectedProduct, targetPrice);
    setAlerts((prev) => [newAlert, ...prev.filter((a) => a.productId !== selectedProduct.id)]);
    navigateTo('alerts');
  };

  const isProductSaved = (productId: string) =>
    savedItems.some((i) => (i.productId ?? i.id) === productId || i.id === `save-${productId}`);

  const handleToggleSaveProduct = (product: Product) => {
    setSavedItems((prev) =>
      prev.some((i) => (i.productId ?? i.id) === product.id || i.id === `save-${product.id}`)
        ? prev.filter((i) => (i.productId ?? i.id) !== product.id && i.id !== `save-${product.id}`)
        : [savedFromProduct(product), ...prev]
    );
  };

  // Used by Reels: resolves the catalog product by id so the saved entry matches the Saved screen.
  const handleToggleSaveById = async (productId: string) => {
    try {
      const product = await priceProvider.getProductById(productId);
      if (product) handleToggleSaveProduct(product);
    } catch (err) {
      console.error('Failed to save product', err);
    }
  };

  const handleSaveToWatchlist = () => {
    if (selectedProduct && !isProductSaved(selectedProduct.id)) {
      setSavedItems((prev) => [savedFromProduct(selectedProduct), ...prev]);
    }
    navigateTo('saved');
  };

  const handleCreateAlertFromList = () => {
    // The alert needs a product: go pick one if none is selected.
    navigateTo(selectedProduct ? 'set-alert' : 'search');
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col items-center">
      {DEV_NAV && (
      <div className="w-full bg-slate-900 text-white text-xs py-2 px-3 border-b border-slate-800 z-50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">{t("OvoPrice Screen Navigator")}</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {t("(All 10 screenshot flows fully interactive)")}
            </span>
          </div>

          {/* Quick Screen Preset Jumps */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
                {t("Jump to screen:")}
              </span>
              <select
                value={activeScreen}
                onChange={(e) => {
                  const target = e.target.value as ActiveScreen;
                  if (target === 'visual-result') {
                    setRecognizedRetailerLink(null);
                  }
                  if (target === 'product-overview' && !selectedProduct) {
                    priceProvider.getDefaultProduct().then((p) => setSelectedProduct(p));
                  }
                  navigateTo(target);
                }}
                className="bg-slate-800 text-emerald-400 border border-slate-700 text-xs rounded-md px-2 py-1 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {screenPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.imageNumber}: {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Viewport frame toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-md ml-2 border border-slate-700">
              <button
                onClick={() => setDeviceFrameMode('mobile')}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                  deviceFrameMode === 'mobile'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t("Mobile Phone Viewport (Matching Screenshots)")}
              >
                <Smartphone className="w-3 h-3" />
                <span className="hidden md:inline">{t("Mobile Frame")}</span>
              </button>
              <button
                onClick={() => setDeviceFrameMode('expanded')}
                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                  deviceFrameMode === 'expanded'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t("Expanded View")}
              >
                <Monitor className="w-3 h-3" />
                <span className="hidden md:inline">{t("Expanded")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main App Container */}
      <div
        className={`w-full transition-all duration-200 flex flex-col flex-1 ${
          deviceFrameMode === 'mobile'
            ? 'max-w-[430px] my-0 sm:my-4 sm:rounded-3xl sm:border sm:border-slate-300 sm:shadow-2xl overflow-hidden bg-[#faf8ff]'
            : 'max-w-2xl px-2 my-2'
        }`}
      >
        {/* App Header */}
        <Header
          onOpenAuth={(mode) => setAuthMode(mode)}
          onOpenSettings={() => navigateTo('settings')}
          title={getHeaderTitle()}
          showBack={showBackButton}
          onBack={handleBack}
          unreadAlertsCount={alerts.filter((a) => a.isUnread).length}
          onOpenAlerts={() => navigateTo('alerts')}
        />

        <DemoBanner />

        {/* Content Viewport */}
        <main className="flex-1 px-4 pt-3 pb-4">
          {activeScreen === 'home' && (
            <HomeScreen
              onSearchFocus={() => navigateTo('search')}
              onOpenVisualMatcher={(tab) => handleOpenVisualMatcher(tab || 'link')}
              onPasteLink={handlePasteLink}
              onSelectPopularItem={(item: PopularSearchItem) => {
                if (item.productId) {
                  handleOpenProduct(item.productId);
                } else {
                  // No details for this item yet: show the "unavailable" state, not a wrong product.
                  setSelectedProduct(null);
                  navigateTo('product-overview');
                }
              }}
              onOpenReels={() => navigateTo('product-reels')}
            />
          )}

          {activeScreen === 'search' && (
            <SearchScreen
              onOpenProduct={(product) => {
                setSelectedProduct(product);
                setActiveOffer(null);
                navigateTo('product-overview');
              }}
              onOpenVisualMatcher={(tab) => handleOpenVisualMatcher(tab || 'link')}
            />
          )}

          {activeScreen === 'product-overview' && (
            <ProductOverviewScreen
              product={selectedProduct}
              onCompareOffers={() => navigateTo('offers-comparison')}
              onRescan={handleBack}
              onOpenSetAlert={() => navigateTo('set-alert')}
              onOpenHistory={() => navigateTo('price-history')}
              isSaved={selectedProduct ? isProductSaved(selectedProduct.id) : false}
              onToggleSave={() => selectedProduct && handleToggleSaveProduct(selectedProduct)}
            />
          )}

          {activeScreen === 'offers-comparison' && selectedProduct && (
            <OffersComparisonScreen
              product={selectedProduct}
              onSelectOffer={(offer) => {
                setActiveOffer(offer);
                navigateTo('breakdown');
              }}
              onRedirectStore={(offer) => setSelectedOfferForRedirect(offer)}
              onViewProductOverview={() => navigateTo('product-overview')}
            />
          )}

          {activeScreen === 'breakdown' && selectedProduct && (
            <BreakdownScreen
              product={selectedProduct}
              offer={activeOffer ?? selectedProduct.offers.find((o) => o.isBestPrice) ?? selectedProduct.offers[0]}
              onOpenHistory={() => navigateTo('price-history')}
              onRedirectStore={(offer) => setSelectedOfferForRedirect(offer)}
            />
          )}

          {activeScreen === 'price-history' && selectedProduct && (
            <PriceHistoryScreen
              product={selectedProduct}
              onSetAlertWithPrice={(price) => handleConfirmAlert(price)}
            />
          )}

          {activeScreen === 'set-alert' && selectedProduct && (
            <SetPriceAlertScreen
              product={selectedProduct}
              initialTargetPrice={alerts.find((a) => a.productId === selectedProduct.id)?.targetPrice}
              onConfirmAlert={handleConfirmAlert}
              onSaveToWatchlist={handleSaveToWatchlist}
            />
          )}

          {!selectedProduct &&
            ['offers-comparison', 'breakdown', 'price-history', 'set-alert'].includes(activeScreen) && (
              <div className="pt-10 text-center space-y-3">
                <p className="text-sm text-slate-600">{t("No product selected. Search for or scan a product to see its details.")}</p>
                <button
                  onClick={() => navigateTo('home')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {t("Back to home")}
                </button>
              </div>
            )}

          {activeScreen === 'alerts' && (
            <AlertsScreen
              alerts={alerts}
              onSelectAlert={handleSelectAlert}
              onRemoveAlert={handleRemoveAlert}
              onCreateAlert={handleCreateAlertFromList}
              onOpenAuth={() => setAuthMode('sign-in')}
            />
          )}

          {activeScreen === 'saved' && (
            <SavedScreen
              items={savedView}
              onSelectSavedItem={(item) => handleOpenProduct(item.productId ?? item.id)}
              onQuickAlert={() => navigateTo('alerts')}
              onRemoveSavedItem={handleRemoveSavedItem}
              onDiscover={() => navigateTo('product-reels')}
              onOpenAuth={() => setAuthMode('sign-in')}
              collections={collections}
              onCreateCollection={(name) =>
                setCollections((prev) => [...prev, { id: newCollectionId(), name, productIds: [] }])
              }
              onRenameCollection={(id, name) =>
                setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
              }
              onDeleteCollection={(id) => setCollections((prev) => prev.filter((c) => c.id !== id))}
              onToggleInCollection={(cid, pid) => setCollections((prev) => toggleInCollection(prev, cid, pid))}
            />
          )}

          {activeScreen === 'visual-result' && (
            <VisualMatchResultScreen
              recognizedRetailerLink={recognizedRetailerLink}
              visualAnalysisResult={visualAnalysisResult}
              onCompareOffers={() => navigateTo('offers-comparison')}
              onRescan={() => handleOpenVisualMatcher(visualAnalysisResult ? 'photo' : 'link')}
              onOpenProduct={(product) => {
                setSelectedProduct(product);
                setActiveOffer(null);
                navigateTo('offers-comparison');
              }}
              onOpenVisualMatcher={(tab) => handleOpenVisualMatcher(tab || 'link')}
            />
          )}

          {activeScreen === 'product-reels' && (
            <ProductReelsScreen
              onBack={handleBack}
              onOpenProduct={(productId) => handleOpenProduct(productId)}
              onCompareOffers={(productId) => handleOpenProduct(productId, 'offers-comparison')}
              onBuyOffer={(offer) => setSelectedOfferForRedirect(offer)}
              onSetAlert={(productId) => handleOpenProduct(productId, 'set-alert')}
              alertProductIds={alerts.map((a) => a.productId)}
              savedProductIds={savedItems.map((item) => item.productId || item.id)}
              onToggleSave={handleToggleSaveById}
              saveError={savedStorageFailed}
              initialView={reelsView}
              onViewChange={setReelsView}
            />
          )}
          {activeScreen === 'settings' && <SettingsScreen onOpenAuth={(mode) => setAuthMode(mode)} />}
        </main>

        {authMode && <AuthSheet mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} />}

        {/* Global Bottom Navigation (Visible on primary tabs and can be accessed anywhere) */}
        {!['breakdown'].includes(activeScreen) && (
          <BottomNav
            activeScreen={activeScreen}
            onNavigate={(screen) => navigateTo(screen)}
            unreadAlertsCount={alerts.filter((a) => a.isUnread).length}
          />
        )}
      </div>

      {/* Visual Matcher Scanner Modal */}
      <VisualMatcherModal
        isOpen={isVisualMatcherOpen}
        initialTab={visualMatcherInitialTab}
        initialUrl={pendingLinkText}
        onClose={() => setIsVisualMatcherOpen(false)}
        onPhotoAnalysisComplete={(result) => {
          setVisualAnalysisResult(result);
          setRecognizedRetailerLink(null);
          setIsVisualMatcherOpen(false);
          navigateTo('visual-result');
        }}
        onRecognizedLink={(recognized) => {
          setRecognizedRetailerLink(recognized);
          setVisualAnalysisResult(null);
          setIsVisualMatcherOpen(false);
          navigateTo('visual-result');
        }}
        onBarcodeProduct={(product) => {
          setSelectedProduct(product);
          setActiveOffer(null);
          setRecognizedRetailerLink(null);
          setVisualAnalysisResult(null);
          setIsVisualMatcherOpen(false);
          navigateTo('product-overview');
        }}
      />

      {/* External Merchant Redirect Handover Modal */}
      <ExternalRedirectModal
        offer={selectedOfferForRedirect}
        onClose={() => setSelectedOfferForRedirect(null)}
      />
    </div>
  );
}
