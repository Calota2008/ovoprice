/**
 * Countries OvoPrice serves. To add one: append an entry here (and, later, its stores in the data provider).
 * The choice is a device preference for now; with accounts it becomes part of the profile.
 */
import { useSyncExternalStore } from 'react';
import type { Lang } from './index';

export interface Country {
  code: string;
  names: Record<Lang, string>;
  currency: 'EUR';
}

export const COUNTRIES: Country[] = [
  { code: 'DE', names: { en: 'Germany', de: 'Deutschland', ro: 'Germania' }, currency: 'EUR' },
  { code: 'AT', names: { en: 'Austria', de: 'Österreich', ro: 'Austria' }, currency: 'EUR' },
];

export const COUNTRY_STORAGE_KEY = 'ovoprice_country_v1';
export const DEFAULT_COUNTRY = 'DE';

export const isCountryCode = (v: unknown): v is string => typeof v === 'string' && COUNTRIES.some((c) => c.code === v);

function detectCountry(): string {
  try {
    const stored = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (isCountryCode(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const prefs = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  for (const p of prefs) {
    const region = String(p || '').split('-')[1]?.toUpperCase();
    if (isCountryCode(region)) return region;
  }
  return DEFAULT_COUNTRY;
}

let current = detectCountry();
const listeners = new Set<() => void>();

export const getCountry = (): string => current;

export function setCountry(code: string): void {
  if (!isCountryCode(code) || code === current) return;
  current = code;
  try {
    localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  } catch {
    /* choice lasts for this visit only */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const useCountry = (): string => useSyncExternalStore(subscribe, getCountry, getCountry);

export const countryName = (code: string, lang: Lang): string => COUNTRIES.find((c) => c.code === code)?.names[lang] ?? code;
