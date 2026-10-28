import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { t } from '../i18n';
import type { AuthMode } from './AuthSheet';
import type { LimitKind, PlanLimits } from '../utils/limits';

interface LimitSheetProps {
  kind: LimitKind;
  limits: PlanLimits;
  /** What a free account would allow (shown to visitors as the reason to sign up). */
  accountLimits: PlanLimits;
  signedIn: boolean;
  onClose: () => void;
  /** Opens the list where the person can remove something. */
  onManage: () => void;
  onOpenAuth: (mode: AuthMode) => void;
}

/** Explains a limit when the person tries to go over it. Nothing is deleted; there is no error. */
export const LimitSheet: React.FC<LimitSheetProps> = ({ kind, limits, accountLimits, signedIn, onClose, onManage, onOpenAuth }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needsAccount = kind === 'collections';
  const title =
    kind === 'saved'
      ? t('You have reached the limit of saved products: {n}', { n: limits.savedProducts })
      : kind === 'alerts'
        ? t('You have reached the limit of price alerts: {n}', { n: limits.alerts })
        : t('Collections need an account');
  const body =
    kind === 'saved'
      ? signedIn
        ? t('Remove a product you no longer need to save a new one.')
        : t('Remove the saved product to save another one, or create a free account to save up to {n}.', { n: accountLimits.savedProducts })
      : kind === 'alerts'
        ? signedIn
          ? t('Delete an alert you no longer need to set a new one.')
          : t('Delete the alert to set another one, or create a free account to set up to {n}.', { n: accountLimits.alerts })
        : t('Create a free account to group your saved products into collections and share them.');

  const primary = 'w-full h-12 rounded-xl text-[15px] font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="limit-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('Close')}
          className="absolute right-3 top-3 w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 id="limit-title" className="text-lg font-extrabold text-slate-900 pr-10 leading-snug">{title}</h2>
        <p className="text-sm text-slate-700 leading-relaxed">{body}</p>
        <p className="text-xs text-slate-600 leading-snug">
          {t('You can still search, compare and open everything. Nothing you saved is deleted.')}
        </p>
        <div className="space-y-2">
          {needsAccount ? (
            <>
              <button type="button" onClick={() => { onClose(); onOpenAuth('create'); }} className={`${primary} bg-emerald-700 hover:bg-emerald-800 text-white`}>
                {t('Create an account')}
              </button>
              <button type="button" onClick={() => { onClose(); onOpenAuth('sign-in'); }} className={`${primary} border border-slate-300 bg-white text-slate-900 hover:border-slate-400`}>
                {t('Sign in')}
              </button>
            </>
          ) : signedIn ? (
            <button type="button" onClick={() => { onClose(); onManage(); }} className={`${primary} bg-emerald-700 hover:bg-emerald-800 text-white`}>
              {kind === 'saved' ? t('Manage saved products') : t('Manage price alerts')}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => { onClose(); onOpenAuth('create'); }} className={`${primary} bg-emerald-700 hover:bg-emerald-800 text-white`}>
                {t('Create an account')}
              </button>
              <button type="button" onClick={() => { onClose(); onManage(); }} className={`${primary} border border-slate-300 bg-white text-slate-900 hover:border-slate-400`}>
                {kind === 'saved' ? t('Manage saved products') : t('Manage price alerts')}
              </button>
              <button type="button" onClick={() => { onClose(); onOpenAuth('sign-in'); }} className={`${primary} text-emerald-800 hover:bg-emerald-50`}>
                {t('I already have an account')}
              </button>
            </>
          )}
          <button type="button" onClick={onClose} className={`${primary} text-slate-700 hover:bg-slate-100`}>
            {t('Not now')}
          </button>
        </div>
      </div>
    </div>
  );
};
