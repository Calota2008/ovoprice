import { CONTACT_EMAIL } from './contact';
import { isValidEmail } from './email';

/**
 * Operator details for the Impressum / privacy notice. They are read from environment variables and
 * NEVER invented: a missing value is shown as an obvious "to be completed" marker, and the legal
 * pages say they are a draft until all required fields are filled in.
 */
const read = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const rawEmail = read(import.meta.env.VITE_LEGAL_EMAIL);

export const LEGAL = {
  name: read(import.meta.env.VITE_LEGAL_NAME),
  /** Street, postal code, city, country. A line break can be written as " | ". */
  address: read(import.meta.env.VITE_LEGAL_ADDRESS),
  email: isValidEmail(rawEmail) ? rawEmail : CONTACT_EMAIL,
  phone: read(import.meta.env.VITE_LEGAL_PHONE),
};

export type LegalField = keyof typeof LEGAL;

/** Name, postal address and e-mail are the minimum for an Impressum. */
export const legalComplete = (): boolean => Boolean(LEGAL.name && LEGAL.address && LEGAL.email);

export type LegalPage = 'impressum' | 'privacy' | 'terms';
