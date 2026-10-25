import React from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Package,
  TrendingDown,
  ExternalLink,
  Info,
  ArrowRight,
  Shield,
  Store,
} from 'lucide-react';
import { Product, StoreOffer } from '../../types';
import { DemoBadge, DemoFootnote } from '../DemoBadge';

interface BreakdownScreenProps {
  product: Product;
  offer: StoreOffer;
  onOpenHistory: () => void;
  onRedirectStore: (offer: StoreOffer) => void;
}

export const BreakdownScreen: React.FC<BreakdownScreenProps> = ({
  product,
  offer,
  onOpenHistory,
  onRedirectStore,
}) => {
  const avgTotal = product.offers.length
    ? product.offers.reduce((sum, o) => sum + o.totalLandedPrice, 0) / product.offers.length
    : 0;
  const savingVsAvg = avgTotal - offer.totalLandedPrice;

  return (
    <div className="pb-24 space-y-4">
      {/* Top verified banner */}
      <div className="flex items-center justify-between text-xs py-1 px-1">
        <div className="flex items-center gap-1.5 text-emerald-800 font-bold tracking-tight">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{offer.isBestPrice ? 'Cel mai mic preț din exemplu' : 'Ofertă de exemplu'}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
          <DemoBadge />
        </div>
      </div>

      {/* Mini Product Bar */}
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
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 uppercase">
              {offer.storeName}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              • Direct Seller
            </span>
          </div>

          <h2 className="text-sm font-bold text-slate-900 truncate">
            {product.title}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            Modell 2024 · Laser Slim Fluffy · Digital Motor
          </p>
        </div>
      </div>

      {/* Price comparison breakdown card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="text-xs font-bold">€</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Price comparison breakdown
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wider rounded uppercase">
            ESTIMATED BREAKDOWN
          </span>
        </div>

        {/* Ledger items */}
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Base product price</span>
            <span className="font-semibold text-slate-900 tnum">
              {offer.basePrice.toFixed(2).replace('.', ',')} €
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <div className="flex items-center gap-2">
              <span>Shipping cost</span>
              <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded">
                Free delivery
              </span>
            </div>
            <span className="font-semibold text-emerald-700 tnum">
              {offer.shippingPrice.toFixed(2).replace('.', ',')} €
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Taxes & Surcharges</span>
            <span className="text-slate-500 text-[11px]">
              Included (19% German VAT)
            </span>
          </div>

          {/* Highlight Total Landed Price Box */}
          <div className="mt-4 pt-3 border-t border-slate-150 bg-slate-50/80 rounded-xl p-3 border border-slate-200">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-bold text-slate-900">
                Total Landed Price
              </span>
              <span className="text-2xl font-extrabold text-emerald-800 tracking-tight tnum">
                {offer.totalLandedPrice.toFixed(2).replace('.', ',')} €
              </span>
            </div>

            {savingVsAvg > 0.005 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mb-3">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>
                  {savingVsAvg.toFixed(2).replace('.', ',')} € sub media ofertelor din exemplu (
                  {avgTotal.toFixed(2).replace('.', ',')} €)
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
              {product.lowestPriceInDays ? (
                <span className="text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Cel mai mic preț din ultimele {product.lowestPriceInDays} zile</span>
                </span>
              ) : (
                <span />
              )}

              <button
                onClick={onOpenHistory}
                className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Price history</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Store Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Store Details
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
            <ShieldCheck className="w-3 h-3" />
            <span>Retailer Listing</span>
          </span>
        </div>

        {/* Store Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <Store className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {offer.storeName}
            </h4>
            {offer.storeRating != null && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="text-amber-500 font-bold">★ {offer.storeRating}</span>
                {offer.reviewCount && <span>({offer.reviewCount})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Estimate */}
        <div className="flex items-start gap-3 text-xs">
          <Truck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">
              Delivery Estimate
            </span>
            <span className="text-slate-600">
              {offer.deliveryEstimate}
            </span>
          </div>
        </div>

        {/* Return Information */}
        <div className="flex items-start gap-3 text-xs">
          <RotateCcw className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">
              Return Information
            </span>
            <span className="text-slate-600">
              {offer.returnPolicy}
            </span>
          </div>
        </div>

        {/* Stock Status */}
        <div className="flex items-start gap-3 text-xs">
          <Package className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">
              Stock Status
            </span>
            <span className="text-slate-600">
              {offer.stockStatus}
            </span>
          </div>
        </div>
      </div>

      {/* External Merchant Guarantee */}
      <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex items-center gap-3 text-xs text-slate-700">
        <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <span className="font-bold text-slate-900 block">
            Merchant & Manufacturer Policy
          </span>
          <span className="text-[11px] text-slate-500">
            Garanție: {offer.warranty}
          </span>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 shadow-lg">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
              PREȚ FINAL LA {offer.storeName.toUpperCase()}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ⚡ INSTANT REDIRECT
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight tnum">
              {offer.totalLandedPrice.toFixed(2).replace('.', ',')} €
            </div>

            <button
              onClick={() => onRedirectStore(offer)}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <span>Go to store</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 flex items-start gap-1 leading-tight pt-1">
            <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Cumperi direct de la {offer.storeName}. OvoPrice nu procesează plăți și nu preia comenzi. Verifică prețul final și livrarea pe site-ul comerciantului.
            </span>
          </p>
        </div>
      </div>
      <DemoFootnote />
    </div>
  );
};
