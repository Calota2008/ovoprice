import { isValidEmail } from './email';

/**
 * Support address shown behind the "Contact us" button. It is read from VITE_CONTACT_EMAIL, never
 * invented: without a valid address the button is simply not shown.
 */
const raw = ((import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '').trim();
export const CONTACT_EMAIL = isValidEmail(raw) ? raw : '';

export const contactHref = (subject: string): string =>
  CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : '';
