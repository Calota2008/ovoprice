import React from 'react';
import { t } from '../i18n';
import type { LegalPage } from '../utils/legal';

/** Links to the legal pages. Shown under every screen so the Impressum is always one tap away. */
export const LegalFooter: React.FC<{ onOpen: (page: LegalPage) => void }> = ({ onOpen }) => {
  const link = 'font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600';
  return (
    <footer className="px-4 pb-4 pt-1 text-center text-[11px] text-slate-500">
      <nav aria-label={t('Legal')} className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap">
        <button type="button" onClick={() => onOpen('impressum')} className={link}>
          {t('Impressum')}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => onOpen('privacy')} className={link}>
          {t('Privacy')}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => onOpen('terms')} className={link}>
          {t('Terms')}
        </button>
      </nav>
    </footer>
  );
};
