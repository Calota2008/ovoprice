import React from 'react';
import {
  TrendingDown,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Bookmark,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SavedProductItem } from '../../types';

interface SavedScreenProps {
  items: SavedProductItem[];
  onSelectSavedItem: (item: SavedProductItem) => void;
  onQuickAlert: () => void;
  onRemoveSavedItem?: (id: string) => void;
  onDiscover?: () => void;
}

export const SavedScreen: React.FC<SavedScreenProps> = ({
  items,
  onSelectSavedItem,
  onQuickAlert,
  onRemoveSavedItem,
  onDiscover,
}) => {
  const totalDrop = items.reduce((acc, item) => acc + (item.dropAmount || 0), 0);

  return (
    <div className="pb-8 space-y-4">
      {/* Title & Tracked Count */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Produse salvate
          </h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-[11px] font-bold ${
            items.length > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {items.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            <span>{items.length} {items.length === 1 ? 'produs' : 'produse'}</span>
          </span>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Salvate pe acest dispozitiv · prețuri de exemplu</span>
        </p>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6 stroke-[1.7]" />
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              Nu ai salvat încă niciun produs
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Salvează produse din pagina lor de detalii sau din Reels ca să le regăsești ușor și să le urmărești prețul.
            </p>
          </div>
          {onDiscover && (
            <button
              onClick={onDiscover}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descoperă produse în Reels</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Scăderi față de momentul salvării Banner */}
          {totalDrop > 0 && (
            <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Scăderi față de momentul salvării
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Diferență totală (date demo): <strong className="text-emerald-800 font-bold">{totalDrop.toFixed(2).replace('.', ',')} €</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={onQuickAlert}
                className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-md shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                Alerte
              </button>
            </div>
          )}

          {/* Produse salvate List */}
          <div className="space-y-3">
            {items.map((item) => {
              const isTargetReached = item.isTargetReached;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border p-4 transition-all relative ${
                    isTargetReached
                      ? 'border-emerald-300 shadow-xs'
                      : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Optional Target Price Reached Top Tag */}
                  {isTargetReached && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md mb-2 border border-emerald-200 w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>ȚINTA ATINSĂ</span>
                    </div>
                  )}

                  {/* Main product row */}
                  <div className="flex gap-3.5 items-start">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {item.title}
                        </h3>
                        {onRemoveSavedItem && (
                          <button
                            onClick={() => onRemoveSavedItem(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                            aria-label="Șterge din salvate"
                            title="Șterge din salvate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{item.storeName}</span>
                        {item.statusText && (
                          <span> · {item.statusText}</span>
                        )}
                      </p>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-extrabold text-slate-900 tracking-tight tnum">
                          {item.currentPrice.toFixed(2).replace('.', ',')} €
                        </span>
                        {item.previousPrice && (
                          <span className="text-xs text-slate-400 line-through tnum">
                            {item.previousPrice.toFixed(2).replace('.', ',')} €
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Drop pill + View offer button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {item.dropAmount ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <TrendingDown className="w-3 h-3 text-emerald-600" />
                          <span>
                            ↓ {item.dropAmount.toFixed(2).replace('.', ',')} €{' '}
                            {item.dropPercent ? `(-${item.dropPercent}%)` : ''}
                          </span>
                        </span>
                      ) : item.statusBadge ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span>— {item.statusBadge}</span>
                        </span>
                      ) : null}
                    </div>

                    <button
                      onClick={() => onSelectSavedItem(item)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Vezi produsul</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Notice Box */}
          <div className="bg-slate-100/90 rounded-xl p-3.5 border border-slate-200 text-center">
            <p className="text-xs text-slate-600 leading-relaxed">
              Date demonstrative · prețurile se actualizează când deschizi aplicația
            </p>
          </div>
        </>
      )}
    </div>
  );
};
