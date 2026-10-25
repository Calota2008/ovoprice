import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowUpDown, Check, ChevronRight, Clock, Trash2, Truck, Barcode, Camera, SearchX } from 'lucide-react';
import { Product, PopularSearchItem } from '../../types';
import { priceProvider } from '../../services/priceProvider';
import { usePriceData } from '../../services/usePriceData';
import { DemoBadge, DemoFootnote } from '../DemoBadge';
import {
  clearRecentSearches,
  loadRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from '../../utils/recentSearches';

interface SearchScreenProps {
  onOpenProduct: (product: Product) => void;
  onOpenVisualMatcher: (tab?: 'link' | 'photo' | 'barcode') => void;
}

const fmt = (n: number) => n.toFixed(2).replace('.', ',');
const savingsPct = (p: Product) => (p.msrp && p.msrp > p.bestPrice ? ((p.msrp - p.bestPrice) / p.msrp) * 100 : 0);

export const SearchScreen: React.FC<SearchScreenProps> = ({ onOpenProduct, onOpenVisualMatcher }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'freeShipping'>('all');
  const [sortBy, setSortBy] = useState<'lowest' | 'savings'>('lowest');
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: popular } = usePriceData<PopularSearchItem[]>(() => priceProvider.getPopularSearches(), [], []);

  useEffect(() => {
    inputRef.current?.focus();
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
          setError('Căutarea nu a reușit. Încearcă din nou.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const visible = useMemo(() => {
    const filtered =
      filter === 'freeShipping' ? results.filter((p) => p.offers.some((o) => o.shippingPrice === 0)) : results;
    return [...filtered].sort((a, b) =>
      sortBy === 'lowest' ? a.bestPrice - b.bestPrice : savingsPct(b) - savingsPct(a)
    );
  }, [results, filter, sortBy]);

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
              placeholder="Produs, model sau cod EAN…"
              aria-label="Caută produs"
              className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
            />
          </div>
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              aria-label="Șterge căutarea"
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
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Căutări recente</h4>
                <button
                  onClick={() => setRecent(clearRecentSearches())}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Șterge tot
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
                      aria-label={`Șterge ${r}`}
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
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Căutări populare</h4>
                <DemoBadge label="Exemple" />
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
              <Barcode className="w-4 h-4 text-purple-600" /> Scanează cod de bare
            </button>
            <button
              onClick={() => onOpenVisualMatcher('photo')}
              className="py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-blue-600" /> Caută după poză
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <>
          {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}

          {!error && !loading && results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    <strong>
                      {visible.length} {visible.length === 1 ? 'produs' : 'produse'}
                    </strong>{' '}
                    găsite
                  </span>
                </div>
                <button
                  onClick={() => setSortBy(sortBy === 'lowest' ? 'savings' : 'lowest')}
                  className="flex items-center gap-1 font-bold text-slate-800 uppercase tracking-tight hover:text-emerald-700 cursor-pointer"
                >
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  <span>{sortBy === 'lowest' ? 'Preț mic' : 'Reducere mare'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'all', label: `Toate (${results.length})` },
                    { id: 'freeShipping', label: `Transport gratuit (${freeShippingCount})` },
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
                <p className="text-xs text-slate-500 text-center py-4">Niciun produs nu se potrivește cu filtrul ales.</p>
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
                          <span className="font-bold text-slate-900 tnum">de la {fmt(p.bestPrice)} €</span>
                          {pct >= 1 && <span className="text-rose-600 font-semibold">-{pct.toFixed(0)}% vs. preț recomandat</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3 text-slate-400" />
                          {p.offers.length} oferte de exemplu
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
                <p className="text-sm font-bold text-slate-900">Niciun rezultat pentru „{debounced}”</p>
                <p className="text-xs text-slate-500 mt-1">
                  Verifică ortografia sau încearcă brandul și modelul. {priceProvider.isDemo && 'Catalogul demo conține doar 5 produse.'}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => onOpenVisualMatcher('barcode')}
                  className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Scanează cod de bare
                </button>
                <button
                  onClick={() => onOpenVisualMatcher('photo')}
                  className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Caută după poză
                </button>
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-slate-500 text-center py-4">Se caută…</p>}
        </>
      )}

      <DemoFootnote className="pt-2" />
    </div>
  );
};
