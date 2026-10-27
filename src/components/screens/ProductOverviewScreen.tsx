import React from 'react';
import { CheckCircle2, TrendingDown, Camera, Truck, ShieldCheck, Shield, ArrowRight, RefreshCw, AlertCircle, HelpCircle, Bell, Bookmark } from 'lucide-react';
import { Product } from '../../types';
import { StoresForProduct } from '../StoresForProduct';

import { t } from '../../i18n';
interface ProductOverviewScreenProps {
  product?: Product | null;
  onCompareOffers: () => void;
  onRescan: () => void;
  onOpenSetAlert?: () => void;
  onOpenHistory?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export const ProductOverviewScreen: React.FC<ProductOverviewScreenProps> = ({
  product,
  onCompareOffers,
  onRescan,
  onOpenSetAlert,
  onOpenHistory,
  isSaved = false,
  onToggleSave,
}) => {
  if (!product) {
    return (
      <div className="pb-8 space-y-4">
        {/* Missing Product Safe State */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                {t("DEMO PRODUCT DETAILS UNAVAILABLE")}
              </p>
              <p className="text-[11px] text-amber-900 font-medium">
                {t("No matching demo dataset found for this item")}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
            DEMO
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6 text-slate-400 stroke-[1.8]" />
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              {t("Product Details Unavailable")}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("Detailed specifications and store offers have not been modeled for this demo item yet.")}
            </p>
          </div>
          <button
            onClick={onRescan}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>{t("Return to Previous Screen")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-4">
      {/* Top Banner: Identified via demo dataset */}
      <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 leading-tight truncate">
              {t("Demo catalog product")}
            </p>
            <p className="text-[11px] text-emerald-800 font-medium">
              {t("Demo data, not real offers")}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
          {t("DEMO DATA")}
        </span>
      </div>

      {/* Main Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        {/* Verification and EAN header */}
        <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{t("Matched Sample (Demo)")}</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            EAN: <span className="text-slate-800">{product.ean}</span> <span className="text-slate-400 font-sans text-[10px]">{t("(Demo)")}</span>
          </div>
        </div>

        {/* Hero Product Image */}
        <div className="relative rounded-lg overflow-hidden bg-slate-900 border border-slate-200 aspect-4/3 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />

          {/* Original source watermark pill */}
          <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-1 rounded flex items-center gap-1">
            <Camera className="w-3 h-3 text-slate-300" />
            <span>{t("Sample source:")} {product.originalSource} {t("(Demo)")}</span>
          </div>
        </div>

        {/* Update timestamp & 30-day low tag */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("Sample index updated recently")}</span>
          </div>

          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded text-[11px] border border-emerald-200/80 transition-colors cursor-pointer"
          >
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            <span>{t("30-day lowest price")}</span>
          </button>
        </div>
      </div>

      {/* Product Specification Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
          {t(product.category)}
        </p>
        <h2 className="text-xl font-bold text-slate-900 leading-snug">
          {product.title}
        </h2>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          {product.subtitle}
        </p>

        {/* 4-item Spec Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">
              {t("Manufacturer")}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {product.brand}
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">
              {t("Model series")}
            </span>
            <span className="text-xs font-bold text-slate-900">
              {product.model}
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">
              {t("Color variant")}
            </span>
            <span className="text-xs font-bold text-slate-900 truncate block">
              {product.colorVariant}
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">
              {t("EAN / Barcode")}
            </span>
            <span className="text-xs font-bold font-mono text-slate-900 truncate block">
              {product.ean}
            </span>
          </div>
        </div>
      </div>

      {/* Best Price Card */}
      <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-emerald-100">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {product.storesCount} {t("stores in the demo comparison")}
          </span>
          <span className="text-emerald-800 text-[11px] font-medium">
            {t("Simulated offers")}
          </span>
        </div>

        <div className="mb-3">
          <p className="text-xs text-slate-600 font-medium">
            {t("Best final price in the demo comparison:")}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-bold text-emerald-800 tracking-tight tnum">
              {product.bestPrice.toFixed(2).replace('.', ',')} €
            </span>
            {product.originalPrice && (
              <span className="text-sm text-slate-400 line-through tnum">
                {product.originalPrice.toFixed(2).replace('.', ',')} €
              </span>
            )}
          </div>

          {product.savingsPercent && (
            <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded">
              <span>-{product.savingsPercent}{t("% OFF")}</span>
              <span className="text-emerald-100">·</span>
              <span className="font-normal">
                {t("You save")} {product.savingsAmount?.toFixed(2).replace('.', ',')} €
              </span>
            </div>
          )}
        </div>

        {/* 3 Trust Checks */}
        <div className="grid grid-cols-3 gap-1 pt-3 border-t border-emerald-100 text-[11px] text-slate-700 font-medium">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="leading-tight">{t("Free delivery")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="leading-tight">{t("Merchant details")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="leading-tight">{t("Merchant protection")}</span>
          </div>
        </div>
      </div>

      {/* Demo separation notice */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-700">{t("Demo data:")}</span> {t("specifications, EAN codes and prices are examples for evaluating the interface, not real offers.")}
        </p>
      </div>

      {/* Track & save */}
      <div className="grid grid-cols-2 gap-2">
        {onOpenSetAlert && (
          <button
            onClick={onOpenSetAlert}
            className="py-3 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span>{t("Price alert")}</span>
          </button>
        )}
        {onToggleSave && (
          <button
            onClick={onToggleSave}
            aria-pressed={isSaved}
            className={`py-3 px-3 border font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isSaved
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-emerald-600 text-emerald-600' : ''}`} />
            <span>{isSaved ? t("Saved") : t("Save")}</span>
          </button>
        )}
      </div>

      {/* Main Compare CTA Button */}
      <button
        onClick={onCompareOffers}
        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
      >
        <span>{t("Compare offers (")}{product.storesCount})</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      <StoresForProduct product={product} />

      {/* Secondary Rescan Button */}
      <button
        onClick={onRescan}
        className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
        <span>{t("Not the right product? Refine or scan again")}</span>
      </button>
    </div>
  );
};
