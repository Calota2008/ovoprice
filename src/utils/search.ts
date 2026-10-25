import { Product } from '../types';

/** minuscule, fără diacritice, doar litere/cifre separate prin spațiu */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const compact = (s: string) => s.replace(/\s+/g, '');

/**
 * Scor de potrivire (0 = nicio potrivire). Toți termenii interogării trebuie
 * să apară în produs (titlu, brand, model, categorie, subtitlu, EAN). Merge și
 * pentru "xm5" sau "wh1000xm5" față de "WH-1000XM5".
 */
export function scoreProduct(product: Product, query: string): number {
  const q = normalizeText(query);
  if (!q) return 0;
  // EAN: doar la căutări de cifre suficient de lungi, ca „55” să nu se potrivească cu coduri
  const digits = q.replace(/\s/g, '');
  if (/^\d{8,14}$/.test(digits)) return product.ean.includes(digits) ? 10 : 0;
  const tokens = q.split(' ');
  const title = normalizeText(product.title);
  const brand = normalizeText(product.brand);
  const haystack = normalizeText(
    [product.title, product.brand, product.model, product.category, product.subtitle].join(' ')
  );
  const haystackCompact = compact(haystack);

  let score = 0;
  for (const t of tokens) {
    if (haystack.includes(t) || haystackCompact.includes(compact(t))) {
      score += 1;
      if (title.includes(t)) score += 2;
      if (brand === t) score += 2;
    } else {
      return 0;
    }
  }
  if (title.startsWith(q)) score += 3;
  return score;
}

export function searchCatalog(products: Product[], query: string): Product[] {
  return products
    .map((p) => ({ p, s: scoreProduct(p, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

/**
 * Potrivire după numele din adresa unui link. Mai tolerantă decât căutarea
 * (adresele au termeni în plus: culoare, "kaufen" etc.), dar cere brandul și
 * cel puțin 60% din cuvintele titlului.
 */
export function matchBySlug(products: Product[], slug: string): Product | null {
  const slugText = normalizeText(slug);
  if (!slugText) return null;
  const slugTokens = new Set(slugText.split(' '));
  const slugCompact = compact(slugText);
  const has = (t: string) => slugTokens.has(t) || (t.length >= 3 && slugCompact.includes(t));

  let best: { p: Product; coverage: number; hits: number } | null = null;
  for (const p of products) {
    const brandTokens = normalizeText(p.brand).split(' ').filter(Boolean);
    if (!brandTokens.every((t) => has(compact(t)))) continue;
    const tokens = Array.from(new Set(normalizeText(`${p.brand} ${p.title}`).split(' '))).filter((t) => t.length >= 2);
    if (!tokens.length) continue;
    const hits = tokens.filter(has).length;
    const coverage = hits / tokens.length;
    if (hits >= 2 && coverage >= 0.6 && (!best || coverage > best.coverage || (coverage === best.coverage && hits > best.hits))) {
      best = { p, coverage, hits };
    }
  }
  return best ? best.p : null;
}
