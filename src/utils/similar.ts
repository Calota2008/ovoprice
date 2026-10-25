/** Similar products = other catalog products in the same category. No invented data; empty when none. */
export interface SimilarCandidate {
  id: string;
  category?: string;
}

export function findSimilar<T extends SimilarCandidate>(catalog: T[], product: SimilarCandidate, limit = 3): T[] {
  if (!product.category) return [];
  const cat = product.category.trim().toLowerCase();
  return catalog
    .filter((p) => p.id !== product.id && (p.category ?? '').trim().toLowerCase() === cat)
    .slice(0, limit);
}
