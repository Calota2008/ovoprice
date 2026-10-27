import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { t, useLanguage } from '../../i18n';
import { LEGAL, LegalField, LegalPage, legalComplete } from '../../utils/legal';
import { LEGAL_DOCS, LEGAL_UPDATED } from '../../data/legalContent';

const TOKEN = /\{(name|address|email|phone)\}/g;

/** Replaces {name} etc. with the operator details; a missing value is shown as an obvious marker. */
const Filled: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    parts.push(text.slice(last, m.index));
    const value = LEGAL[m[1] as LegalField];
    parts.push(
      value ? (
        <span key={i++}>{m[1] === 'address' ? value.replace(/\s*\|\s*/g, ', ') : value}</span>
      ) : (
        <mark key={i++} data-missing className="rounded bg-amber-100 px-1 text-amber-900">
          {t('[to be completed]')}
        </mark>
      )
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

export const LegalScreen: React.FC<{ page: LegalPage }> = ({ page }) => {
  const lang = useLanguage();
  const doc = LEGAL_DOCS[page];
  const complete = legalComplete();

  return (
    <article className="pb-8 space-y-5" data-testid={`legal-${page}`}>
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{doc.title[lang]}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{LEGAL_UPDATED[lang]}</p>
      </header>

      {!complete && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t('Draft: the operator details are not filled in yet and this text has not been reviewed by a specialist. Do not publish the app like this.')}</span>
        </p>
      )}

      {doc.sections.map((s) => {
        // Phone is optional: its line is dropped entirely when no number is set.
        const paragraphs = s.p[lang].filter((p) => !(p.includes('{phone}') && !LEGAL.phone));
        if (!paragraphs.length) return null;
        return (
          <section key={s.h.en} className="space-y-1.5">
            <h2 className="text-sm font-bold text-slate-900">{s.h[lang]}</h2>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-slate-700">
                <Filled text={p} />
              </p>
            ))}
          </section>
        );
      })}

      {lang !== 'de' && page !== 'impressum' && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {t('If this translation differs from the German version, the German version applies.')}
        </p>
      )}
    </article>
  );
};
