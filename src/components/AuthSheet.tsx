import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Cloud, BellRing, Clapperboard, ShieldCheck } from 'lucide-react';
import { authProvider } from '../services/authProvider';
import { t, tr, useLanguage } from '../i18n';
import { COUNTRIES, countryName, setCountry, useCountry } from '../i18n/country';

export type AuthMode = 'sign-in' | 'create';

interface AuthSheetProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

const GoogleG: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/** Price tag with a falling line: the one memorable element of the sheet. */
const TagMark: React.FC = () => (
  <svg viewBox="0 0 120 64" className="w-[120px] h-16" aria-hidden="true">
    <path d="M6 32 L28 8 H96 a8 8 0 0 1 8 8 V48 a8 8 0 0 1-8 8 H28 Z" fill="#0f2547" stroke="#34d399" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="26" cy="32" r="4" fill="#08142e" stroke="#34d399" strokeWidth="1.5" />
    <polyline points="40,22 54,26 66,24 78,36 92,42" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="92" cy="42" r="4" fill="#34d399" />
  </svg>
);

const COPY: Record<AuthMode, { title: string; lead: string; email: string; switchText: string; switchAction: string }> = {
  'sign-in': {
    title: tr('Welcome back'),
    lead: tr('Sign in to pick up your saved products, alerts and Reels on any device.'),
    email: tr('Email me a sign-in code'),
    switchText: tr('New to OvoPrice?'),
    switchAction: tr('Create an account'),
  },
  create: {
    title: tr('Keep your finds on every device'),
    lead: tr('A free account syncs what you save and tracks prices while you are away.'),
    email: tr('Email me a sign-up code'),
    switchText: tr('Already have an account?'),
    switchAction: tr('Sign in'),
  },
};

const BENEFITS = [
  { icon: Cloud, text: tr('Saved products and collections, synced') },
  { icon: BellRing, text: tr('Price alerts that reach you when the app is closed') },
  { icon: Clapperboard, text: tr('Your Reels, available everywhere') },
];

export const AuthSheet: React.FC<AuthSheetProps> = ({ mode, onModeChange, onClose }) => {
  const lang = useLanguage();
  const country = useCountry();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copy = COPY[mode];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const explain = (reason: string) => {
    if (reason === 'not-connected') {
      setNotice(t("Accounts aren't switched on yet. Nothing was sent, and everything you save stays on this device."));
      setError(null);
    } else if (reason === 'invalid-email') {
      setError(t('Enter a valid email address, like name@example.com.'));
      setNotice(null);
    } else {
      setError(t('Something went wrong. Try again in a moment.'));
      setNotice(null);
    }
  };

  const run = async (fn: () => Promise<{ ok: boolean; reason?: string }>) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) explain((res as { reason: string }).reason);
      else onClose();
    } catch {
      explain('failed');
    } finally {
      setBusy(false);
    }
  };

  const options = { mode, country: mode === 'create' ? country : undefined };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[#faf8ff] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
        <div className="relative bg-[#08142e] px-6 pt-7 pb-6 text-white">
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t('Close')}
            className="absolute right-3 top-3 w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:bg-white/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <X className="w-5 h-5" />
          </button>
          <TagMark />
          <h2 id="auth-title" className="mt-3 text-[22px] leading-tight font-bold tracking-tight">
            {t(copy.title)}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300 max-w-[30ch] sm:max-w-none">{t(copy.lead)}</p>
        </div>

        <div className="px-6 pt-5 pb-6 space-y-4">
          {mode === 'create' && (
            <fieldset>
              <legend className="text-[13px] font-semibold text-slate-800 mb-1.5">{t('Your country')}</legend>
              <div className="flex gap-2" role="radiogroup" aria-label={t('Your country')}>
                {COUNTRIES.map((c) => {
                  const active = c.code === country;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setCountry(c.code)}
                      className={`flex-1 h-11 rounded-xl border text-[14px] font-semibold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                        active
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {countryName(c.code, lang)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">{t('Sets the stores and prices you see. You can change it later in Account settings.')}</p>
            </fieldset>
          )}

          <button
            onClick={() => run(() => authProvider.signInWithGoogle(options))}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] transition flex items-center justify-center gap-3 text-[15px] font-semibold text-slate-800 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <GoogleG />
            {t('Continue with Google')}
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400" role="separator">
            <span className="flex-1 h-px bg-slate-200" />
            {t('or use your email')}
            <span className="flex-1 h-px bg-slate-200" />
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              run(() => authProvider.signInWithEmail(email, options));
            }}
            className="space-y-2.5"
          >
            <label htmlFor="auth-email" className="sr-only">
              {t('Email address')}
            </label>
            <input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              aria-invalid={!!error}
              aria-describedby={error ? 'auth-error' : undefined}
              className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            {error && (
              <p id="auth-error" role="alert" className="text-xs text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] transition flex items-center justify-center gap-2 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Mail className="w-[18px] h-[18px]" />
              {t(copy.email)}
            </button>
          </form>

          {notice && (
            <p role="status" className="text-xs leading-relaxed text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              {notice}
            </p>
          )}

          {mode === 'create' && (
            <ul className="space-y-2 pt-1">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[13px] text-slate-700">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  {t(text)}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{t('We never post for you. Products you saved on this device will move to your account when you sign in.')}</span>
          </div>

          <div className="flex items-center justify-between pt-1 text-[13px]">
            <span className="text-slate-600">
              {t(copy.switchText)}{' '}
              <button
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  onModeChange(mode === 'sign-in' ? 'create' : 'sign-in');
                }}
                className="font-semibold text-emerald-800 hover:underline cursor-pointer"
              >
                {t(copy.switchAction)}
              </button>
            </span>
            <button onClick={onClose} className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
              {t('Continue as guest')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
