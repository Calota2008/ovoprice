import React, { useState } from 'react';
import { TrendingDown, ThumbsUp, Bell, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types';
import { DemoBadge, DemoFootnote } from '../DemoBadge';

import { t } from '../../i18n';
import { useIsDesktop } from '../../hooks/useIsDesktop';
interface PriceHistoryScreenProps {
  product: Product;
  onSetAlertWithPrice: (targetPrice: number) => void;
}

export const PriceHistoryScreen: React.FC<PriceHistoryScreenProps> = ({
  product,
  onSetAlertWithPrice,
}) => {
  const history = product.history;
  const prices = history.map((h) => h.price);
  const current = product.bestPrice;
  const lowest = prices.length ? Math.min(...prices) : current;
  const highest = prices.length ? Math.max(...prices) : current;
  const average = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : current;
  const lowestPoint = history.find((h) => h.price === lowest);
  const pctVsAvg = average ? ((current - average) / average) * 100 : 0;
  const pctAboveLow = lowest ? ((current - lowest) / lowest) * 100 : 0;
  const bestStore = product.offers.find((o) => o.isBestPrice)?.storeName ?? product.offers[0]?.storeName ?? '';
  const sliderMin = Math.max(5, Math.floor((lowest * 0.9) / 5) * 5);
  const sliderMax = Math.max(sliderMin + 5, Math.ceil(current / 5) * 5);
  const [sliderTarget, setSliderTarget] = useState<number>(
    Math.min(sliderMax, Math.max(sliderMin, Math.floor((current * 0.95) / 5) * 5))
  );
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');

  // Chart geometry derived from product.history
  const yPad = (highest - lowest) * 0.1 || 1;
  const yLo = lowest - yPad;
  const yHi = highest + yPad;
  const yOf = (v: number) => 150 - ((v - yLo) / (yHi - yLo)) * 140;
  const xOf = (i: number) => (history.length > 1 ? (i / (history.length - 1)) * 320 : 160);
  const pricePath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)},${yOf(h.price).toFixed(1)}`).join(' ');
  const avgPath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)},${yOf(h.movingAverage).toFixed(1)}`).join(' ');
  const areaPath = history.length ? `${pricePath} L 320,160 L 0,160 Z` : '';
  const lowestIdx = history.findIndex((h) => h.price === lowest);
  const yTicks = [0, 1, 2, 3].map((k) => yHi - ((yHi - yLo) * k) / 3);
  const axisLabels = history.length
    ? [history[0], history[Math.floor((history.length - 1) / 2)], history[history.length - 1]]
    : [];
  const [alertCreated, setAlertCreated] = useState(false);
  const isDesktop = useIsDesktop();

  const handleCreateAlert = () => {
    setAlertCreated(true);
    setTimeout(() => {
      onSetAlertWithPrice(sliderTarget);
    }, 800);
  };

  const bar = (
    <>
      {/* Product Mini Bar */}
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
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 uppercase">
              {t("PRICE HISTORY")}
            </span>
            <DemoBadge />
            <span className="text-[10px] text-slate-400 font-mono">
              EAN: {product.ean}
            </span>
          </div>

          <h2 className="text-sm font-bold text-slate-900 truncate">
            {product.title}
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-900 tnum">
              {product.bestPrice.toFixed(2).replace('.', ',')} €
            </span>{' '}
            {bestStore && t('at {store}', { store: bestStore })}
          </p>
        </div>
      </div>

    </>
  );

  const metrics = (
    <>
      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Current */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("Current")}
          </span>
          <span className="text-base font-bold text-slate-900 block mt-1 tnum">
            {product.bestPrice.toFixed(2).replace('.', ',')} €
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 mt-0.5 block">
            {pctVsAvg > 0 ? '+' : ''}{pctVsAvg.toFixed(0)}{t("% vs. average")}
          </span>
        </div>

        {/* Lowest */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            {t("Lowest")}
          </span>
          <span className="text-base font-bold text-slate-900 block mt-1 tnum">
            {fmt(lowest)} €
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {lowestPoint?.date ?? ''}
          </span>
        </div>

        {/* Average */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-blue-600 rounded-full" />
            {t("Average")}
          </span>
          <span className="text-base font-bold text-slate-900 block mt-1 tnum">
            {fmt(average)} €
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {t("demo average")}
          </span>
        </div>
      </div>

    </>
  );

  const chart = (
    <>
      {/* Price Movement Chart Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t("Price trend")}</h3>
            <p className="text-[11px] text-slate-500">{t("Example history, not real prices")}</p>
          </div>

          <DemoBadge />
        </div>

        {/* Pill status */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md text-[11px] font-medium text-emerald-800 mb-4 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{t("Now")} <strong>{Math.abs(pctVsAvg).toFixed(0)}% {pctVsAvg <= 0 ? t("below") : t("above")}</strong> {t("the demo average")}</span>
        </div>

        {/* SVG Interactive Trend Chart */}
        <div className="relative pt-2 pb-1">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] font-mono text-slate-400 select-none">
            {yTicks.map((t) => (
              <span key={t}>{Math.round(t)}€</span>
            ))}
          </div>

          {/* SVG Canvas */}
          <div className="ml-8 h-48 relative">
            <svg
              viewBox="0 0 320 160"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="80%" stopColor="#10b981" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid horizontal guidelines */}
              {[10, 56.7, 103.3, 150].map((y) => (
                <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
              ))}

              {/* Moving mean (blue dashed) */}
              {avgPath && (
                <path d={avgPath} fill="none" stroke="#2563eb" strokeWidth="1.8" strokeDasharray="4 3" />
              )}

              {/* Filled area */}
              {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

              {/* Price line */}
              {pricePath && (
                <path d={pricePath} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Data points */}
              {lowestIdx >= 0 && (
                <circle cx={xOf(lowestIdx)} cy={yOf(lowest)} r="5" fill="#ffffff" stroke="#059669" strokeWidth="3" />
              )}
              {history.length > 0 && (
                <circle cx={xOf(history.length - 1)} cy={yOf(history[history.length - 1].price)} r="4.5" fill="#059669" />
              )}

              {/* Lowest annotation pin */}
              {lowestIdx >= 0 && (
                <g transform={`translate(${Math.min(240, Math.max(0, xOf(lowestIdx) - 40))}, ${Math.min(135, yOf(lowest) + 8)})`}>
                  <rect width="80" height="20" rx="4" fill="#064e3b" />
                  <text x="40" y="14" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Inter">
                    MIN: {fmt(lowest)} €
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Date Axis */}
          <div className="ml-8 mt-2 flex justify-between text-[10px] text-slate-400 font-medium">
            {axisLabels.map((h, i) => (
              <span key={`${h.date}-${i}`} className={i === axisLabels.length - 1 ? 'font-bold text-slate-800' : ''}>
                {t(h.date)}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>{t("Demo minimum")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-blue-600 rounded-full" />
            <span>{t("Moving average")}</span>
          </div>
        </div>
      </div>

    </>
  );

  const verdict = (
    <>
      {/* Good Price to Buy Recommendation Card */}
      <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-slate-900">{t("Versus history")}</h4>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t("The current price is")} <strong>{pctAboveLow.toFixed(0)}{t("% above the minimum")}</strong> {t("of the example history (")}{fmt(lowest)} {t("€). This is not a purchase recommendation.")}
            </p>
          </div>
        </div>
      </div>

    </>
  );

  const alertCard = (
    <>
      {/* Target Price Alert Slider Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{t("Target Price Alert")}</h4>
              <p className="text-[11px] text-slate-500">{t("Set a target price")}</p>
            </div>
          </div>

        </div>

        {/* Dynamic Price Display */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-600 font-medium">{t("Let me know when the price drops to:")}</span>
            <span className="text-xl font-extrabold text-emerald-800 tnum">
              {sliderTarget.toFixed(2).replace('.', ',')} €
            </span>
          </div>

          {/* Interactive Range Slider */}
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step="5"
            value={sliderTarget}
            onChange={(e) => setSliderTarget(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />

          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
            <span>{sliderMin} €</span>
            <span>{sliderMax} €</span>
          </div>
        </div>

        {/* Set Target Button */}
        <button
          onClick={handleCreateAlert}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          {alertCreated ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{t("Target price alert set at")} {sliderTarget.toFixed(2).replace('.', ',')} €!</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>{t("Set target price alert (")}{sliderTarget.toFixed(2).replace('.', ',')} €)</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <div className="pb-8 space-y-5" data-testid="history-desktop">
        {bar}
        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-4 min-w-0 [&_.h-48]:h-72">
            {metrics}
            {chart}
          </div>
          <div className="space-y-4">
            {alertCard}
            {verdict}
          </div>
        </div>
        <DemoFootnote />
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-4">
      {bar}
      {metrics}
      {chart}
      {verdict}
      {alertCard}
      <DemoFootnote />
    </div>
  );
};
