/** Saved-product collections ("Wishlist", "Gifts"...). Stored locally, referencing products by id. */

export const COLLECTIONS_KEY = 'ovoprice_collections_v1';

export const COLLECTION_LIMITS = { maxCollections: 10, maxNameLength: 30 } as const;

export interface Collection {
  id: string;
  name: string;
  productIds: string[];
}

export function validateCollections(value: unknown): Collection[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const result: Collection[] = [];
  for (const v of value) {
    if (!v || typeof v !== 'object') continue;
    const c = v as Partial<Collection>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim()) continue;
    if (!Array.isArray(c.productIds) || seen.has(c.id)) continue;
    seen.add(c.id);
    result.push({
      id: c.id,
      name: c.name.trim().slice(0, COLLECTION_LIMITS.maxNameLength),
      productIds: Array.from(new Set(c.productIds.filter((p): p is string => typeof p === 'string'))),
    });
  }
  return result.slice(0, COLLECTION_LIMITS.maxCollections);
}

export type NameProblem = 'empty' | 'too-long' | 'duplicate' | 'limit';

/** Why a collection name cannot be used (or null when it can). `ignoreId` allows renaming to the same name. */
export function explainCollectionName(
  name: string,
  collections: Collection[],
  ignoreId?: string,
  isNew = false
): NameProblem | null {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length > COLLECTION_LIMITS.maxNameLength) return 'too-long';
  if (collections.some((c) => c.id !== ignoreId && c.name.toLowerCase() === trimmed.toLowerCase())) return 'duplicate';
  if (isNew && collections.length >= COLLECTION_LIMITS.maxCollections) return 'limit';
  return null;
}

export const NAME_MESSAGES: Record<NameProblem, string> = {
  empty: 'Enter a name.',
  'too-long': `Use at most ${COLLECTION_LIMITS.maxNameLength} characters.`,
  duplicate: 'A collection with this name already exists.',
  limit: `You can have up to ${COLLECTION_LIMITS.maxCollections} collections.`,
};

export function newCollectionId(): string {
  return `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function toggleInCollection(collections: Collection[], collectionId: string, productId: string): Collection[] {
  return collections.map((c) =>
    c.id !== collectionId
      ? c
      : {
          ...c,
          productIds: c.productIds.includes(productId)
            ? c.productIds.filter((p) => p !== productId)
            : [...c.productIds, productId],
        }
  );
}

/** Drops product ids that are no longer saved. Returns the same array when nothing changed. */
export function pruneCollections(collections: Collection[], savedProductIds: string[]): Collection[] {
  const saved = new Set(savedProductIds);
  let changed = false;
  const next = collections.map((c) => {
    const kept = c.productIds.filter((p) => saved.has(p));
    if (kept.length !== c.productIds.length) changed = true;
    return kept.length === c.productIds.length ? c : { ...c, productIds: kept };
  });
  return changed ? next : collections;
}
