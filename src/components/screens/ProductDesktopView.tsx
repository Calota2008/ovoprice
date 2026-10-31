import React, { useMemo, useState } from 'react';
import { ArrowRight, Bell, Bookmark, ExternalLink, LineChart, RefreshCw } from 'lucide-react';
import { Product, StoreOffer } from '../../types';
import { StoresForProduct } from '../StoresForProduct';
import { DemoBadge } from '../DemoBadge';
import { StoreBadge } from '../StoreBadge';
import { Iri } from '../Iri';
import { t, tr } from '../../i18n';

/**
 * Product page for wide screens (PC, 1024 px and up). Phones and tablets keep ProductOverviewScreen's own layout.
 * Everything shown comes from the product (catalog / demo data); nothing is invented here.
 */
interface ProductDesktopViewProps {
  product: Product;
  isSaved: boolean;
  onToggleSave?: () => void;
  onOpenHistory?: () => void;
  onOpenSetAlert?: () => void;
  onRescan: () => void;
  onRedirectStore: (offer: StoreOffer) => void;
  onSelectOffer: (offer: StoreOffer) => void;
  onQuickAlert: (targetPrice: number) => void;
  existingAlertPrice?: number;
}

const AFFILIATE_NOTE = tr(
  'Some links may be affiliate links. OvoPrice may earn a commission from qualifying purchases at no additional cost to you.'
);

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

