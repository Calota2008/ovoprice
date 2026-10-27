import { STORE_DIRECTORY, StoreGroup } from '../data/storeDirectory';

/**
 * Which kinds of shops usually sell a product, worked out from its category and title only.
 * This never claims that a shop has the product in stock: the result is a list of places to look.
 */
const RULES: { groups: StoreGroup[]; words: RegExp }[] = [
  // Small personal-care appliances are sold by electronics shops, appliance shops and drugstores.
  { groups: ['electronics', 'appliances', 'drugstore'], words: /haartrockner|f(ö|oe|o)hn|hair ?dr(y|i)er|rasierer|shaver|trimmer|epilier|zahnb(ü|u)rste|toothbrush|gl(ä|a)tteisen|hair ?straight|lockenstab/ },
  { groups: ['diy'], words: /bohr|drill|schrauber|screwdriver|werkzeug|\btool|s(ä|a)ge\b|saw\b|schleifer|sander/ },
  { groups: ['appliances', 'electronics'], words: /kaffee|coffee|espresso|staubsauger|vacuum|saugroboter|waschmaschine|washing|k(ü|u)hlschrank|fridge|geschirrsp|dishwasher|k(ü|u)chenmaschine|mixer|toaster|wasserkocher|kettle|bodenpflege|trockner/ },
  { groups: ['electronics'], words: /kopfh(ö|o)rer|headphone|earbud|audio|lautsprecher|speaker|fernseher|\btv\b|smart ?tv|home ?cinema|beamer|projekt|projector|smartphone|handy|phone|tablet|laptop|notebook|kamera|camera|monitor|drucker|printer/ },
  { groups: ['furniture'], words: /m(ö|o)bel|furniture|sofa|couch|schrank|wardrobe|regal|bookshelf|tisch\b|table\b|stuhl|chair|bett\b|\bbed\b|matratze|mattress/ },
  { groups: ['beauty'], words: /parf(ü|u)m|perfume|kosmetik|cosmetic|make-?up|pflegeset/ },
];

export function groupsForProduct(input: { category?: string; title?: string }): StoreGroup[] {
  const text = `${input.category ?? ''} ${input.title ?? ''}`.toLowerCase();
  const out = new Set<StoreGroup>();
  for (const rule of RULES) {
    if (rule.words.test(text)) rule.groups.forEach((g) => out.add(g));
  }
  return [...out];
}

export interface StoreSuggestion {
  key: string;
  name: string;
  domain: string;
  /** Search page of the shop for this product, or a web search limited to the shop as a fallback. */
  url: string;
  /** True when the link is the shop's own search page. */
  ownSearch: boolean;
}

export interface StoreSuggestions {
  /** False when the product type is not recognised: only general online shops are shown then. */
  matched: boolean;
  stores: StoreSuggestion[];
}

export function storesForProduct(
  product: { category?: string; title?: string },
  country: string
): StoreSuggestions {
  const cc = country === 'AT' ? 'AT' : 'DE';
  const wanted = groupsForProduct(product);
  const query = (product.title ?? '').trim().slice(0, 80);

  const rank = (groups: StoreGroup[]) => (groups.includes('general') ? 1 : 0);
  const stores = STORE_DIRECTORY.filter((s) => s.domains[cc] && (s.groups.includes('general') || s.groups.some((g) => wanted.includes(g))))
    .sort((a, b) => rank(a.groups) - rank(b.groups))
    .map((s): StoreSuggestion => {
      const domain = s.domains[cc] as string;
      const own = s.search?.[cc];
      const host = domain.split('/')[0];
      return {
        key: s.key,
        name: s.name,
        domain,
        ownSearch: !!own,
        url: own ? own(query) : `https://www.google.com/search?q=${encodeURIComponent(`${query} site:${host}`)}`,
      };
    });
  return { matched: wanted.length > 0, stores };
}
