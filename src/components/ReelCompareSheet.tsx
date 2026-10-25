import React, { useEffect, useMemo, useRef } from 'react';
import { X, ExternalLink, Layers } from 'lucide-react';
import { Product, StoreOffer } from '../types';
import { DemoBadge } from './DemoBadge';
import { isSafeHttpUrl } from '../utils/url';

interface ReelCompareSheetProps {
  product: Product;
  onClose: () => void;
  onBuy: (offer: StoreOffer) => void;
  onSeeAll: () => void;
}

const MAX_ROWS = 3;

const euro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

/** Bottom sheet over the Reels feed: the cheapest offers, with a direct path to the merchant. */
export const ReelCompareSheet: React.FC<ReelCompareSheetProps> = ({ product, onClose, onBuy, onSeeAll }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = useMemo(
    () => [...product.offers].sort((a, b) => a.totalLandedPrice - b.totalLandedPrice),
    [product.offers]
  );
  const rows = sorted.slice(0, MAX_ROWS);
  const cheapest = sorted[0];

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Compare prices for ${product.title}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[85%] overflow-y-auto rounded-t-2xl bg-[#0b111b] border-t border-slate-700 p-4 space-y-3 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white line-clamp-1">{product.title}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              Lowest total prices <DemoBadge />
            </p>
          </div>
          <button onClick={onClose} aria-label="Close comparison" className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-2">
          {rows.map((offer, i) => {
            const hasLink = isSafeHttpUrl(offer.affiliateUrl);
            const delta = offer.totalLandedPrice - cheapest.totalLandedPrice;
            return (
              <li
                key={offer.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  i === 0 ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{offer.storeName}</p>
                  <p className="text-[10px] text-slate-400">
                    {euro(offer.basePrice)} + {offer.shippingPrice === 0 ? 'free shipping' : `${euro(offer.shippingPrice)} shipping`}
                  </p>
                  {i === 0 ? (
                    <p className="text-[10px] font-semibold text-cyan-300 mt-0.5">Lowest total</p>
                  ) : (
                    delta > 0 && <p className="text-[10px] text-slate-500 mt-0.5">+{euro(delta)} vs lowest</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base font-black text-white tnum">{euro(offer.totalLandedPrice)}</span>
                  <button
                    onClick={() => onBuy(offer)}
                    disabled={!hasLink}
                    aria-label={`Buy at ${offer.storeName}`}
                    title={hasLink ? undefined : 'No valid merchant link available yet'}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Buy
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          onClick={onSeeAll}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          {sorted.length > rows.length ? `See all ${sorted.length} offers` : 'See full comparison'}
        </button>

        <p className="text-[10px] leading-snug text-slate-500">
          Demo prices are examples, not real offers. Always check the final price at the merchant.
        </p>
      </div>
    </div>
  );
};