export const ProductDesktopView: React.FC<ProductDesktopViewProps> = ({
  product,
  isSaved,
  onToggleSave,
  onOpenHistory,
  onOpenSetAlert,
  onRescan,
  onRedirectStore,
  onSelectOffer,
  onQuickAlert,
  existingAlertPrice,
}) => {
  const offers = useMemo(
    () => [...(product.offers || [])].sort((a, b) => a.totalLandedPrice - b.totalLandedPrice),
    [product.offers]
  );
  const best = offers[0];
  const hasAffiliate = offers.some((o) => o.isAffiliate);

  const suggested = existingAlertPrice ?? Math.max(1, Math.floor(product.bestPrice * 0.93));
  const [target, setTarget] = useState(String(suggested).replace('.', ','));
  const targetNumber = Number(target.replace(',', '.'));
  const targetValid = Number.isFinite(targetNumber) && targetNumber > 0;

  /* ----- small price chart from the product's history ----- */
  const history = product.history || [];
  const chart = useMemo(() => {
    if (history.length < 2) return null;
    const prices = history.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const W = 300;
    const H = 110;
    const pts = history.map((h, i) => {
      const x = 12 + (i * (W - 24)) / (history.length - 1);
      const y = 14 + ((max - h.price) * (H - 34)) / span;
      return { x, y, p: h };
    });
    const low = pts.reduce((a, b) => (b.p.price < a.p.price ? b : a));
    return { pts, min, max, low, W, H };
  }, [history]);

  return (
    <div className="space-y-6 pb-4" data-testid="product-desktop">
      {/* ------------------------------ Top: image + summary ------------------------------ */}
      <div className="grid grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-center min-h-[360px]">
          <img
            src={product.image}
            alt={product.title}
            className="max-h-[340px] max-w-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
              {t(product.category)}
            </span>
            <DemoBadge />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-3">{product.title}</h1>
          {product.subtitle && <p className="text-sm text-slate-500 mt-1">{product.subtitle}</p>}

          <dl className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-5 text-sm">
            {[
              [t('Manufacturer'), product.brand],
              [t('Model series'), product.model],
              [t('Color variant'), product.colorVariant],
              [t('EAN / Barcode'), product.ean],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                <dd className="font-semibold text-slate-900 truncate">{value || '–'}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto pt-5 border-t border-slate-100 flex items-end gap-6 flex-wrap">
            <Iri pose="celebrate" motion="bounce" size={110} className="-mb-2 -mr-3" />
            <div>
              <p className="text-xs text-slate-500">
                {t('Best total price')} · {t('{n} stores', { n: offers.length })}
              </p>
              <p className="text-4xl font-black text-emerald-700 tracking-tight tnum" data-testid="desktop-best-price">
                {eur(best ? best.totalLandedPrice : product.bestPrice)}
              </p>
              {best && (
                <p className="text-xs font-semibold text-emerald-700">
                  {best.shippingPrice === 0 ? t('Free delivery') : `${t('Delivery')} ${eur(best.shippingPrice)}`} · {t('at {store}', { store: best.storeName })}
                </p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {onOpenSetAlert && (
                <button
                  onClick={onOpenSetAlert}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4" /> {t('Price alert')}
                </button>
              )}
              {onToggleSave && (
                <button
                  onClick={onToggleSave}
                  aria-pressed={isSaved}
                  className={`h-11 px-4 rounded-xl border text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                    isSaved ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                  {isSaved ? t('Saved') : t('Save')}
                </button>
              )}
              {best && (
                <button
                  onClick={() => onRedirectStore(best)}
                  className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
                >
                  {t('Go to {store}', { store: best.storeName })} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------ Offers table + side column ------------------------------ */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="bg-white rounded-2xl border border-slate-200 overflow-x-auto" aria-labelledby="desktop-offers-title">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <h2 id="desktop-offers-title" className="text-lg font-bold text-slate-900">
              {t('Offer comparison')}
            </h2>
            <DemoBadge />
            <span className="ml-auto text-xs text-slate-500">{t('Sorted by total price')}</span>
          </div>
          {offers.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">{t('No offers available yet')}</p>
          ) : (
            <table className="w-full text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap" data-testid="desktop-offers-table">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 text-left">
                  <th className="px-3 py-2.5 font-bold">{t('Store')}</th>
                  <th className="px-3 py-2.5 font-bold text-right">{t('Price')}</th>
                  <th className="px-3 py-2.5 font-bold text-right">{t('Delivery')}</th>
                  <th className="px-3 py-2.5 font-bold text-right">{t('Total')}</th>
                  <th className="px-3 py-2.5 font-bold">{t('Delivery time')}</th>
                  <th className="px-3 py-2.5" aria-label={t('Actions')} />
                </tr>
              </thead>
              <tbody>
                {offers.map((o, i) => {
                  const isBest = i === 0;
                  const delta = o.totalLandedPrice - offers[0].totalLandedPrice;
                  return (
                    <tr key={o.id} className={`border-t border-slate-100 ${isBest ? 'bg-emerald-50/60' : ''}`}>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectOffer(o)}
                          className="flex items-center gap-2.5 font-semibold text-slate-900 hover:text-emerald-800 cursor-pointer text-left"
                          title={t('Offer details')}
                        >
                          <StoreBadge name={o.storeName} logo={o.storeLogo} />
                          <span className="flex flex-col items-start gap-0.5">
                            <span>{o.storeName}</span>
                            {isBest && (
                              <span className="text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                {t('BEST')}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right tnum">{eur(o.basePrice)}</td>
                      <td className={`px-3 py-3 text-right tnum ${o.shippingPrice === 0 ? 'text-emerald-700 font-semibold' : ''}`}>
                        {o.shippingPrice === 0 ? t('Free') : eur(o.shippingPrice)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-black text-base tnum">{eur(o.totalLandedPrice)}</span>
                        {!isBest && delta > 0 && <span className="block text-[11px] text-slate-500 tnum">+{eur(delta)}</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-500 !whitespace-normal min-w-[120px]">{t(o.deliveryEstimate)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => onRedirectStore(o)}
                          aria-label={t('Go to {store}', { store: o.storeName })}
                          className={`h-9 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                            isBest ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          {t('To the store')} <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-400 space-y-1">
            <p>{t('Prices in euros including VAT, plus delivery where it applies. The price on the store website is the one that counts. Ordered by total price, not by commission.')}</p>
            {hasAffiliate && <p>{t(AFFILIATE_NOTE)}</p>}
          </div>
        </section>

        <aside className="grid grid-cols-2 xl:grid-cols-1 gap-4 items-start">
          {chart && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4" aria-labelledby="desktop-history-title">
              <div className="flex items-center gap-2 mb-2">
                <h2 id="desktop-history-title" className="text-sm font-bold text-slate-900">
                  {t('Price history')}
                </h2>
                <DemoBadge />
              </div>
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-28" role="img" aria-label={t('Price history')}>
                <polyline
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={chart.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                />
                <circle cx={chart.low.x} cy={chart.low.y} r="5" fill="#059669" />
                <text x="12" y="10" fontSize="10" fill="#94a3b8">{eur(chart.max)}</text>
                <text x="12" y={chart.H - 2} fontSize="10" fill="#94a3b8">{t(chart.pts[0].p.date)}</text>
                <text x={chart.W - 12} y={chart.H - 2} fontSize="10" fill="#94a3b8" textAnchor="end">
                  {t(chart.pts[chart.pts.length - 1].p.date)}
                </text>
              </svg>
              <p className="text-xs text-slate-500 mt-1">
                {t('Lowest price in this history:')} <b className="text-emerald-700 tnum">{eur(chart.min)}</b>
              </p>
              {onOpenHistory && (
                <button onClick={onOpenHistory} className="mt-2 text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer">
                  <LineChart className="w-3.5 h-3.5" /> {t('See full history')}
                </button>
              )}
            </section>
          )}

          <section className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4" aria-labelledby="desktop-alert-title">
            <h2 id="desktop-alert-title" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-700" /> {t('Tell me when it drops')}
            </h2>
            <form
              className="flex gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (targetValid) onQuickAlert(Math.round(targetNumber * 100) / 100);
              }}
            >
              <label className="flex-1 h-10 rounded-lg border border-slate-200 bg-white flex items-center px-3 gap-1">
                <span className="sr-only">{t('Target price')}</span>
                <input
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full outline-none font-bold text-slate-900 tnum bg-transparent"
                  data-testid="desktop-alert-input"
                />
                <span className="text-slate-500 font-semibold">€</span>
              </label>
              <button
                type="submit"
                disabled={!targetValid}
                className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold cursor-pointer"
              >
                {existingAlertPrice !== undefined ? t('Update') : t('Set')}
              </button>
            </form>
            <p className="text-[11px] text-slate-600 mt-2">{t('You get a message when the total price falls below your amount.')}</p>
          </section>

          <StoresForProduct product={product} />

          <button
            onClick={onRescan}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t('Not the right product? Refine or scan again')}
          </button>
        </aside>
      </div>
    </div>
  );
};
