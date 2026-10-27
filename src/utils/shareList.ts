/**
 * A shareable list lives entirely inside the link: its name and the ids of its products. Nothing is
 * stored on a server, so there is no account, no database and no personal data involved. Whoever has the
 * link can read the list; the products and prices are looked up again when the link is opened.
 */
export const SHARE_PARAM = 'list';
export const SHARE_LIMITS = { maxProducts: 50, maxNameLength: 30, maxIdLength: 80 } as const;

export interface SharedList {
  name: string;
  productIds: string[];
}

const ID_RE = /^[A-Za-z0-9_.-]+$/;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(raw: string): string {
  const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Removes control characters and trims; the result is only ever rendered as text. */
const cleanName = (name: string): string =>
  name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, SHARE_LIMITS.maxNameLength);

export function encodeList(list: SharedList): string {
  const ids = Array.from(new Set(list.productIds)).slice(0, SHARE_LIMITS.maxProducts);
  return toBase64Url(JSON.stringify({ v: 1, n: cleanName(list.name), p: ids }));
}

/** Returns the list, or null when the text is not a valid shared list (never throws). */
export function decodeList(raw: string | null | undefined): SharedList | null {
  if (!raw || raw.length > 4000) return null;
  try {
    const data = JSON.parse(fromBase64Url(raw)) as { v?: unknown; n?: unknown; p?: unknown };
    if (!data || typeof data !== 'object' || data.v !== 1 || typeof data.n !== 'string' || !Array.isArray(data.p)) return null;
    const name = cleanName(data.n);
    if (!name) return null;
    const productIds = Array.from(
      new Set(
        data.p.filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= SHARE_LIMITS.maxIdLength && ID_RE.test(id)
        )
      )
    ).slice(0, SHARE_LIMITS.maxProducts);
    return productIds.length ? { name, productIds } : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(base: { origin: string; pathname: string }, list: SharedList): string {
  return `${base.origin}${base.pathname}?${SHARE_PARAM}=${encodeList(list)}`;
}

export function readSharedListFromLocation(search: string): SharedList | null {
  return decodeList(new URLSearchParams(search).get(SHARE_PARAM));
}
