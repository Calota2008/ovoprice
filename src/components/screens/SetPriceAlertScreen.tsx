import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Minus,
  Plus,
  CheckCircle2,
  TrendingDown,
  Smartphone,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';
import { Product } from '../../types';
import { DemoBadge, DemoFootnote } from '../DemoBadge';

import { t } from '../../i18n';
interface SetPriceAlertScreenProps {
  product: Product;
  initialTargetPrice?: number;
  onConfirmAlert: (targetPrice: number) => void;
  onSaveToWatchlist: () => void;
}

export const SetPriceAlertScreen: React.FC<SetPriceAlertScreenProps> = ({
  product,
  initialTargetPrice,
  onConfirmAlert,
  onSaveToWatchlist,
}) => {
  const [targetPrice, setTargetPrice] = useState<number>(
    initialTargetPrice ?? Math.floor(product.bestPrice * 0.95)
  );
  const [confirmed, setConfirmed] = useState(false);

  const bestPrice = product.bestPrice;
  const savingsIfHit = Math.max(0, bestPrice - targetPrice);
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  const bestStore = product.offers.find((o) => o.isBestPrice)?.storeName ?? product.offers[0]?.storeName ?? '';
  const historyPrices = product.history.map((h) => h.price);
  const lowestPrice = historyPrices.length ? Math.min(...historyPrices) : null;
  const lowestDate = product.history.find((h) => h.price === lowestPrice)?.date ?? '';
  const storeNames = product.offers.map((o) => o.storeName).slice(0, 3).join(', ');

  const stepDown = () => {
    setTargetPrice((prev) => Math.max(1, Math.round((prev - 5) * 100) / 100));
  };

  const stepUp = () => {
    setTargetPrice((prev) => Math.min(bestPrice, Math.round((prev + 5) * 100) / 100));
  };

  const setDiscountStage = (percent: number) => {
    const discounted = bestPrice * (1 - percent / 100);
    setTargetPrice(Math.round(discounted * 100) / 100);
  };

  const confirmTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    },
    []
  );

  const handleSetAlert = () => {
    if (confirmed) return;
    setConfirmed(true);
    confirmTimer.current = window.setTimeout(() => {
      onConfirmAlert(targetPrice);
    }, 800);
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Top Header Text */}
      <div>
        <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
          <Bell className="w-3.5 h-3.5" />
          <span>{t("SET UP PRICE RADAR")}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t("Save & Track Product")}
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {t("Save this item and track its price against your target.")}
        </p>
      </div>

      {/* Mini Product Card */}
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
          <span className="text-[10px] text-slate-400 block font-medium">
            {t("Incl. shipping ·")} {product.storesCount} {t("stores monitored")}
          </span>
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {product.title}
          </h2>
          <p className="text-xs text-emerald-700 font-semibold mt-0.5">
            {t("Best price:")} <span className="font-bold text-slate-900 tnum">{product.bestPrice.toFixed(2).replace('.', ',')} €</span>{bestStore && ` (${bestStore})`}
          </p>
        </div>
      </div>

      {/* Target Price Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{t("Set your target price")}</h3>
          <DemoBadge />
        </div>

        <p className="text-xs text-slate-500 leading-tight">
          {t("Set a target price. It will be highlighted in the app when an offer reaches it.")}
        </p>

        {/* Dein Wunschpreis Stepper Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            {t("YOUR TARGET PRICE")}
          </span>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={stepDown}
              className="w-11 h-11 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
              aria-label={t("Decrease target price")}
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="w-44 text-center">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight tnum block">
                {targetPrice.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {t("Total incl. VAT")}
              </span>
            </div>

            <button
              onClick={stepUp}
              className="w-11 h-11 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
              aria-label={t("Increase target price")}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Savings Callout Pill */}
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {t("You save")} {savingsIfHit.toFixed(2).replace('.', ',')} {t("€ if target is hit")}
            </span>
          </div>
        </div>

        {/* Schnellwahl Rabatt-Stufen (Quick Discount chips) */}
        <div>
          <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
            {t("Quick discount levels:")}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '-5%', percent: 5, price: `${fmt(bestPrice * 0.95)} €` },
              { label: '-10%', percent: 10, price: `${fmt(bestPrice * 0.9)} €` },
              { label: '-15%', percent: 15, price: `${fmt(bestPrice * 0.85)} €` },
            ].map((stage) => (
              <button
                key={stage.label}
                onClick={() => setDiscountStage(stage.percent)}
                className="py-2 px-2 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 rounded-lg text-center transition-colors cursor-pointer"
              >
                <span className="block text-xs font-bold text-blue-800">
                  {stage.label}
                </span>
                <span className="block text-[11px] text-blue-600 font-mono tnum">
                  {stage.price}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lowest price in (demo) history */}
        {lowestPrice !== null && (
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900 block">{t("Historical low")}</span>
              <span className="text-[11px] text-slate-500">{lowestDate} {t("· example data")}</span>
            </div>
            <span className="font-bold text-slate-900 tnum">{fmt(lowestPrice)} €</span>
          </div>
        )}
      </div>

      {/* Notification channel Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">{t("Notification channel")}</h3>

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">{t("In-app alert")}</span>
                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded">
                  {t("Instant")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                {t("Checked when you open the app. Push notifications are not available yet.")}
              </p>
            </div>
          </div>

          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
            {t("Active")}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t("Merchants included:")} {storeNames || '—'}{product.offers.length > 3 ? t(" and more") : ''}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleSetAlert}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
        >
          {confirmed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{t("Alert activated (")}{targetPrice.toFixed(2).replace('.', ',')} €)</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>{t("Set price alert (")}{targetPrice.toFixed(2).replace('.', ',')} €)</span>
            </>
          )}
        </button>

        <button
          onClick={onSaveToWatchlist}
          className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Bookmark className="w-3.5 h-3.5 text-slate-500" />
          <span>{t("Save without alert")}</span>
        </button>
      </div>
      <DemoFootnote />
    </div>
  );
};
