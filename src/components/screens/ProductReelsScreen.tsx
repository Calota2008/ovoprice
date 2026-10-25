import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { ReelItem, StoreOffer } from '../../types';
import { DemoBadge } from '../DemoBadge';
import { AddReelModal } from '../AddReelModal';
import { ReelCompareSheet } from '../ReelCompareSheet';
import { useUserReels } from '../../services/useUserReels';
import { isSafeHttpUrl } from '../../utils/url';
import { trackEvent } from '../../utils/analytics';
import {
  ArrowLeft,
  Bookmark,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Store,
  Check,
  Layers,
  Play,
  VideoOff,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';

type ReelFilter = 'for-you' | 'categories' | 'saved';

/** Where the user is in the feed, so returning from Compare/Details restores the same reel. */
export interface ReelsView {
  filter: ReelFilter;
  category: string | null;
  reelId: string | null;
}

interface ProductReelsScreenProps {
  onBack: () => void;
  onOpenProduct: (productId: string) => void;
  onCompareOffers: (productId: string) => void;
  /** Opens the merchant hand-over for a catalog offer. */
  onBuyOffer: (offer: StoreOffer) => void;
  savedProductIds: string[];
  /** Toggles the saved state of the product. Persistence is handled by the app. */
  onToggleSave: (productId: string) => void;
  /** True when the browser refused to store the saved list (private mode, full storage). */
  saveError?: boolean;
  initialView?: ReelsView;
  onViewChange?: (view: ReelsView) => void;
}

const SWIPE_THRESHOLD_PX = 50;
const AFFILIATE_NOTE =
  'Some links may be affiliate links. OvoPrice may earn a commission from qualifying purchases at no additional cost to you.';

const FILTERS: { id: ReelFilter; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'categories', label: 'Categories' },
  { id: 'saved', label: 'Saved Products' },
];

