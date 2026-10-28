import React, { useEffect, useRef } from 'react';
import { t } from '../i18n';
import type { MergeOffer } from '../services/usePersistedLists';

interface MergeSheetProps {
  offer: MergeOffer;
  onAccept: () => void;
  onDecline: () => void;
}

/** Shown once after signing in when the device holds things the account does not. Nothing is deleted either way. */
export const MergeSheet: React.FC<MergeSheetProps> = ({ offer, onAccept, onDecline }) => {
  const acceptRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    acceptRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDecline]);

  const rows: [string, number][] = [
    [t('Saved products'), offer.add.saved],
    [t('Price alerts'), offer.add.alerts],
    [t('Collections'), offer.add.collections],
  ];
  const shown = rows.filter(([, n]) => n > 0);
  const skipped = offer.skipped.saved + offer.skipped.alerts + offer.skipped.collections;
  const nothingToAdd = shown.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-title"
      data-testid="merge-sheet"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4">
        <div>
          <p className="text-xs font-bold text-emerald-800">{t('Signed in')}</p>
          <h2 id="merge-title" className="text-lg font-extrabold text-slate-900 leading-snug mt-1">
            {t('Add what you saved on this device to your account?')}
          </h2>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {t('We found these on this device. After you add them you can open them on any device you sign in on.')}
        </p>
        {!nothingToAdd && (
          <dl className="rounded-xl bg-slate-100 p-3 space-y-1.5">
            {shown.map(([label, n]) => (
              <div key={label} className="flex justify-between text-sm text-slate-800">
                <dt>{label}</dt>
                <dd className="font-bold tnum">{n}</dd>
              </div>
            ))}
          </dl>
        )}
        {skipped > 0 && (
          <p role="note" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
            {t('{n} items do not fit under the limits and stay only on this device.', { n: skipped })}
          </p>
        )}
        <div className="space-y-2">
          {!nothingToAdd && (
            <button
              ref={acceptRef}
              type="button"
              onClick={onAccept}
              className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[15px] font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {t('Add to my account')}
            </button>
          )}
          <button
            type="button"
            ref={nothingToAdd ? acceptRef : undefined}
            onClick={onDecline}
            className="w-full h-12 rounded-xl border border-slate-300 bg-white text-slate-900 text-[15px] font-semibold cursor-pointer hover:border-slate-400"
          >
            {nothingToAdd ? t('Close') : t('Not now')}
          </button>
        </div>
        <p className="text-[11px] text-slate-600 leading-snug">
          {t('Items already in your account are not added twice. Nothing is deleted from this device.')}
        </p>
      </div>
    </div>
  );
};
