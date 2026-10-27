// Run with: npx tsx tests/unit_i18n.ts
// Checks that every key used in the code has a German and a Romanian entry,
// that no dictionary entry is unused, and that {placeholders} match.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { de } from '../src/i18n/de';
import { ro } from '../src/i18n/ro';
import { translate, LANGUAGES } from '../src/i18n';
import { COUNTRIES, countryName } from '../src/i18n/country';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const files: string[] = [];
(function walk(d: string) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p) && !/i18n[\\/](de|ro)\.ts$/.test(p)) files.push(p);
  }
})(root);

// Keys used directly in code: t('...') / tr('...')
const used = new Set<string>();
const callRe = /(?<![A-Za-z0-9_.])(?:t|tr)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(callRe)) {
    const raw = m[1] ?? m[2];
    used.add(raw.replace(/\\(['"\\])/g, '$1'));
  }
}

// Demo data values displayed through t(value)
const mock = fs.readFileSync(path.join(root, 'data/mockData.ts'), 'utf8');
const dataRe = /(?:category|deliveryEstimate|deliveryGuarantee|stockStatus|warranty|returnPolicy|badge|badgeText|shippingNote|shippingText|creatorLabel)\s*:\s*(?:'([^']*)'|"([^"]*)")/g;
for (const m of mock.matchAll(dataRe)) {
  const v = m[1] ?? m[2];
  if (/[A-Za-z]/.test(v)) used.add(v);
}

const dateRe = /date\s*:\s*'([^']*)'/g;
for (const m of mock.matchAll(dateRe)) used.add(m[1]);

// Dev-only toolbar text and proper names that stay the same in every language.
const SAME = new Set([
  'OvoPrice Screen Navigator', '(All 10 screenshot flows fully interactive)', 'Jump to screen:',
  'Mobile Phone Viewport (Matching Screenshots)', 'Mobile Frame', 'Expanded View', 'Expanded',
  'https://…', 'IKEA Deutschland', 'ikea.com/de', 'IKEA Österreich', 'ikea.com/at', 'XXXLutz Deutschland',
  'XXXLutz Österreich', 'Möbel Höffner', 'Mömax Deutschland', 'Mömax Österreich', 'Möbelix Deutschland',
  'Möbelix Österreich', 'ASIN',
]);
// Entries that legitimately read the same in German/Romanian as in English.
const OK_IDENTICAL = new Set(['Impressum', 'Details', 'Model', '(Demo)', 'Total:', 'Barcode', 'PNG, JPG, WEBP', 'Max 5 MB', 'MediaMarkt, OTTO, Amazon', 'MediaMarkt, OTTO, Amazon, eBay',
  'OvoPrice Visual Matcher', 'EAN / Barcode', 'DHL Express', 'Click & Collect', 'Top Rated Plus', 'TV', 'SMARTPHONE', 'SMART TV', 'Instant',
  'KAFFEEVOLLAUTOMATEN', 'AUDIO & KOPFHÖRER', 'BEAMER & PROJEKTOREN', 'FERNSEHER & HOME CINEMA', 'STAUBSAUGER & BODENPFLEGE', 'Gemini 3.8 Flash Vision Model']);

let errors = 0;
const fail = (m: string) => { errors++; console.error('FAIL:', m); };
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

for (const [name, dict] of [['de', de], ['ro', ro]] as const) {
  for (const k of used) {
    if (SAME.has(k)) continue;
    if (!(k in dict)) fail(`${name}: missing translation for ${JSON.stringify(k)}`);
  }
  for (const [k, v] of Object.entries(dict)) {
    if (!used.has(k)) fail(`${name}: unused entry ${JSON.stringify(k)}`);
    if (!v.trim()) fail(`${name}: empty translation for ${JSON.stringify(k)}`);
    if (placeholders(k) !== placeholders(v)) fail(`${name}: placeholders differ for ${JSON.stringify(k)}`);
    if (v === k && !OK_IDENTICAL.has(k) && /[a-z]{4,}/i.test(k) && !/^[A-Z0-9 &-]+$/.test(k)) fail(`${name}: translation identical to English for ${JSON.stringify(k)}`);
  }
}

// translate() behaviour
if (translate('de', 'Cancel') !== 'Abbrechen') fail('de translate');
if (translate('ro', 'Cancel') !== 'Anulează') fail('ro translate');
if (translate('en', 'Cancel') !== 'Cancel') fail('en translate');
if (translate('de', 'Some unknown text') !== 'Some unknown text') fail('fallback to key');
if (translate('de', 'Buy at {store}', { store: 'OTTO' }) !== 'Bei OTTO kaufen') fail('de interpolation');
if (translate('en', 'Buy at {store}', { store: 'OTTO' }) !== 'Buy at OTTO') fail('en interpolation');
if (LANGUAGES.map((l) => l.code).join() !== 'en,de,ro') fail('languages list');
if (COUNTRIES.map((c) => c.code).join() !== 'DE,AT') fail('countries list');
if (countryName('AT', 'de') !== 'Österreich' || countryName('DE', 'ro') !== 'Germania') fail('country names');

console.log(`${used.size} keys checked, ${Object.keys(de).length} DE / ${Object.keys(ro).length} RO entries`);
if (errors) { console.error(`${errors} problem(s)`); process.exit(1); }
console.log('i18n: OK');
