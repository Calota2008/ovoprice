const KEY = 'ovoprice_recent_searches_v1';
const MAX = 8;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const q = query.trim();
  if (q.length < 2) return loadRecentSearches();
  const next = [q, ...loadRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage indisponibil */
  }
  return next;
}

export function clearRecentSearches(): string[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function removeRecentSearch(query: string): string[] {
  const next = loadRecentSearches().filter((x) => x !== query);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
