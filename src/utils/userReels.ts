import { ReelSpec } from '../types';
import { isSafeHttpUrl } from './url';
import { explainInvalidGtin } from './ean';

export const USER_REELS_KEY = 'ovoprice_user_reels_v1';

export const LIMITS = {
  maxReels: 10,
  maxVideoBytes: 40 * 1024 * 1024,
  maxImageBytes: 15 * 1024 * 1024,
  maxVideoSeconds: 90,
  maxTitle: 80,
  maxDescription: 200,
  maxCategory: 30,
  maxSpecs: 8,
  maxSpecLabel: 30,
  maxSpecValue: 80,
  maxImageSide: 1280,
} as const;

export const ACCEPTED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTR = [...ACCEPTED_VIDEO, ...ACCEPTED_IMAGE].join(',');

/** Metadata stored in localStorage. The media itself lives in IndexedDB under the same id. */
export interface UserReelRecord {
  id: string;
  productId?: string;
  title: string;
  subtitle: string;
  category: string;
  specs: ReelSpec[];
  buyUrl?: string;
  isAffiliate: boolean;
  mediaKind: 'video' | 'image';
  createdAt: number;
}

export interface UserReelInput {
  title: string;
  subtitle: string;
  category: string;
  specs: ReelSpec[];
  buyUrl: string;
  isAffiliate: boolean;
  productId?: string;
}

export type FormErrors = Partial<Record<'media' | 'title' | 'subtitle' | 'category' | 'specs' | 'buyUrl' | 'ean', string>>;

export function mediaKindOf(file: { type: string }): 'video' | 'image' | null {
  if (ACCEPTED_VIDEO.includes(file.type)) return 'video';
  if (ACCEPTED_IMAGE.includes(file.type)) return 'image';
  return null;
}

/** Validates the text fields of the form (the media file is validated separately). */
export function validateUserReelInput(input: UserReelInput): FormErrors {
  const errors: FormErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Enter the product name.';
  else if (title.length > LIMITS.maxTitle) errors.title = `Keep the name under ${LIMITS.maxTitle} characters.`;
  if (input.subtitle.trim().length > LIMITS.maxDescription)
    errors.subtitle = `Keep the description under ${LIMITS.maxDescription} characters.`;
  if (input.category.trim().length > LIMITS.maxCategory)
    errors.category = `Keep the category under ${LIMITS.maxCategory} characters.`;
  if (input.specs.length > LIMITS.maxSpecs) errors.specs = `Add at most ${LIMITS.maxSpecs} specifications.`;
  else if (input.specs.some((s) => (s.label.trim() === '') !== (s.value.trim() === '')))
    errors.specs = 'Fill both the label and the value, or remove the row.';
  else if (input.specs.some((s) => s.label.length > LIMITS.maxSpecLabel || s.value.length > LIMITS.maxSpecValue))
    errors.specs = 'A specification is too long.';
  const url = input.buyUrl.trim();
  if (url) {
    let ok = isSafeHttpUrl(url);
    try {
      ok = ok && new URL(url).protocol === 'https:';
    } catch {
      ok = false;
    }
    if (!ok) errors.buyUrl = 'Enter a full https:// link to the merchant page.';
  }
  return errors;
}

export function eanMessage(input: string): string | null {
  switch (explainInvalidGtin(input)) {
    case 'empty':
      return 'Enter a barcode.';
    case 'length':
      return 'A barcode has 8, 12, 13 or 14 digits.';
    case 'checksum':
      return 'This barcode looks wrong (check digit does not match).';
    default:
      return null;
  }
}

export function cleanSpecs(specs: ReelSpec[]): ReelSpec[] {
  return specs
    .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
    .filter((s) => s.label && s.value);
}

/** Drops corrupted entries from localStorage instead of failing. */
export function validateUserReels(value: unknown): UserReelRecord[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is UserReelRecord => {
    if (!v || typeof v !== 'object') return false;
    const r = v as Partial<UserReelRecord>;
    return (
      typeof r.id === 'string' &&
      typeof r.title === 'string' &&
      r.title.length > 0 &&
      typeof r.subtitle === 'string' &&
      typeof r.category === 'string' &&
      Array.isArray(r.specs) &&
      r.specs.every((s) => s && typeof s.label === 'string' && typeof s.value === 'string') &&
      (r.mediaKind === 'video' || r.mediaKind === 'image') &&
      typeof r.isAffiliate === 'boolean' &&
      (r.buyUrl === undefined || (typeof r.buyUrl === 'string' && isSafeHttpUrl(r.buyUrl))) &&
      (r.productId === undefined || typeof r.productId === 'string')
    );
  });
}
