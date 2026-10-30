import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowUpDown, Check, ChevronRight, Clock, Trash2, Truck, Barcode, Camera, SearchX } from 'lucide-react';
import { Product, PopularSearchItem } from '../../types';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { DemoBadge, DemoFootnote } from '../DemoBadge';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import {
  clearRecentSearches,
  loadRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from '../../utils/recentSearches';

import { t } from '../../i18n';
interface SearchScreenProps {
  onOpenProduct: (product: Product) => void;
  onOpenVisualMatcher: (tab?: 'link' | 'photo' | 'barcode') => void;
  /** Text to search for when the screen opens (for example from voice search). */
  initialQuery?: string;
}

const fmt = (n: number) => n.toFixed(2).replace('.', ',');
/** "AUDIO & KOPFHÖRER" -> "Audio & kopfhörer" (category names come in capitals). */
const sentence = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v);
const savingsPct = (p: Product) => (p.msrp && p.msrp > p.bestPrice ? ((p.msrp - p.bestPrice) / p.msrp) * 100 : 0);

export const SearchScreen: React.FC<SearchScreenProps> = ({ onOpenProduct, onOpenVisualMatcher, initialQuery }) => {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [debounced, setDebounced] = useState((initialQuery ?? '').trim());
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'freeShipping'>('all');
  const [sortBy, setSortBy] = useState<'lowest' | 'savings'>('lowest');
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();
  // PC-only filters (sidebar). Empty = no filtering, so phones are not affected.
  const [cats, setCats] = useState<string[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const { data: popular } = usePriceData<PopularSearchItem[]>(() => priceProvider.getPopularSearches(), [], []);

  // Phones and tablets: open the keyboard right away. On a computer the field is
  // not focused automatically, and not when we arrive with a spoken search.
  useEffect(() => {
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (touch && !initialQuery) inputRef.current?.focus();
  }, []);

  // Debounce typing
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  // Real search through the price provider (cancels stale responses)
  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    priceProvider
      .searchProducts(debounced)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Search failed', err);
        if (!cancelled) {
          setError(t('The search failed. Try again.'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // New results: drop sidebar choices that no longer exist in them.
  useEffect(() => {
    setCats((prev) => prev.filter((c) => results.some((p) => p.category === c)));
    setStores((prev) => prev.filter((st) => results.some((p) => p.offers.some((o) => o.storeName === st))));
  }, [results]);

  const facets = useMemo(() => {
    const catList = Array.from(new Set(results.map((p) => p.category)));
    const storeList = Array.from(new Set(results.flatMap((p) => p.offers.map((o) => o.storeName)))).sort((a, b) =>
      a.localeCompare(b)
    );
    return { catList, storeList };
  }, [results]);

  const parsePrice = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return v.trim() && Number.isFinite(n) ? n : null;
  };
  const minP = parsePrice(minPrice);
  const maxP = parsePrice(maxPrice);
  const sideFiltersActive = cats.length > 0 || stores.length > 0 || minP !== null || maxP !== null;

  const visible = useMemo(() => {
    let filtered =
      filter === 'freeShipping' ? results.filter((p) => p.offers.some((o) => o.shippingPrice === 0)) : results;
    if (cats.length) filtered = filtered.filter((p) => cats.includes(p.category));
    if (stores.length) filtered = filtered.filter((p) => p.offers.some((o) => stores.includes(o.storeName)));
    if (minP !== null) filtered = filtered.filter((p) => p.bestPrice >= minP);
    if (maxP !== null) filtered = filtered.filter((p) => p.bestPrice <= maxP);
    return [...filtered].sort((a, b) =>
      sortBy === 'lowest' ? a.bestPrice - b.bestPrice : savingsPct(b) - savingsPct(a)
    );
  }, [results, filter, sortBy, cats, stores, minP, maxP]);

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const clearSideFilters = () => {
    setCats([]);
    setStores([]);
    setMinPrice('');
    setMaxPrice('');
    setFilter('all');
  };

  const freeShippingCount = results.filter((p) => p.offers.some((o) => o.shippingPrice === 0)).length;
  const hasQuery = debounced.length > 0;

  const open = (product: Product) => {
    setRecent(saveRecentSearch(query || product.title));
    onOpenProduct(product);
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Search input */}
      <div className="pt-1">
        <div className="bg-white border-2 border-slate-900 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Product, model or EAN code…")}
              aria-label={t("Search product")}
              className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              aria-label={t("Clear search")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Idle state: recent + popular */}
      {!hasQuery && (
        <div className="space-y-4">
          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t("Recent searches")}</h4>
                <button
                  onClick={() => setRecent(clearRecentSearches())}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> {t("Clear all")}
                </button>
              </div>
              <div className="space-y-1">
                {recent.map((r) => (
                  <div key={r} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <button onClick={() => setQuery(r)} className="flex-1 text-left text-sm text-slate-800 truncate cursor-pointer">
                      {r}
                    </button>
                    <button
                      onClick={() => setRecent(removeRecentSearch(r))}
                      aria-label={t('Remove {item}', { item: r })}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {popular.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t("Popular searches")}</h4>
                <DemoBadge label={t("Example")} />
              </div>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setQuery(p.title)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-full cursor-pointer"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenVisualMatcher('barcode')}
              className="py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Barcode className="w-4 h-4 text-purple-600" /> {t("Scan barcode")}
            </button>
            <button
              onClick={() => onOpenVisualMatcher('photo')}
              className="py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-blue-600" /> {t("Search by photo")}
            </button>
          </div>
        </div>
      )}

      {/* Results on PC: filters on the left, products in a grid */}
      {hasQuery && isDesktop && !error && !loading && results.length > 0 && (
        <div className="grid grid-cols-[250px_minmax(0,1fr)] gap-6 items-start" data-testid="search-desktop">
          <aside className="bg-white rounded-2xl border border-slate-200 p-4 space-y-5" aria-label={t('Filters')}>
            <fieldset>
              <legend className="text-sm font-bold text-slate-900 mb-2">{t('Category')}</legend>
              {facets.catList.map((c) => (
                <label key={c} className="flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={cats.includes(c)} onChange={() => setCats((prev) => toggle(prev, c))} />
                  <span className="truncate min-w-0" title={sentence(t(c))}>{sentence(t(c))}</span>
                  <span className="ml-auto text-xs text-slate-400">{results.filter((p) => p.category === c).length}</span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-bold text-slate-900 mb-2">{t('Price')}</legend>
              <div className="flex gap-2">
                <input inputMode="decimal" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={t('min €')} aria-label={t('Minimum price')} className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm" />
                <input inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={t('max €')} aria-label={t('Maximum price')} className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-sm" />
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-bold text-slate-900 mb-2">{t('Delivery')}</legend>
              <label className="flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={filter === 'freeShipping'} onChange={() => setFilter(filter === 'freeShipping' ? 'all' : 'freeShipping')} />
                {t('Free shipping only')}
              </label>
            </fieldset>
            {facets.storeList.length > 0 && (
              <fieldset>
                <legend className="text-sm font-bold text-slate-900 mb-2">{t('Store')}</legend>
                {facets.storeList.map((st) => (
                  <label key={st} className="flex items-center gap-2 py-1 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={stores.includes(st)} onChange={() => setStores((prev) => toggle(prev, st))} />
                    <span className="truncate">{st}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {(sideFiltersActive || filter !== 'all') && (
              <button onClick={clearSideFilters} className="text-sm font-bold text-emerald-700 hover:underline cursor-pointer">
                {t('Clear filters')}
              </button>
            )}
          </aside>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {visible.length} {visible.length === 1 ? t('product') : t('products')} {t('found')}
              </h2>
              <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <span className="sr-only">{t('Sort')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'lowest' | 'savings')}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800 cursor-pointer"
                  aria-label={t('Sort')}
                >
                  <option value="lowest">{t('Lowest price')}</option>
                  <option value="savings">{t('Biggest discount')}</option>
                </select>
              </label>
              <button onClick={() => onOpenVisualMatcher('photo')} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <Camera className="w-4 h-4 text-blue-600" /> {t('Search by photo')}
              </button>
              <button onClick={() => onOpenVisualMatcher('barcode')} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <Barcode className="w-4 h-4 text-purple-600" /> {t('Scan barcode')}
              </button>
            </div>
            {visible.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">{t('No products match the selected filter.')}</p>
            ) : (
              <ul className="grid grid-cols-3 gap-4" data-testid="search-desktop-grid">
                {visible.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => open(p)}
                      className="w-full h-full text-left bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm p-3 flex flex-col cursor-pointer"
                    >
                      <div className="h-40 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                        <img src={p.image} alt={p.title} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{p.brand}</span>
                        <DemoBadge />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">{p.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.offers.length} {t('demo offers')}
                      </p>
                      <p className="mt-auto pt-2">
                        <span className="text-xs text-slate-500">{t('from')} </span>
                        <span className="text-xl font-black text-emerald-700 tnum">{fmt(p.bestPrice)} €</span>
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {hasQuery && !(isDesktop && !error && !loading && results.length > 0) && (
        <>
          {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}

          {!error && !loading && results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    <strong>
                      {visible.length} {visible.length === 1 ? t("product") : t("products")}
                    </strong>{' '}
                    {t("found")}
                  </span>
                </div>
                <button
                  onClick={() => setSortBy(sortBy === 'lowest' ? 'savings' : 'lowest')}
                  className="flex items-center gap-1 font-bold text-slate-800 uppercase tracking-tight hover:text-emerald-700 cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  <span>{sortBy === 'lowest' ? t("Lowest price") : t("Biggest discount")}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'all', label: `${t('All')} (${results.length})` },
                    { id: 'freeShipping', label: `${t('Free shipping')} (${freeShippingCount})` },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      filter === chip.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {visible.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">{t("No products match the selected filter.")}</p>
              )}

              <div className="space-y-2.5">
                {visible.map((p) => {
                  const pct = savingsPct(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => open(p)}
                      className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-3 shadow-2xs flex gap-3 items-center cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{p.brand}</span>
                          <DemoBadge />
                        </div>
                        <h5 className="text-sm font-bold text-slate-900 truncate">{p.title}</h5>
                        <p className="text-[11px] text-slate-500 truncate">{p.subtitle}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900 tnum">{t("from")} {fmt(p.bestPrice)} €</span>
                          {pct >= 1 && <span className="text-rose-600 font-semibold">-{pct.toFixed(0)}{t("% vs. list price")}</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3 text-slate-400" />
                          {p.offers.length} {t("demo offers")}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!error && !loading && results.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <SearchX className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-900">{t("No results for “")}{debounced}”</p>
                <p className="text-xs text-slate-500 mt-1">
                  {t("Check the spelling or try the brand and model.")} {priceProvider.isDemo && t("The demo catalog contains only 5 products.")}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => onOpenVisualMatcher('barcode')}
                  className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {t("Scan barcode")}
                </button>
                <button
                  onClick={() => onOpenVisualMatcher('photo')}
                  className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {t("Search by photo")}
                </button>
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-slate-500 text-center py-4">{t("Searching…")}</p>}
        </>
      )}

      <DemoFootnote className="pt-2" />
    </div>
  );
};
