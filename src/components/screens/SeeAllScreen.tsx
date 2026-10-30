import React, { useMemo, useState } from 'react';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { PopularSearchItem } from '../../types';
import { DemoBadge } from '../DemoBadge';
import { t } from '../../i18n';

export type SeeAllKind = 'drops' | 'new';
type SortKey = 'discount' | 'lowest' | 'stores' | 'category';

interface SeeAllScreenProps {
  kind: SeeAllKind;
  /** Goes straight to the offers of the product. */
  onCompare: (item: PopularSearchItem) => void;
  /** Opens the product page. */
  onDetails: (item: PopularSearchItem) => void;
}

/**
 * Only for ordering: how big the drop is. "-24%" is read as 24; "SAVE 42€" is turned into a share of the old price.
 * Anything else counts as 0. It is never shown as a number.
 */
export function discountRank(item: { badgeText: string; price: number }): number {
  const pct = item.badgeText.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) return parseFloat(pct[1].replace(',', '.'));
  const save = item.badgeText.match(/(\d+(?:[.,]\d+)?)\s*€/);
  if (save && item.price > 0) {
    const s = parseFloat(save[1].replace(',', '.'));
    return (s / (item.price + s)) * 100;
  }
  return 0;
}

export function sortSeeAll(items: PopularSearchItem[], sort: SortKey): PopularSearchItem[] {
  const copy = [...items];
  switch (sort) {
    case 'discount':
      return copy.sort((a, b) => discountRank(b) - discountRank(a));
    case 'lowest':
      return copy.sort((a, b) => a.price - b.price);
    case 'stores':
      return copy.sort((a, b) => b.storesCount - a.storesCount);
    default:
      return copy.sort((a, b) => a.category.localeCompare(b.category));
  }
}

export const SeeAllScreen: React.FC<SeeAllScreenProps> = ({ kind, onCompare, onDetails }) => {
  const isDrops = kind === 'drops';
  const { data: items } = usePriceData<PopularSearchItem[]>(
    () => (isDrops ? priceProvider.getPriceDrops() : priceProvider.getNewProducts()),
    [kind],
    []
  );
  const sorts: { key: SortKey; label: string }[] = isDrops
    ? [
        { key: 'discount', label: t('Biggest discount') },
        { key: 'lowest', label: t('Lowest price') },
        { key: 'category', label: t('Category') },
      ]
    : [
        { key: 'stores', label: t('Most stores') },
        { key: 'category', label: t('Category') },
      ];
  const [sort, setSort] = useState<SortKey>(isDrops ? 'discount' : 'stores');
  const sorted = useMemo(() => sortSeeAll(items, sort), [items, sort]);
  const heading = isDrops ? t('Price drops') : t('New products');

  return (
    <div className="pb-24 space-y-3" data-testid={isDrops ? 'see-all-drops' : 'see-all-new'}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{heading}</h2>
        <DemoBadge label={t('Example')} />
      </div>

      <div role="group" aria-label={t('Sort by')} className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-none">
        {sorts.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={sort === s.key}
            onClick={() => setSort(s.key)}
            className={`shrink-0 h-9 px-3.5 rounded-full border text-[13px] font-semibold cursor-pointer transition-colors ${
              sort === s.key ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-600">{t('{n} products · example items, not real offers', { n: sorted.length })}</p>

      <ul className="space-y-3">
        {sorted.map((item) => {
          const hasDetails = !!item.productId;
          return (
            <li key={item.id} className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
              <div className="flex gap-3">
                <div className="shrink-0 w-[84px] h-[84px] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                  <img src={item.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 truncate">
                      {t(item.category)} · {item.storesCount} {t('stores')}
                    </span>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                        item.badgeType === 'new' ? 'bg-sky-100 text-sky-900' : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {item.badgeType === 'new' ? t(item.badgeText) : t('Price drop')}
                    </span>
                  </div>
                  <p className="text-[15px] font-bold text-slate-900 leading-tight">{item.title}</p>
                  {item.badgeType !== 'new' && (
                    <>
                      <p className="text-[13px] text-slate-700 tnum">
                        {t('From')} <b className="text-base text-slate-900">{item.price.toFixed(2).replace('.', ',')} €</b>
                      </p>
                      <p className="text-[11px] text-slate-600">{t(item.shippingNote)}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
                <button
                  type="button"
                  disabled={!hasDetails}
                  onClick={() => onCompare(item)}
                  aria-label={`${t('Compare prices')}: ${item.title}`}
                  className="h-11 rounded-xl bg-emerald-700 text-white text-sm font-bold cursor-pointer hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {t('Compare prices')}
                </button>
                <button
                  type="button"
                  disabled={!hasDetails}
                  onClick={() => onDetails(item)}
                  aria-label={`${t('Details')}: ${item.title}`}
                  className="h-11 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold cursor-pointer hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {t('Details')}
                </button>
              </div>
              {!hasDetails && <p className="text-[11px] text-slate-600">{t('Details are not available for this example yet.')}</p>}
            </li>
          );
        })}
      </ul>

      <p className="text-center text-[11px] text-slate-600 leading-snug">
        {t("Demo data. Always check the final price on the merchant's website.")}
      </p>
    </div>
  );
};
