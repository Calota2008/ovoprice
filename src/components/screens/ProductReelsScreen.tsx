import React, { useState, useEffect } from 'react';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { ReelItem } from '../../types';
import { DemoBadge } from '../DemoBadge';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  MoreVertical,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ShoppingBag,
  Store,
  Tag,
  ShieldCheck,
  Check,
  Info,
  Layers,
} from 'lucide-react';




interface ProductReelsScreenProps {
  onBack: () => void;
  onOpenProduct: (productId: string) => void;
  onCompareOffers: () => void;
  savedProductIds: string[];
  onToggleSave: (reelItem: ReelItem) => void;
}

export const ProductReelsScreen: React.FC<ProductReelsScreenProps> = ({
  onBack,
  onOpenProduct,
  onCompareOffers,
  savedProductIds = [],
  onToggleSave,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const { data: REEL_ITEMS, loading } = usePriceData<ReelItem[]>(() => priceProvider.getReels(), [], []);
  const currentReel = REEL_ITEMS[currentIndex];
  const isCurrentSaved = currentReel
    ? savedProductIds.includes(currentReel.id) || savedProductIds.includes(`save-${currentReel.id}`)
    : false;

  // Auto trigger subtle motion pulse on reel change
  useEffect(() => {
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % REEL_ITEMS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + REEL_ITEMS.length) % REEL_ITEMS.length);
  };

  const handleToggleSave = () => {
    onToggleSave(currentReel);
    const nextSavedState = !isCurrentSaved;
    showToast(nextSavedState ? 'Added to Saved Watchlist' : 'Removed from Saved Watchlist');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!');
    } else {
      showToast('Sharing link for ' + currentReel.title);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  if (!currentReel) {
    return (
      <div className="w-full rounded-2xl bg-[#070b12] text-slate-300 flex items-center justify-center min-h-[320px] text-sm">
        {loading ? 'Se încarcă…' : 'Nu există exemple disponibile.'}
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#070b12] text-slate-100 flex flex-col min-h-[580px] sm:min-h-[640px] shadow-2xl border border-slate-800 select-none">
      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 border border-slate-700/60 backdrop-blur-md transition-all cursor-pointer text-xs font-semibold"
          aria-label="Back to OvoPrice"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Brand / Mode badge */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-cyan-500/30 px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-cyan-400">
            REELCART
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-500/30">
            DEMO
          </span>
        </div>

        {/* Counter and audio toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              showToast(isMuted ? 'Sunet pornit' : 'Sunet oprit');
            }}
            className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-colors backdrop-blur-md cursor-pointer"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title="Sunet"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Reel Visual Canvas */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-radial from-slate-900 via-[#070b12] to-black min-h-[460px] sm:min-h-[520px]">
        {/* Ambient Cyan Glow */}
        <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none -top-10 -right-10" />
        <div className="absolute w-60 h-60 rounded-full bg-blue-600/10 blur-3xl pointer-events-none bottom-20 left-4" />

        {/* Reel Product Image with Subtle Motion & Transition */}
        <div
          className={`relative w-full h-full max-h-[540px] flex items-center justify-center p-6 transition-all duration-500 ease-out ${
            isPulsing ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
          }`}
        >
          <img
            src={currentReel.image}
            alt={currentReel.title}
            className="max-h-[380px] sm:max-h-[420px] max-w-[85%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] filter transition-transform duration-700 hover:scale-105"
            referrerPolicy="no-referrer"
          />

          {/* Reel Tagline Badge floating above product */}
          <div className="absolute top-16 left-4 bg-slate-950/80 border border-slate-800/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-300 flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{currentReel.tagline}</span>
          </div>

          {/* Floating Demo Video Feed Indicator with Audio Wave */}
          <div className="absolute top-16 right-4 bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
            <span className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 h-1.5 bg-cyan-400 animate-pulse" />
              <span className="w-0.5 h-2.5 bg-cyan-400 animate-pulse delay-75" />
              <span className="w-0.5 h-2 bg-cyan-400 animate-pulse delay-150" />
            </span>
            <span>{currentReel.reelCreator}</span>
          </div>
        </div>

        {/* Right-Hand Floating Action Rail (ReelCart Style) */}
        <div className="absolute right-3.5 bottom-32 z-25 flex flex-col items-center gap-3">
          {/* Bookmark / Save */}
          <button
            onClick={handleToggleSave}
            className={`w-10 h-10 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md border ${
              isCurrentSaved
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 scale-105'
                : 'bg-slate-900/85 text-slate-200 hover:text-cyan-400 border-slate-700 hover:border-cyan-500/50'
            }`}
            aria-label={isCurrentSaved ? 'Remove from Saved' : 'Save product'}
            title={isCurrentSaved ? 'Remove from Saved Watchlist' : 'Save to Watchlist'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
          <span className="text-[10px] font-bold text-slate-300 -mt-2">
            {isCurrentSaved ? 'Saved' : 'Save'}
          </span>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 flex flex-col items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
            aria-label="Share product"
            title="Share Reel"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-slate-300 -mt-2">Share</span>

          {/* Three-dot menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
              aria-label="More options"
              title="More Details"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-slate-300 block text-center mt-1">More</span>

            {/* Menu Popover */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 bottom-12 w-56 bg-slate-900 border border-slate-700 rounded-xl p-3 z-40 text-xs text-slate-300 shadow-2xl space-y-2 animate-in fade-in duration-150">
                  <div className="pb-1.5 border-b border-slate-800">
                    <p className="font-bold text-white text-xs">{currentReel.merchant}</p>
                    <p className="text-[10px] text-slate-400">{currentReel.merchantDomain}</p>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Landed Stores:</span>
                      <span className="text-white font-semibold">{currentReel.storesCount} verified</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Original Price:</span>
                      <span className="line-through text-slate-400">{currentReel.originalPrice.toFixed(2)} €</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Demo Model:</span>
                      <span className="text-cyan-400 font-mono">Sample Match</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onCompareOffers();
                    }}
                    className="w-full mt-2 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-semibold text-[11px] transition-colors text-center"
                  >
                    Compare All 14 Offers
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Up / Down Reel Navigation Controls */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-25 flex flex-col gap-2">
          <button
            onClick={handlePrev}
            className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md shadow-md"
            aria-label="Previous Reel"
            title="Previous Reel"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md shadow-md"
            aria-label="Next Reel"
            title="Next Reel"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Reel Position Dots on Left Edge */}
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 py-2">
          {REEL_ITEMS.map((_, idx) => (
            <span
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-1 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'h-5 bg-cyan-400'
                  : 'h-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Product Info & Action Card Overlay (ReelCart Style) */}
      <div className="z-30 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/80 border-t border-slate-800/80 backdrop-blur-xl space-y-3">
        {/* Merchant & Category Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
              <Store className="w-3 h-3 text-cyan-400" />
              <span>{currentReel.merchant}</span>
            </span>

            <span className="text-[10px] font-semibold text-slate-400 truncate">
              {currentReel.category} · {currentReel.storesCount} stores compared
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {currentIndex + 1} of {REEL_ITEMS.length}
          </span>
        </div>

        {/* Product Title & Subtitle */}
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug line-clamp-1">
            {currentReel.title}
          </h2>
          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
            {currentReel.subtitle}
          </p>
        </div>

        {/* Price Area & Landed Savings */}
        <div className="flex items-baseline justify-between gap-2 pt-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight tnum">
              {currentReel.bestPrice.toFixed(2).replace('.', ',')} €
            </span>
            <span className="text-xs text-slate-500 line-through tnum">
              {currentReel.originalPrice.toFixed(2).replace('.', ',')} €
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
              -{currentReel.savingsPercent}%
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">
              {currentReel.shippingNote}
            </span>
          </div>
        </div>

        {/* Primary Action Button (ReelCart Cyan Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onOpenProduct(currentReel.id)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-slate-950 stroke-[2.3]" />
            <span>View Product Details</span>
          </button>

          <button
            onClick={onCompareOffers}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] border border-slate-700 hover:border-cyan-500/40 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Compare 14 Store Offers</span>
          </button>
        </div>
      </div>

      {/* Ephemeral Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
