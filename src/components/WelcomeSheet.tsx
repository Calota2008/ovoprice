import React, { useEffect, useState } from 'react';
import { Iri, IriPose } from './Iri';
import { t } from '../i18n';
import { priceProvider } from '../services/priceProvider';

/**
 * First-visit guide: three short screens with Iri, shown once per browser (can be skipped).
 * Automated browsers (tests) do not get it unless the address has ?welcome=1, so the other tests are not blocked.
 */
const KEY = 'ovoprice_welcome_v1';

export function shouldShowWelcome(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('welcome') === '1') return true;
    if (navigator.webdriver) return false;
    return localStorage.getItem(KEY) !== 'done';
  } catch {
    return false; // storage blocked: better no guide than a guide on every visit
  }
}

function markDone() {
  try {
    localStorage.setItem(KEY, 'done');
  } catch {
    /* ignore */
  }
}

const STEPS: { pose: IriPose; title: () => string; text: () => string }[] = [
  {
    pose: 'wave',
    title: () => t("Hi! I'm Iri"),
    text: () => t("Tell me what you want to buy and I'll find the lowest total price, delivery included, in stores in Germany and Austria."),
  },
  {
    pose: 'search',
    title: () => t('No product name at hand?'),
    text: () => t('Paste a link from the store or scan the barcode on the box. Both are free.'),
  },
  {
    pose: 'bell',
    title: () => t('Save and get alerted'),
    text: () => t("Save products with the heart and set a target price. I'll tell you when the price drops."),
  },
];

export const WelcomeSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const close = () => {
    markDone();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/55 flex items-end lg:items-center justify-center" data-testid="welcome">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="iri-pop w-full lg:w-[720px] bg-white rounded-t-3xl lg:rounded-3xl overflow-hidden shadow-2xl lg:grid lg:grid-cols-2"
      >
        <div className="relative bg-gradient-to-br from-emerald-200 via-sky-200 to-violet-200 flex items-end justify-center pt-8 h-56 lg:h-auto lg:min-h-[380px]">
          <Iri key={step} pose={s.pose} size={step === 0 ? 200 : 185} motion="pop" className="lg:mb-6" />
        </div>
        <div className="p-6 pb-8 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            {t('Step {n} of {total}', { n: step + 1, total: STEPS.length })}
          </p>
          <h2 id="welcome-title" className="text-2xl font-black text-slate-900 mt-1 leading-tight">
            {s.title()}
          </h2>
          <p className="text-[15px] text-slate-600 leading-relaxed mt-2">{s.text()}</p>
          {last && priceProvider.isDemo && (
            <p className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
              {t('Demo version: for now there are only a few example products, without real prices.')}
            </p>
          )}
          <div className="flex justify-center gap-1.5 my-5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300'}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? close() : setStep(step + 1))}
            className="w-full min-h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:translate-y-0.5 text-white font-black text-base shadow-[0_5px_0_#047857] active:shadow-[0_2px_0_#047857] transition-all cursor-pointer"
          >
            {last ? t("Let's start") : t('Next')}
          </button>
          {!last && (
            <button type="button" onClick={close} className="mt-2 min-h-11 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
              {t('Skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
