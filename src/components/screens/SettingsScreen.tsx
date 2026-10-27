import React, { useState } from 'react';
import { Check, Globe2, LifeBuoy, MapPin, Pencil, UserRound } from 'lucide-react';
import { LANGUAGES, setLanguage, t, useLanguage } from '../../i18n';
import { COUNTRIES, countryName, setCountry, useCountry } from '../../i18n/country';
import { authProvider } from '../../services/authProvider';
import { useAuthUser, userInitials } from '../../services/useAuthUser';
import { DeleteAccountSheet } from '../DeleteAccountSheet';
import { CONTACT_EMAIL, contactHref } from '../../utils/contact';

interface SettingsScreenProps {
  onOpenAuth: (mode: 'sign-in' | 'create') => void;
}

const Option: React.FC<{ selected: boolean; label: string; hint?: string; onSelect: () => void }> = ({
  selected,
  label,
  hint,
  onSelect,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={`w-full flex items-center justify-between gap-3 px-4 min-h-12 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600 ${
      selected ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
    }`}
  >
    <span className="min-w-0">
      <span className={`block text-[15px] ${selected ? 'font-semibold text-emerald-900' : 'font-medium text-slate-800'}`}>{label}</span>
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </span>
    <span
      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
        selected ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300'
      }`}
      aria-hidden="true"
    >
      {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
    </span>
  </button>
);

const Section: React.FC<{ icon: React.ElementType; title: string; note?: string; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  note,
  children,
}) => (
  <section className="space-y-2">
    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
      <Icon className="w-4 h-4 text-emerald-700" />
      {title}
    </h2>
    {children}
    {note && <p className="text-[11px] text-slate-500 leading-relaxed">{note}</p>}
  </section>
);

/** Lets a signed-in user choose the name shown in the app (saved on the account). */
const NameEditor: React.FC<{ name: string }> = ({ name }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authProvider.updateProfile) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setError(null);
          setEditing(true);
        }}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800 hover:underline cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5" />
        {t('Edit name')}
      </button>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = value.trim();
    if (!clean) {
      setError(t('Enter a name (up to 60 characters).'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = (await authProvider.updateProfile?.({ display_name: clean })) ?? false;
      if (ok) setEditing(false);
      else setError(t("We couldn't save your name. Try again in a moment."));
    } catch {
      setError(t("We couldn't save your name. Try again in a moment."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-2" noValidate>
      <label htmlFor="display-name" className="block text-[13px] font-semibold text-slate-800">
        {t('Name shown in the app')}
      </label>
      <input
        id="display-name"
        type="text"
        maxLength={60}
        autoComplete="name"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        aria-invalid={!!error}
        aria-describedby={error ? 'display-name-error' : undefined}
        className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
      />
      {error && (
        <p id="display-name-error" role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
        >
          {t('Save name')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(false)}
          className="flex-1 h-10 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-[13px] font-semibold cursor-pointer disabled:opacity-60"
        >
          {t('Cancel')}
        </button>
      </div>
    </form>
  );
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenAuth }) => {
  const lang = useLanguage();
  const country = useCountry();
  const user = useAuthUser();
  const [deleting, setDeleting] = useState(false);
  const [wasDeleted, setWasDeleted] = useState(false);

  return (
    <div className="pb-8 space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('Account settings')}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t('Language and country are saved on this device.')}</p>
      </div>

      <Section icon={UserRound} title={t('Account')}>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#08142e] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {userInitials(user)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <NameEditor name={user.name} />
              {authProvider.isPreview && (
                <p className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                  <span className="font-bold">{t('TEST ACCOUNT')}</span> · {t('Test account: nothing is sent or stored on a server.')}
                </p>
              )}
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('Signing out removes your session from this device. Your account stays saved; sign in again any time with Google, Apple or an email code.')}
              </p>
              <button
                onClick={() => void authProvider.signOut()}
                className="w-full h-10 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-[13px] font-semibold cursor-pointer"
              >
                {t('Sign out')}
              </button>
              {authProvider.deleteAccount && (
                <button
                  onClick={() => setDeleting(true)}
                  className="w-full h-10 rounded-lg text-rose-700 hover:bg-rose-50 text-[13px] font-semibold cursor-pointer"
                >
                  {t('Delete account')}
                </button>
              )}
            </>
          ) : (
            <>
              {wasDeleted && (
                <p role="status" className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[12px] font-medium text-emerald-900">
                  {t('Your account was deleted.')}
                </p>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("You're browsing as a guest")}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {t('Sign in to sync saved products, alerts and Reels across your devices.')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenAuth('sign-in')}
                  className="flex-1 h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-semibold cursor-pointer"
                >
                  {t('Sign in')}
                </button>
                <button
                  onClick={() => onOpenAuth('create')}
                  className="flex-1 h-10 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-[13px] font-semibold cursor-pointer"
                >
                  {t('Create an account')}
                </button>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section icon={Globe2} title={t('Language')}>
        <div role="radiogroup" aria-label={t('Language')} className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {LANGUAGES.map((l) => (
            <Option key={l.code} selected={l.code === lang} label={l.label} onSelect={() => {
                setLanguage(l.code);
                void authProvider.updateProfile?.({ language: l.code });
              }} />
          ))}
        </div>
      </Section>

      <Section icon={MapPin} title={t('Country')} note={t('Your country decides which stores we suggest and, once real offers are available, which prices you see. It also adjusts voice search. You can change it later in Account settings.')}>
        <div role="radiogroup" aria-label={t('Country')} className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {COUNTRIES.map((c) => (
            <Option key={c.code} selected={c.code === country} label={countryName(c.code, lang)} onSelect={() => {
                setCountry(c.code);
                void authProvider.updateProfile?.({ country: c.code });
              }} />
          ))}
        </div>
      </Section>
      {CONTACT_EMAIL && (
        <Section icon={LifeBuoy} title={t('Help')}>
          <a
            href={contactHref(t('OvoPrice: question or feedback'))}
            className="flex items-center justify-center w-full h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[14px] font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {t('Contact us')}
          </a>
        </Section>
      )}

      {deleting && (
        <DeleteAccountSheet
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            setWasDeleted(true);
          }}
        />
      )}
    </div>
  );
};
