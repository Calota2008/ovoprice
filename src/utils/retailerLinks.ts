import { RecognizedRetailerLink } from '../types';

import { t, tr } from '../i18n';
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
    idLabel: tr('Item ID'),
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
    idLabel: tr('Item ID'),
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
    idLabel: tr('ASIN'),
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
    idLabel: tr('Item number'),
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
    return { ok: false, kind: 'malformed', title: t('Missing link'), message: t('Paste a product link to analyze it.') };
  }
  if (/\s/.test(text)) {
    return { ok: false, kind: 'malformed', title: t('Invalid link'), message: t('The link must not contain spaces. Copy the full address from your browser.') };
  }
  // Acceptăm "www.otto.de/..." fără schemă
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text) && text.includes('.')) text = `https://${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, kind: 'malformed', title: t('Invalid link'), message: t('Enter a complete web address, for example https://www.otto.de/p/…') };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, kind: 'malformed', title: t('Unsupported protocol'), message: t('Only http and https links are supported.') };
  }
  if (url.username || url.password) {
    return { ok: false, kind: 'malformed', title: t('Unsafe link'), message: t('The link contains login credentials and cannot be analyzed.') };
  }

  const host = url.hostname.toLowerCase();

  if (SHORT.some((d) => hostMatches(host, d))) {
    return {
      ok: false,
      kind: 'short',
      title: t('Shortened link'),
      message: t('Shortened links cannot be opened by the app. Open it in your browser and copy the full product address.'),
    };
  }
  if (SOCIAL.some((d) => hostMatches(host, d))) {
    return {
      ok: false,
      kind: 'social',
      title: t('Social media link'),
      message: t('We cannot read the product from a video or a post yet. Search by name, with a photo, or scan its barcode.'),
    };
  }

  const retailer = RETAILERS.find((r) => r.domains.some((d) => hostMatches(host, d)));
  if (!retailer) {
    return {
      ok: false,
      kind: 'unsupported',
      title: t('Store not supported'),
      message: t('The domain “{host}” is not supported yet. Supported: MediaMarkt, OTTO, Amazon.de/.at and eBay.de.', { host: url.hostname }),
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
