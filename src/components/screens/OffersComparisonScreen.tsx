import React, { useState } from 'react';
import { Zap, ExternalLink, ArrowRight, Star, Truck, Filter } from 'lucide-react';
import { Product, StoreOffer } from '../../types';
import { DemoBadge, DemoFootnote } from '../DemoBadge';

import { t } from '../../i18n';
import { StoreBadge } from '../StoreBadge';
interface OffersComparisonScreenProps {
  product: Product;
  onSelectOffer: (offer: StoreOffer) => void;
  onRedirectStore: (offer: StoreOffer) => void;
  onViewProductOverview: () => void;
}

export const OffersComparisonScreen: React.FC<OffersComparisonScreenProps> = ({
  product,
  onSelectOffer,
  onRedirectStore,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'freeShipping'>('all');

  const winnerOffer = product.offers.find((o) => o.isBestPrice) || product.offers[0];
  const otherOffers = product.offers.filter((o) => o.id !== winnerOffer.id);
  const maxSaving =
    product.offers.length > 1
      ? Math.max(...product.offers.map((o) => o.totalLandedPrice)) - winnerOffer.totalLandedPrice
      : 0;
  const historyPrices = product.history.map((h) => h.price);
  const historicLow = historyPrices.length ? Math.min(...historyPrices) : null;
  const sparkPath = (() => {
    if (historyPrices.length < 2) return '';
    const lo = Math.min(...historyPrices);
    const hi = Math.max(...historyPrices);
    const span = hi - lo || 1;
    return historyPrices
      .map((v, i) => {
        const x = (i / (historyPrices.length - 1)) * 100;
        const y = 28 - ((v - lo) / span) * 26;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  })();

  const filteredOtherOffers = otherOffers.filter((o) => {
    if (filterMode === 'freeShipping') return o.shippingPrice === 0;
    return true;
  });

  return (
    <div className="pb-8 space-y-4">
      {/* Product Mini Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 uppercase tracking-tight">
              {t("DIRECT MATCH")}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              EAN: {product.ean}
            </span>
          </div>

          <h2 className="text-sm font-bold text-slate-900 truncate">
            {product.title}
          </h2>
          <p className="text-xs text-slate-500">
            {t(product.category)} · {product.offers.length} {t("demo offers")}
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>{t("Landed Total")}</span>
          </button>

          <button
            onClick={() => setFilterMode('freeShipping')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
              filterMode === 'freeShipping'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3 h-3" />
            <span>{t("Free Shipping Only")}</span>
          </button>

        </div>

        <DemoBadge className="shrink-0" />
      </div>

      {/* Winning Offer Card ("BESTER GESAMTPREIS") */}
      <div className="bg-emerald-50/40 rounded-xl border-2 border-emerald-500 p-4 shadow-sm relative overflow-hidden">
        {/* Top Attached Winner Badge */}
        <div className="flex items-center justify-between -mx-4 -mt-4 mb-3 bg-emerald-100/90 border-b border-emerald-200 px-4 py-2">
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>{t("Lowest price in the demo")}</span>
          </div>
          {maxSaving > 0 && (
            <span className="text-emerald-700 font-bold text-xs">
              {t("Difference vs. the most expensive:")} {maxSaving.toFixed(2).replace('.', ',')} €
            </span>
          )}
        </div>

        {/* Merchant Info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StoreBadge name={winnerOffer.storeName} logo={winnerOffer.storeLogo} />
            <h3 className="text-base font-bold text-slate-900">
              {winnerOffer.storeName}
            </h3>
            <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded">
              {t("Listed")}
            </span>
          </div>
          {winnerOffer.storeRating != null && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="font-semibold text-slate-800">{winnerOffer.storeRating}</span>
              {winnerOffer.reviewCount && <span className="text-slate-400">· {winnerOffer.reviewCount}</span>}
            </div>
          )}
        </div>

        {/* Total Landed Price */}
        <div className="mb-3">
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
            {t("TOTAL LANDED PRICE")}
          </span>
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight tnum">
            {winnerOffer.totalLandedPrice.toFixed(2).replace('.', ',')} €
          </span>
        </div>

        {/* 3-column breakdown */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-white rounded-lg border border-slate-200/80 mb-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">{t("Product Base")}</span>
            <span className="font-semibold text-slate-800 tnum">
              {winnerOffer.basePrice.toFixed(2).replace('.', ',')} €
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">{t("Shipping")}</span>
            <span className="font-semibold text-emerald-700">
              {t("Free (0,00 €)")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">{t("Total Cost")}</span>
            <span className="font-bold text-slate-900 tnum">
              {winnerOffer.totalLandedPrice.toFixed(2).replace('.', ',')} €
            </span>
          </div>
        </div>

        {/* Delivery Guarantee */}
        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-white/80 p-2.5 rounded-lg border border-emerald-200 mb-3 font-medium">
          <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t("Delivery:")} {t(winnerOffer.deliveryEstimate)}{winnerOffer.deliveryGuarantee ? ` · ${t(winnerOffer.deliveryGuarantee)}` : ''}</span>
        </div>

        {/* Buy at Amazon button */}
        <div className="flex gap-2">
          <button
            onClick={() => onRedirectStore(winnerOffer)}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <span>{t("Buy at")} {winnerOffer.storeName}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectOffer(winnerOffer)}
            className="px-3.5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title={t("Inspect full price breakdown")}
          >
            {t("Breakdown")}
          </button>
        </div>
      </div>

      {/* Price trend strip (from product history) */}
      {historicLow !== null && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t("PRICE HISTORY")} <DemoBadge className="ml-1" />
            </span>
            <span className="text-xs font-bold text-slate-900 tnum">
              {t("Historical low:")} {historicLow.toFixed(2).replace('.', ',')} €
            </span>
          </div>
          {sparkPath && (
            <div className="w-24 h-7 shrink-0">
              <svg viewBox="0 0 100 30" className="w-full h-full stroke-emerald-600 fill-none" strokeWidth="2.5">
                <path d={sparkPath} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Other Verified Offers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900">
            {t("Other offers")}
          </h3>
          <span className="text-[11px] text-slate-500">
            {t("Sorted by Total Landed Price")}
          </span>
        </div>

        <div className="space-y-2.5">
          {filteredOtherOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <StoreBadge name={offer.storeName} logo={offer.storeLogo} size="sm" />
                    <span className="text-sm font-bold text-slate-900">
                      {offer.storeName}
                    </span>
                    {offer.badge && (
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-medium rounded border border-slate-200">
                        {t(offer.badge)}
                      </span>
                    )}
                  </div>
                  {offer.storeRating != null && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{offer.storeRating}</span>
                      {offer.reviewCount && <span>· {offer.reviewCount}</span>}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-slate-900 block tnum">
                    {offer.totalLandedPrice.toFixed(2).replace('.', ',')} €
                  </span>
                  {offer.priceDeltaVsBest && (
                    <span className="text-[10px] font-semibold text-rose-600">
                      +{offer.priceDeltaVsBest.toFixed(2).replace('.', ',')} {t("€ vs Best")}
                    </span>
                  )}
                </div>
              </div>

              {/* Breakdown equation */}
              <div className="text-[11px] text-slate-500 py-1 border-t border-slate-100 flex items-center justify-between">
                <span>
                  {offer.basePrice.toFixed(2).replace('.', ',')} {t("€ item +")} {t(offer.shippingText)}
                </span>
                <span className="font-semibold text-slate-700 tnum">
                  {t("Total:")} {offer.totalLandedPrice.toFixed(2).replace('.', ',')} €
                </span>
              </div>

              {/* Bottom row: delivery estimate & CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t(offer.deliveryEstimate)}</span>
                </span>

                <button
                  onClick={() => onRedirectStore(offer)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{t("Go to")} {offer.storeName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DemoFootnote />
    </div>
  );
};
