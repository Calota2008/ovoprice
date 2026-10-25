/**
 * Minimal i18n. English text is the key: t('Price alerts'). A missing translation falls back to the
 * English key, so the app never shows an empty label. Add a language = add a dictionary + one LANGUAGES entry.
 */
import { useSyncExternalStore } from 'react';
import { de } from './de';
import { ro } from './ro';

export type Lang = 'en' | 'de' | 'ro';

/** Names are written in their own language on purpose (people must recognise theirs). */
export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ro', label: 'Română' },
];

export const LANG_STORAGE_KEY = 'ovoprice_lang_v1';
const DICTIONARIES: Record<Exclude<Lang, 'en'>, Record<string, string>> = { de, ro };

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'de' || v === 'ro';

function detectLanguage(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const prefs = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  for (const p of prefs) {
    const base = String(p || '').slice(0, 2).toLowerCase();
    if (isLang(base)) return base;
  }
  return 'en';
}

let current: Lang = detectLanguage();
const listeners = new Set<() => void>();
const applyHtmlLang = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = current;
};
applyHtmlLang();

export const getLanguage = (): Lang => current;

/** Marks a string for translation without translating it now (module-level constants). Translate at display time with t(). */
export const tr = (s: string): string => s;

const DATE_LOCALES: Record<Lang, string> = { en: 'en-GB', de: 'de-DE', ro: 'ro-RO' };
export const dateLocale = (): string => DATE_LOCALES[current];

export function setLanguage(lang: Lang): void {
  if (!isLang(lang) || lang === current) return;
  current = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* choice lasts for this visit only */
  }
  applyHtmlLang();
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Subscribes the calling component to language changes (use once near the root and where needed). */
export const useLanguage = (): Lang => useSyncExternalStore(subscribe, getLanguage, getLanguage);

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const raw = lang === 'en' ? key : DICTIONARIES[lang][key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : raw;
}

/** Translate for the current language. Interpolation: t('Delete alert for {title}', { title }). */
export const t = (key: string, vars?: Record<string, string | number>): string => translate(current, key, vars);