export const ProductReelsScreen: React.FC<ProductReelsScreenProps> = ({
  onBack,
  onOpenProduct,
  onCompareOffers,
  onBuyOffer,
  savedProductIds = [],
  onToggleSave,
  saveError = false,
  initialView,
  onViewChange,
}) => {
  const [filter, setFilter] = useState<ReelFilter>(initialView?.filter ?? 'for-you');
  const [category, setCategory] = useState<string | null>(initialView?.category ?? null);
  const pendingReelId = useRef<string | null>(initialView?.reelId ?? null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [videoStatus, setVideoStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showAddReel, setShowAddReel] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const { data: catalogReels, loading: catalogLoading, error: reelsError } = usePriceData<ReelItem[]>(
    () => priceProvider.getReels(),
    [],
    []
  );
  const userReels = useUserReels();
  const reelsLoading = catalogLoading || userReels.loading;
  // Reels made on this device come first.
  const allReels = useMemo(() => [...userReels.reels, ...catalogReels], [userReels.reels, catalogReels]);

  const categories = useMemo(() => Array.from(new Set(allReels.map((r) => r.category))), [allReels]);

  const isSaved = useCallback(
    (productId?: string) => !!productId && savedProductIds.includes(productId),
    [savedProductIds]
  );

  const visibleReels = useMemo(() => {
    if (filter === 'saved') return allReels.filter((r) => isSaved(r.productId));
    if (filter === 'categories' && category) return allReels.filter((r) => r.category === category);
    return allReels;
  }, [allReels, filter, category, isSaved]);

  const currentReel: ReelItem | undefined = visibleReels[currentIndex];
  const currentProductId = currentReel?.productId;

  const {
    data: product,
    loading: productLoading,
    error: productError,
  } = usePriceData(
    () => (currentProductId ? priceProvider.getProductById(currentProductId) : Promise.resolve(null)),
    [currentProductId],
    null
  );

  const hasOffers = !!product && product.offers.length > 0;
  const isCurrentSaved = currentReel ? isSaved(currentReel.productId) : false;
  const isMatched = !!currentReel?.productId;
  const hasAffiliateLinks =
    (!!product && product.offers.some((o) => o.isAffiliate === true)) ||
    (!isMatched && currentReel?.isAffiliate === true && isSafeHttpUrl(currentReel?.buyUrl));

  // Buy: best catalog offer with a valid link, otherwise the creator's own https link.
  const bestOffer: StoreOffer | null = useMemo(() => {
    if (!product) return null;
    const valid = product.offers.filter((o) => isSafeHttpUrl(o.affiliateUrl));
    if (valid.length === 0) return null;
    return valid.reduce((best, o) => (o.totalLandedPrice < best.totalLandedPrice ? o : best));
  }, [product]);
  const creatorBuyUrl = !isMatched && isSafeHttpUrl(currentReel?.buyUrl) ? currentReel?.buyUrl : undefined;
  const creatorBuyHost = creatorBuyUrl ? new URL(creatorBuyUrl).hostname.replace(/^www\./, '') : '';
  const canBuy = isMatched ? !!bestOffer : !!creatorBuyUrl;

  // Specs: the creator's own, or basic catalog facts for catalog reels.
  const specChips = useMemo(() => {
    if (currentReel?.specs && currentReel.specs.length > 0) return currentReel.specs;
    if (!product) return [];
    return [
      { label: 'Brand', value: product.brand },
      { label: 'Model', value: product.model },
      { label: 'Color', value: product.colorVariant },
    ].filter((c) => c.value && c.value.trim());
  }, [currentReel?.specs, product]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2400);
  };

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    []
  );

  // Restore the previous position once the list is available.
  useEffect(() => {
    if (!pendingReelId.current || visibleReels.length === 0 || userReels.loading) return;
    const idx = visibleReels.findIndex((r) => r.id === pendingReelId.current);
    pendingReelId.current = null;
    if (idx > 0) setCurrentIndex(idx);
  }, [visibleReels, userReels.loading]);

  useEffect(() => {
    if (pendingReelId.current) return;
    onViewChange?.({ filter, category, reelId: currentReel?.id ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, category, currentReel?.id]);

  // Keep the index valid when the list changes (filter switch, un-saving in the saved tab).
  useEffect(() => {
    if (currentIndex > 0 && currentIndex >= visibleReels.length) setCurrentIndex(0);
  }, [visibleReels.length, currentIndex]);

  // New reel: reset playback state and record the view.
  useEffect(() => {
    setIsPaused(false);
    setVideoStatus('loading');
    setConfirmDelete(false);
    setShowCompare(false);
    if (currentReel?.productId) trackEvent('reel_viewed', { productId: currentReel.productId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReel?.id]);

  const goNext = useCallback(() => {
    if (visibleReels.length > 1) setCurrentIndex((i) => (i + 1) % visibleReels.length);
  }, [visibleReels.length]);

  const goPrev = useCallback(() => {
    if (visibleReels.length > 1) setCurrentIndex((i) => (i - 1 + visibleReels.length) % visibleReels.length);
  }, [visibleReels.length]);

  // Desktop: arrow keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (showAddReel || showCompare) return;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, showAddReel, showCompare]);

  const changeFilter = (next: ReelFilter) => {
    setFilter(next);
    if (next !== 'categories') setCategory(null);
    setCurrentIndex(0);
  };

  const changeCategory = (next: string | null) => {
    setCategory(next);
    setCurrentIndex(0);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || videoStatus !== 'ready') return;
    if (video.paused) {
      video.play().then(() => setIsPaused(false)).catch(() => setVideoStatus('error'));
    } else {
      video.pause();
      setIsPaused(true);
    }
  };

  const handleToggleSave = () => {
    if (!currentReel?.productId) return;
    onToggleSave(currentReel.productId);
    trackEvent(isCurrentSaved ? 'product_unsaved' : 'product_saved', { productId: currentReel.productId });
    showToast(isCurrentSaved ? 'Removed from Saved' : 'Saved');
  };

  const handleDetails = () => {
    if (!currentReel?.productId) return;
    trackEvent('product_details_opened', { productId: currentReel.productId });
    onOpenProduct(currentReel.productId);
  };

  const handleCompare = () => {
    if (!currentReel?.productId || !hasOffers) return;
    trackEvent('compare_prices_clicked', { productId: currentReel.productId });
    setShowCompare(true);
  };

  const handleSeeAllOffers = () => {
    if (!currentReel?.productId) return;
    setShowCompare(false);
    onCompareOffers(currentReel.productId);
  };

  const handleBuy = () => {
    if (bestOffer) onBuyOffer(bestOffer);
  };

  const handleCreatorBuyClick = () => {
    trackEvent('offer_opened', { productId: currentReel?.productId, storeDomain: creatorBuyHost });
  };

  const handleDeleteLocal = async () => {
    if (!currentReel?.isLocal) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await userReels.remove(currentReel.id);
    setConfirmDelete(false);
    showToast('Reel deleted');
  };

  const handleAddReel = async (...args: Parameters<typeof userReels.add>) => {
    const result = await userReels.add(...args);
    if (result.ok) {
      setShowAddReel(false);
      setFilter('for-you');
      setCategory(null);
      setCurrentIndex(0);
      showToast('Reel added on this device');
    }
    return result;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    const end = e.changedTouches[0]?.clientY;
    if (start === null || end === undefined) return;
    const delta = start - end;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  /* ------------------------------ Header ------------------------------ */

  const header = (
    <div className="relative z-30 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 border border-slate-700/60 backdrop-blur-md transition-all cursor-pointer text-xs font-semibold"
        aria-label="Back to OvoPrice"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/30 px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-bold tracking-wider text-cyan-400">REELS</span>
        <DemoBadge />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowAddReel(true)}
          className="w-8 h-8 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/50 flex items-center justify-center text-cyan-300 transition-colors backdrop-blur-md cursor-pointer"
          aria-label="Add Reel"
          title="Add Reel"
        >
          <Plus className="w-4 h-4" />
        </button>
        {currentReel?.videoUrl && videoStatus !== 'error' && (
          <button
            onClick={() => {
              setIsMuted((m) => !m);
              showToast(isMuted ? 'Sound on' : 'Sound off');
            }}
            className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-colors backdrop-blur-md cursor-pointer"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        )}
      </div>
    </div>
  );

  const filterBar = (
    <div className="relative z-30 px-3.5 pb-2 space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Reel filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => changeFilter(f.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
              filter === f.id
                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-cyan-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filter === 'categories' && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" aria-label="Categories">
          <button
            onClick={() => changeCategory(null)}
            className={`shrink-0 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border cursor-pointer ${
              category === null
                ? 'bg-slate-200 text-slate-900 border-slate-100'
                : 'bg-slate-900/80 text-slate-400 border-slate-700'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => changeCategory(c)}
              className={`shrink-0 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border cursor-pointer ${
                category === c
                  ? 'bg-slate-200 text-slate-900 border-slate-100'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const shell = (children: React.ReactNode) => (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#070b12] text-slate-100 flex flex-col min-h-[580px] sm:min-h-[640px] shadow-2xl border border-slate-800 select-none">
      {header}
      {filterBar}
      {children}
      {showCompare && product && hasOffers && (
        <ReelCompareSheet
          product={product}
          onClose={() => setShowCompare(false)}
          onBuy={onBuyOffer}
          onSeeAll={handleSeeAllOffers}
        />
      )}
      {showAddReel && <AddReelModal onClose={() => setShowAddReel(false)} onSubmit={handleAddReel} />}
      {toastMessage && (
        <div
          role="status"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );

  /* --------------------------- Empty / error --------------------------- */

  if (reelsLoading) {
    return shell(
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400" role="status">
        Loading reels…
      </div>
    );
  }

  if (reelsError) {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-300" role="alert">
        <AlertTriangle className="w-6 h-6 text-amber-400" />
        <p>Reels could not be loaded. Please try again later.</p>
      </div>
    );
  }

  if (allReels.length === 0) {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-300">
        <VideoOff className="w-6 h-6 text-slate-500" />
        <p>No reels available yet.</p>
      </div>
    );
  }

  if (!currentReel) {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-300">
        <Bookmark className="w-6 h-6 text-slate-500" />
        <p>{filter === 'saved' ? "You haven't saved any products from Reels yet." : 'No reels in this category.'}</p>
        <button
          onClick={() => changeFilter('for-you')}
          className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
        >
          Back to For You
        </button>
      </div>
    );
  }

  /* ------------------------------- Reel ------------------------------- */

  const showVideo = !!currentReel.videoUrl && videoStatus !== 'error';

  return shell(
    <>
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden bg-radial from-slate-900 via-[#070b12] to-black min-h-[400px] sm:min-h-[460px] touch-pan-x"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none -top-10 -right-10" />

        {/* Media: only the current reel is mounted, so only one video can play. */}
        <div className="relative w-full h-full max-h-[480px] flex items-center justify-center p-4">
          {showVideo ? (
            <video
              key={currentReel.id}
              ref={videoRef}
              src={currentReel.videoUrl}
              poster={currentReel.image}
              className="max-h-[400px] max-w-[85%] rounded-xl object-contain"
              autoPlay
              loop
              playsInline
              muted={isMuted}
              onLoadedData={() => setVideoStatus('ready')}
              onPlaying={() => setIsPaused(false)}
              onError={() => setVideoStatus('error')}
              onClick={togglePlayback}
            />
          ) : currentReel.image ? (
            <img
              src={currentReel.image}
              alt={currentReel.title}
              className="max-h-[340px] sm:max-h-[380px] max-w-[85%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
              <VideoOff className="w-8 h-8" />
              <span>Preview not available</span>
            </div>
          )}

          {showVideo && videoStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 pointer-events-none" role="status">
              Loading video…
            </div>
          )}
          {showVideo && isPaused && videoStatus === 'ready' && (
            <button
              onClick={togglePlayback}
              className="absolute w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center cursor-pointer"
              aria-label="Play"
            >
              <Play className="w-6 h-6 text-white fill-current" />
            </button>
          )}

          <div className="absolute top-2 left-4 flex flex-wrap gap-1.5 text-[10px] font-semibold">
            {!currentReel.videoUrl && !currentReel.isLocal && (
              <span className="bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md text-slate-300 flex items-center gap-1">
                <VideoOff className="w-3 h-3" /> Demo preview · no video yet
              </span>
            )}
            {currentReel.videoUrl && videoStatus === 'error' && (
              <span className="bg-amber-950/80 border border-amber-700 px-2 py-1 rounded-md text-amber-200 flex items-center gap-1" role="alert">
                <AlertTriangle className="w-3 h-3" /> Video unavailable
              </span>
            )}
            <span className="bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md text-slate-400 font-mono">
              {currentReel.creatorLabel}
            </span>
          </div>

          {currentReel.isLocal && (
            <button
              onClick={handleDeleteLocal}
              className={`absolute top-2 right-4 z-20 px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 border cursor-pointer ${
                confirmDelete
                  ? 'bg-amber-950/90 border-amber-600 text-amber-200'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-amber-300'
              }`}
              aria-label={confirmDelete ? 'Confirm delete reel' : 'Delete reel'}
            >
              <Trash2 className="w-3 h-3" /> {confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
          )}
        </div>

        {/* Save (needs a catalog product, so it can be kept in the Saved list) */}
        {isMatched && (
        <div className="absolute right-3.5 bottom-6 z-20 flex flex-col items-center gap-1">
          <button
            onClick={handleToggleSave}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md border ${
              isCurrentSaved
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 scale-105'
                : 'bg-slate-900/85 text-slate-200 hover:text-cyan-400 border-slate-700 hover:border-cyan-500/50'
            }`}
            aria-label={isCurrentSaved ? 'Remove from Saved' : 'Save product'}
            aria-pressed={isCurrentSaved}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
          <span className="text-[10px] font-bold text-slate-300">{isCurrentSaved ? 'Saved' : 'Save'}</span>
        </div>
        )}

        {/* Previous / next (only when there is more than one reel) */}
        {visibleReels.length > 1 && (
          <>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
              <button
                onClick={goPrev}
                className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 flex items-center justify-center cursor-pointer backdrop-blur-md shadow-md"
                aria-label="Previous Reel"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                onClick={goNext}
                className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 flex items-center justify-center cursor-pointer backdrop-blur-md shadow-md"
                aria-label="Next Reel"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 py-2" aria-hidden="true">
              {visibleReels.map((r, idx) => (
                <span
                  key={r.id}
                  className={`w-1 rounded-full transition-all ${idx === currentIndex ? 'h-5 bg-cyan-400' : 'h-1.5 bg-slate-700'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product card */}
      <div className="z-30 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/80 border-t border-slate-800/80 backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider truncate">
            <Store className="w-3 h-3 text-cyan-400" />
            <span>{currentReel.category}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {currentIndex + 1} of {visibleReels.length}
          </span>
        </div>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug line-clamp-1">
            {currentReel.title}
          </h2>
          {currentReel.subtitle && (
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{currentReel.subtitle}</p>
          )}
        </div>

        {specChips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Specifications">
            {specChips.slice(0, 6).map((spec, i) => (
              <li
                key={`${spec.label}-${i}`}
                className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300"
              >
                <span className="text-slate-500">{spec.label}:</span> {spec.value}
              </li>
            ))}
          </ul>
        )}

        {/* Price & offers: always from the catalog product, only when available. */}
        <div className="min-h-[30px]" aria-live="polite">
          {!isMatched ? (
            <p className="text-xs text-slate-400">
              Not matched to a catalog product, so there is no price comparison for this Reel.
            </p>
          ) : productLoading ? (
            <p className="text-xs text-slate-500">Loading offers…</p>
          ) : productError ? (
            <p className="text-xs text-amber-300">Offers could not be loaded.</p>
          ) : !product ? (
            <p className="text-xs text-amber-300">Product not found</p>
          ) : !hasOffers ? (
            <p className="text-xs text-slate-400">No offers available yet</p>
          ) : (
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] text-slate-400">from</span>
                <span className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight tnum">
                  {product.bestPrice.toFixed(2).replace('.', ',')} €
                </span>
                <DemoBadge />
              </div>
              <span className="text-[10px] text-slate-400">
                {product.storesCount} {product.storesCount === 1 ? 'store' : 'stores'} compared
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCompare}
            disabled={!isMatched || !hasOffers}
            className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Layers className="w-4 h-4 stroke-[2.3]" />
            <span>Compare Prices</span>
          </button>

          {!isMatched && creatorBuyUrl ? (
            <a
              href={creatorBuyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCreatorBuyClick}
              className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="truncate">Buy at {creatorBuyHost}</span>
            </a>
          ) : (
            <button
              onClick={handleBuy}
              disabled={!canBuy}
              title={canBuy ? undefined : 'No valid merchant link available yet'}
              className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy</span>
            </button>
          )}
        </div>

        {isMatched && (
          <button
            onClick={handleDetails}
            disabled={!productLoading && !product}
            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>View Details</span>
          </button>
        )}

        {hasAffiliateLinks && <p className="text-[10px] leading-snug text-slate-500">{AFFILIATE_NOTE}</p>}
        {saveError && (
          <p className="text-[10px] leading-snug text-amber-300" role="alert">
            Saved products could not be stored in this browser. They may be lost when you close the page.
          </p>
        )}
      </div>
    </>
  );
};
