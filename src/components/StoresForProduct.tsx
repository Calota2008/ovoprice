import React, { useMemo } from 'react';
import { ExternalLink, Store } from 'lucide-react';
import { t, useLanguage } from '../i18n';
import { countryName, useCountry } from '../i18n/country';
import { storesForProduct } from '../utils/storesForProduct';
import { isSafeHttpUrl } from '../utils/url';

/**
 * Shops in the person's country that usually sell this KIND of product (an electronics product lists
 * electronics shops, not furniture shops or supermarkets). These are places to look, never prices.
 */
export const StoresForProduct: React.FC<{ product: { category: string; title: string } }> = ({ product }) => {
  const country = useCountry();
  const lang = useLanguage();
  const { matched, stores } = useMemo(() => storesForProduct(product, country), [product, country]);
  const safe = stores.filter((s) => isSafeHttpUrl(s.url));
  if (safe.length === 0) return null;

  return (
    <section aria-labelledby="stores-for-product" data-testid="stores-for-product" className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div>
        <h2 id="stores-for-product" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Store className="w-4 h-4 text-emerald-700" />
          {t('Where to look')}
        </h2>
        <p className="text-[11px] text-slate-600 leading-snug mt-1">
          {matched
            ? t('Stores in {country} that usually sell this kind of product. These are search links, not prices.', { country: countryName(country, lang) })
            : t('We could not tell which kinds of stores sell this product, so only general online stores in {country} are shown. These are search links, not prices.', { country: countryName(country, lang) })}
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {safe.map((s) => (
          <li key={s.key}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 py-2.5 text-slate-800 hover:text-emerald-800"
              aria-label={t('Search at {store} (opens in a new tab)', { store: s.name })}
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold truncate">{s.name}</span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {s.domain}
                  {!s.ownSearch && ` · ${t('via web search')}`}
                </span>
              </span>
              <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
