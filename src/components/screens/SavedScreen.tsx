import React, { useState } from 'react';
import {
  TrendingDown,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Bookmark,
  Trash2,
  Sparkles,
  FolderPlus,
  FolderOpen,
  Pencil,
} from 'lucide-react';
import { SavedProductItem } from '../../types';
import {
  COLLECTION_LIMITS,
  Collection,
  NAME_MESSAGES,
  explainCollectionName,
} from '../../utils/collections';

interface SavedScreenProps {
  items: SavedProductItem[];
  onSelectSavedItem: (item: SavedProductItem) => void;
  onQuickAlert: () => void;
  onRemoveSavedItem?: (id: string) => void;
  onDiscover?: () => void;
  collections?: Collection[];
  onCreateCollection?: (name: string) => void;
  onRenameCollection?: (id: string, name: string) => void;
  onDeleteCollection?: (id: string) => void;
  onToggleInCollection?: (collectionId: string, productId: string) => void;
}

const chipClass = (active: boolean) =>
  `shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
    active
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
  }`;

export const SavedScreen: React.FC<SavedScreenProps> = ({
  items,
  onSelectSavedItem,
  onQuickAlert,
  onRemoveSavedItem,
  onDiscover,
  collections = [],
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onToggleInCollection,
}) => {
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openPanelFor, setOpenPanelFor] = useState<string | null>(null);

  const activeCollection = collections.find((c) => c.id === activeCollectionId) ?? null;
  const visibleItems = activeCollection
    ? items.filter((i) => activeCollection.productIds.includes(i.productId ?? i.id))
    : items;
  const totalDrop = visibleItems.reduce((acc, item) => acc + (item.dropAmount || 0), 0);
  const canManageCollections = !!onCreateCollection && items.length > 0;

  const resetNameForm = () => {
    setCreating(false);
    setRenaming(false);
    setNameDraft('');
    setNameError(null);
  };

  const selectCollection = (id: string | null) => {
    setActiveCollectionId(id);
    setConfirmDelete(false);
    resetNameForm();
  };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = explainCollectionName(nameDraft, collections, renaming ? activeCollection?.id : undefined, creating);
    if (problem) {
      setNameError(NAME_MESSAGES[problem]);
      return;
    }
    if (creating) onCreateCollection?.(nameDraft.trim());
    else if (renaming && activeCollection) onRenameCollection?.(activeCollection.id, nameDraft.trim());
    resetNameForm();
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Title & tracked count */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved products</h1>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-[11px] font-bold ${
              items.length > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            {items.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            <span>
              {items.length} {items.length === 1 ? 'product' : 'products'}
            </span>
          </span>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Saved on this device · demo prices</span>
        </p>
      </div>

      {/* Collections bar */}
      {canManageCollections && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Collections">
            <button role="tab" aria-selected={activeCollectionId === null} onClick={() => selectCollection(null)} className={chipClass(activeCollectionId === null)}>
              All ({items.length})
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={activeCollectionId === c.id}
                onClick={() => selectCollection(c.id)}
                className={chipClass(activeCollectionId === c.id)}
              >
                {c.name} ({items.filter((i) => c.productIds.includes(i.productId ?? i.id)).length})
              </button>
            ))}
            {collections.length < COLLECTION_LIMITS.maxCollections && (
              <button
                onClick={() => {
                  resetNameForm();
                  setCreating(true);
                }}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-slate-400 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" /> New collection
              </button>
            )}
          </div>

          {(creating || renaming) && (
            <form onSubmit={submitName} className="flex flex-wrap items-start gap-2" noValidate>
              <div className="flex-1 min-w-[160px]">
                <input
                  aria-label="Collection name"
                  value={nameDraft}
                  maxLength={COLLECTION_LIMITS.maxNameLength}
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="e.g. Wishlist"
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:border-slate-500"
                />
                {nameError && (
                  <p className="text-[11px] text-red-600 mt-1" role="alert">
                    {nameError}
                  </p>
                )}
              </div>
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer">
                {creating ? 'Create' : 'Save name'}
              </button>
              <button type="button" onClick={resetNameForm} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 cursor-pointer">
                Cancel
              </button>
            </form>
          )}

          {activeCollection && !creating && !renaming && (
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => {
                  setRenaming(true);
                  setNameDraft(activeCollection.name);
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
              <button
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  onDeleteCollection?.(activeCollection.id);
                  selectCollection(null);
                }}
                className={`flex items-center gap-1 font-semibold cursor-pointer ${
                  confirmDelete ? 'text-red-700' : 'text-slate-600 hover:text-red-600'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" /> {confirmDelete ? 'Confirm delete collection' : 'Delete collection'}
              </button>
              {confirmDelete && <span className="text-slate-500">Products stay saved.</span>}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6 stroke-[1.7]" />
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h2 className="text-base font-bold text-slate-900">You haven't saved any products yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Save products from their detail page or from Reels to find them easily and track their price.
            </p>
          </div>
          {onDiscover && (
            <button
              onClick={onDiscover}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Discover products in Reels</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {totalDrop > 0 && (
            <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Drops since you saved</h3>
                  <p className="text-[11px] text-slate-600">
                    Total difference (demo data):{' '}
                    <strong className="text-emerald-800 font-bold">{totalDrop.toFixed(2).replace('.', ',')} €</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={onQuickAlert}
                className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-md shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                Alerts
              </button>
            </div>
          )}

          {visibleItems.length === 0 && activeCollection && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
              No products in this collection yet. Use "Collections" on a saved product to add it here.
            </div>
          )}

          <div className="space-y-3">
            {visibleItems.map((item) => {
              const isTargetReached = item.isTargetReached;
              const productKey = item.productId ?? item.id;
              const inCollections = collections.filter((c) => c.productIds.includes(productKey));

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border p-4 transition-all relative ${
                    isTargetReached ? 'border-emerald-300 shadow-xs' : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {isTargetReached && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md mb-2 border border-emerald-200 w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>TARGET REACHED</span>
                    </div>
                  )}

                  <div className="flex gap-3.5 items-start">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{item.title}</h3>
                        {onRemoveSavedItem && (
                          <button
                            onClick={() => onRemoveSavedItem(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                            aria-label="Remove from saved"
                            title="Remove from saved"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{item.storeName}</span>
                        {item.statusText && <span> · {item.statusText}</span>}
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

                      {inCollections.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                          In: {inCollections.map((c) => c.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {openPanelFor === item.id && (
                    <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5" role="group" aria-label={`Collections for ${item.title}`}>
                      {collections.length === 0 ? (
                        <p className="text-[11px] text-slate-500">Create a collection first (New collection above).</p>
                      ) : (
                        collections.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.productIds.includes(productKey)}
                              onChange={() => onToggleInCollection?.(c.id, productKey)}
                            />
                            {c.name}
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.dropAmount ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <TrendingDown className="w-3 h-3 text-emerald-600" />
                          <span>
                            ↓ {item.dropAmount.toFixed(2).replace('.', ',')} € {item.dropPercent ? `(-${item.dropPercent}%)` : ''}
                          </span>
                        </span>
                      ) : item.statusBadge ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span>— {item.statusBadge}</span>
                        </span>
                      ) : null}
                      {onToggleInCollection && (
                        <button
                          onClick={() => setOpenPanelFor(openPanelFor === item.id ? null : item.id)}
                          aria-expanded={openPanelFor === item.id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Collections
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectSavedItem(item)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      <span>View product</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-100/90 rounded-xl p-3.5 border border-slate-200 text-center">
            <p className="text-xs text-slate-600 leading-relaxed">Demo data · prices refresh when you open the app</p>
          </div>
        </>
      )}
    </div>
  );
};
