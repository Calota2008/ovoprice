import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { t } from '../i18n';
import { authProvider } from '../services/authProvider';

interface DeleteAccountSheetProps {
  onClose: () => void;
  /** Called after the account was really deleted. */
  onDeleted: () => void;
}

/** Same word the user has to type, in the current language (shown on screen, compared ignoring case). */
const confirmWord = () => t('DELETE');
const same = (a: string, b: string) => a.trim().toLocaleUpperCase() === b.trim().toLocaleUpperCase();

export const DeleteAccountSheet: React.FC<DeleteAccountSheetProps> = ({ onClose, onDeleted }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const word = confirmWord();
  const ready = same(typed, word) && !busy;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const ok = (await authProvider.deleteAccount?.()) ?? false;
      if (ok) onDeleted();
      else setError(t("We couldn't delete your account. Check your connection and try again."));
    } catch {
      setError(t("We couldn't delete your account. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6">
        <button
          ref={closeRef}
          onClick={onClose}
          disabled={busy}
          aria-label={t('Close')}
          className="absolute right-3 top-3 w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 id="delete-title" className="mt-3 text-xl font-bold tracking-tight text-slate-900">
          {t('Delete your account?')}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
          {t("This permanently deletes your OvoPrice account and the settings saved with it. This can't be undone.")}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          {t('Products, alerts and Reels you saved on this device are not part of the account yet. They stay on this device until you clear your browser data.')}
        </p>
        <form onSubmit={submit} className="mt-4 space-y-2.5" noValidate>
          <label htmlFor="delete-confirm" className="block text-[13px] font-semibold text-slate-800">
            {t('To confirm, type {word}', { word })}
          </label>
          <input
            id="delete-confirm"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'delete-error' : undefined}
            className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20"
          />
          {error && (
            <p id="delete-error" role="alert" className="text-xs text-rose-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!ready}
            className="w-full h-12 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-[15px] font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            {busy ? t('Deleting…') : t('Delete my account')}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full h-11 rounded-xl border border-slate-300 hover:bg-slate-50 text-[14px] font-semibold text-slate-800 cursor-pointer disabled:opacity-50"
          >
            {t('Keep my account')}
          </button>
        </form>
      </div>
    </div>
  );
};
