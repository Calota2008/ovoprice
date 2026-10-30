import React, { useEffect, useState } from 'react';
import { BookmarkPlus, Share2 } from 'lucide-react';
import { t } from '../../i18n';
import { priceProvider } from '../../services/priceProvider';
import { DemoBadge } from '../DemoBadge';
import type { Product } from '../../types';
import type { SharedList } from '../../utils/shareList';

interface Props {
  list: SharedList;
  savedIds: string[];
  onOpenProduct: (productId: string) => void;
  onSaveProducts: (products: Product[]) => void;
}

export const SharedListScreen: React.FC<Props> = ({ list, savedIds, onOpenProduct, onSaveProducts }) => {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [missing, setMissing] = useState(0);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProducts(null);
    Promise.all(list.productIds.map((id) => priceProvider.getProductById(id).catch(() => null))).then((found) => {
      if (cancelled) return;
      const ok = found.filter((p): p is Product => !!p);
      setProducts(ok);
      setMissing(found.length - ok.length);
    });
    return () => {
      cancelled = true;
    };
  }, [list]);

  const toSave = (products ?? []).filter((p) => !savedIds.includes(p.id));

  return (
    <div className="pb-8 space-y-4" data-testid="shared-list">
      <header className="pt-1">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          <Share2 className="w-3.5 h-3.5" /> {t('Shared with you')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 break-words">{list.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t('Products: {n}', { n: list.productIds.length })}</p>
      </header>

      {products === null ? (
        <p role="status" className="text-sm text-slate-500">{t('Loading the list…')}</p>
      ) : (
        <>
          {missing > 0 && (
            <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {t('{n} products from this list are no longer available.', { n: missing })}
            </p>
          )}

          {products.length > 0 && (
            <>
              <ul className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3" data-testid="shared-list-items">
                {products.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProduct(p.id)}
                      className="w-full flex gap-3.5 items-center text-left bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-emerald-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600"
                    >
                      <span className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={p.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 truncate">{p.title}</span>
                        <span className="flex items-baseline gap-2 mt-1">
                          <span className="text-base font-extrabold text-slate-900 tnum">{p.bestPrice.toFixed(2).replace('.', ',')} €</span>
                          <DemoBadge />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {toSave.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onSaveProducts(toSave);
                    setSavedCount(toSave.length);
                  }}
                  className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookmarkPlus className="w-4 h-4" /> {t('Save all to my products')}
                </button>
              ) : (
                <p role="status" className="text-xs text-slate-600 text-center">{t('All of these are already saved.')}</p>
              )}
              {savedCount !== null && (
                <p role="status" className="text-xs font-medium text-emerald-800 text-center">{t('Saved: {n}', { n: savedCount })}</p>
              )}
            </>
          )}

          <p className="text-[11px] leading-relaxed text-slate-500">
            {t('Prices are current, not from the moment the list was shared. Anyone with the link can see this list.')}
          </p>
        </>
      )}
    </div>
  );
};
