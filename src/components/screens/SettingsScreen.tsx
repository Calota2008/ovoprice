import React from 'react';
import { Check, Globe2, MapPin, UserRound } from 'lucide-react';
import { LANGUAGES, setLanguage, t, useLanguage } from '../../i18n';
import { COUNTRIES, countryName, setCountry, useCountry } from '../../i18n/country';
import { authProvider } from '../../services/authProvider';

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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenAuth }) => {
  const lang = useLanguage();
  const country = useCountry();
  const user = authProvider.getUser();

  return (
    <div className="pb-8 space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('Account settings')}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t('Language and country are saved on this device.')}</p>
      </div>

      <Section icon={UserRound} title={t('Account')}>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {user ? (
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          ) : (
            <>
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
            <Option key={l.code} selected={l.code === lang} label={l.label} onSelect={() => setLanguage(l.code)} />
          ))}
        </div>
      </Section>

      <Section icon={MapPin} title={t('Country')} note={t('Sets the stores and prices you see. You can change it later in Account settings.')}>
        <div role="radiogroup" aria-label={t('Country')} className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {COUNTRIES.map((c) => (
            <Option key={c.code} selected={c.code === country} label={countryName(c.code, lang)} onSelect={() => setCountry(c.code)} />
          ))}
        </div>
      </Section>
    </div>
  );
};
