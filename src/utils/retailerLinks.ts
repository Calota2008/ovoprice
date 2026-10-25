import { RecognizedRetailerLink } from '../types';

/**
 * Analiză LOCALĂ a unui link de produs. Nu face nicio cerere de rețea: citește
 * doar domeniul, ID-ul articolului și numele din adresă.
 */

export type LinkProblemKind = 'malformed' | 'social' | 'short' | 'unsupported';

export type ParsedLink =
  | { ok: true; link: RecognizedRetailerLink }
  | { ok: false; kind: LinkProblemKind; title: string; message: string };

interface RetailerConfig {
  key: RecognizedRetailerLink['retailerKey'];
  name: string;
  domains: string[];
  idLabel: string;
  /** întoarce [id, slug] din adresă */
  extract: (url: URL) => { id: string | null; slug: string };
}

const lastSegment = (url: URL) => {
  const parts = url.pathname.split('/').filter(Boolean);
  return parts.length ? safeDecode(parts[parts.length - 1]) : '';
};

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const RETAILERS: RetailerConfig[] = [
  {
    key: 'mediamarkt',
    name: 'MediaMarkt Germany',
    domains: ['mediamarkt.de'],
    idLabel: 'ID articol',
    extract: (url) => {
      const seg = lastSegment(url).replace(/\.html?$/i, '');
      const m = seg.match(/^(.*?)-(\d{6,10})$/) || seg.match(/^()(\d{6,10})$/);
      return m ? { id: m[2], slug: m[1] } : { id: null, slug: seg };
    },
  },
  {
    key: 'otto',
    name: 'OTTO Germany',
    domains: ['otto.de'],
    idLabel: 'ID articol',
    extract: (url) => {
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('p');
      const seg = idx >= 0 && parts[idx + 1] ? safeDecode(parts[idx + 1]) : '';
      // ID OTTO: majuscule+cifre (ex. S0X0O0P9) sau doar cifre; trebuie să conțină o cifră
      const m = seg.match(/^(.*)-([A-Z0-9]{6,})$/);
      if (m && /\d/.test(m[2])) return { id: m[2], slug: m[1] };
      return { id: null, slug: seg };
    },
  },
  {
    key: 'amazon',
    name: 'Amazon',
    domains: ['amazon.de', 'amazon.at'],
    idLabel: 'ASIN',
    extract: (url) => {
      const m = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
      const before = url.pathname.split('/dp/')[0].split('/').filter(Boolean);
      const slug = before.length && !['gp', 'dp'].includes(before[before.length - 1]) ? safeDecode(before[before.length - 1]) : '';
      return { id: m ? m[1].toUpperCase() : null, slug };
    },
  },
  {
    key: 'ebay',
    name: 'eBay Germany',
    domains: ['ebay.de'],
    idLabel: 'Număr articol',
    extract: (url) => {
      const m = url.pathname.match(/\/itm\/(?:([^/]+)\/)?(\d{9,14})/);
      return m ? { id: m[2], slug: m[1] ? safeDecode(m[1]) : '' } : { id: null, slug: '' };
    },
  },
];

const SOCIAL = ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'facebook.com', 'fb.watch', 'x.com', 'twitter.com', 'pinterest.com', 'pin.it'];
const SHORT = ['amzn.to', 'amzn.eu', 'a.co', 'ebay.us', 'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 't.co', 'goo.gl'];

const hostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** "dyson-v15-detect_absolute" => "dyson v15 detect absolute" */
export function slugToText(slug: string): string {
  return slug
    .replace(/^_+/, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseProductLink(raw: string): ParsedLink {
  let text = raw.trim();
  if (!text) {
    return { ok: false, kind: 'malformed', title: 'Link lipsă', message: 'Lipește linkul unui produs pentru a-l analiza.' };
  }
  if (/\s/.test(text)) {
    return { ok: false, kind: 'malformed', title: 'Link invalid', message: 'Linkul nu trebuie să conțină spații. Copiază adresa completă din browser.' };
  }
  // Acceptăm "www.otto.de/..." fără schemă
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text) && text.includes('.')) text = `https://${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, kind: 'malformed', title: 'Link invalid', message: 'Introdu o adresă web completă, de exemplu https://www.otto.de/p/…' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, kind: 'malformed', title: 'Protocol neacceptat', message: 'Sunt acceptate doar linkuri http și https.' };
  }
  if (url.username || url.password) {
    return { ok: false, kind: 'malformed', title: 'Link nesigur', message: 'Linkul conține date de autentificare și nu poate fi analizat.' };
  }

  const host = url.hostname.toLowerCase();

  if (SHORT.some((d) => hostMatches(host, d))) {
    return {
      ok: false,
      kind: 'short',
      title: 'Link scurtat',
      message: 'Linkurile scurtate nu pot fi deschise de aplicație. Deschide-l în browser și copiază adresa completă a produsului.',
    };
  }
  if (SOCIAL.some((d) => hostMatches(host, d))) {
    return {
      ok: false,
      kind: 'social',
      title: 'Link de rețea socială',
      message:
        'Încă nu putem citi produsul dintr-un video sau o postare. Caută produsul după nume, cu o poză sau scanându-i codul de bare.',
    };
  }

  const retailer = RETAILERS.find((r) => r.domains.some((d) => hostMatches(host, d)));
  if (!retailer) {
    return {
      ok: false,
      kind: 'unsupported',
      title: 'Magazin neacceptat',
      message: `Domeniul „${url.hostname}” nu este acceptat încă. Acceptăm: MediaMarkt, OTTO, Amazon.de/.at și eBay.de.`,
    };
  }

  const { id, slug } = retailer.extract(url);
  return {
    ok: true,
    link: {
      retailerKey: retailer.key,
      retailerName: retailer.name,
      submittedUrl: url.toString(),
      articleId: id,
      idLabel: retailer.idLabel,
      hostname: url.hostname,
      slugGuess: slugToText(slug) || undefined,
    },
  };
}
