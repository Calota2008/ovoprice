import React, { useState } from 'react';
import { ArrowLeft, User, Settings, LogOut } from 'lucide-react';
import { OvoPriceLogo } from './OvoPriceLogo';
import { authProvider } from '../services/authProvider';
import { useAuthUser, userInitials } from '../services/useAuthUser';

import { t } from '../i18n';
interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  unreadAlertsCount?: number;
  onOpenAlerts?: () => void;
  onOpenAuth?: (mode: 'sign-in' | 'create') => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  unreadAlertsCount = 0,
  onOpenAlerts,
  onOpenAuth,
  onOpenSettings,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const user = useAuthUser();

  return (
    <header className="sticky top-0 z-40 bg-[#faf8ff]/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between gap-3 max-w-md mx-auto w-full transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        {showBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-200/70 active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label={t("Go back")}
          >
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
        )}

        <div className="flex items-center gap-2 truncate">
          <OvoPriceLogo iconOnly={!!title} size="md" />
          {title ? (
            <h1 className="text-base font-bold text-slate-900 truncate tracking-tight">
              {title}
            </h1>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 relative">
        {/* User profile avatar matching screenshot */}
        <button
          onClick={() => setShowProfileMenu((prev) => !prev)}
          className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center hover:bg-emerald-800 active:scale-95 transition-transform cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600"
          aria-label={t("User Profile")}
          title={t("Account & Hub Settings")}
        >
          {user ? (
            <span className="text-[11px] font-bold text-white">{userInitials(user)}</span>
          ) : (
            <User className="w-4 h-4 text-emerald-50" />
          )}
        </button>

        {/* Profile Popover */}
        {showProfileMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowProfileMenu(false)}
            />
            <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 text-xs text-slate-600 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-[#08142e] text-white flex items-center justify-center font-bold text-sm">
                  {user ? userInitials(user) : 'OP'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{user ? user.name : t("Visitor")}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {user ? user.email : t("No account — your data stays on this device")}
                  </p>
                </div>
              </div>

              {user && authProvider.isPreview && (
                <p className="mt-2.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] font-medium text-amber-900">
                  <span className="font-bold">{t('TEST ACCOUNT')}</span> · {t('Test account: nothing is sent or stored on a server.')}
                </p>
              )}
              {!user && (
                <div className="pt-2.5 text-[11px] text-slate-500 leading-relaxed">
                  {t("Alerts and saved products are kept locally in your browser. Sign in to sync them across devices.")}
                </div>
              )}
              {!user && onOpenAuth && (
                <div className="pt-3 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAuth('sign-in');
                    }}
                    className="h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-semibold cursor-pointer"
                  >
                    {t("Sign in")}
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenAuth('create');
                    }}
                    className="h-9 rounded-lg text-[13px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {t("Create an account")}
                  </button>
                </div>
              )}
              {onOpenSettings && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenSettings();
                  }}
                  className="mt-3 pt-3 border-t border-slate-100 w-full flex items-center gap-2 text-[13px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  {t('Account settings')}
                </button>
              )}
              {user && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    void authProvider.signOut();
                  }}
                  className="mt-2.5 w-full flex items-center gap-2 text-[13px] font-semibold text-slate-700 hover:text-rose-700 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  {t('Sign out')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};
