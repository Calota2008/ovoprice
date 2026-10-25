import React from 'react';
import { Home, Search, Bookmark, Bell } from 'lucide-react';
import { ActiveScreen } from '../types';

interface BottomNavProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  unreadAlertsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  unreadAlertsCount = 0,
}) => {
  const isHomeActive = activeScreen === 'home';
  const isSearchActive = activeScreen === 'search';
  const isSavedActive = activeScreen === 'saved';
  const isAlertsActive = activeScreen === 'alerts';

  return (
    <nav
      className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 max-w-md mx-auto w-full transition-all"
      aria-label="Main Navigation"
    >
      <div className="grid grid-cols-4 h-16 items-center px-2">
        {/* Home */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors ${
            isHomeActive
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'text-emerald-700 stroke-[2.3]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-tight">Home</span>
        </button>

        {/* Search */}
        <button
          onClick={() => onNavigate('search')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors ${
            isSearchActive
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <Search className={`w-5 h-5 ${isSearchActive ? 'text-emerald-700 stroke-[2.3]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-tight">Search</span>
        </button>

        {/* Saved */}
        <button
          onClick={() => onNavigate('saved')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors ${
            isSavedActive
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isSavedActive ? 'text-emerald-700 stroke-[2.3]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] tracking-tight">Saved</span>
        </button>

        {/* Alerts */}
        <button
          onClick={() => onNavigate('alerts')}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer transition-colors relative ${
            isAlertsActive
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <Bell className={`w-5 h-5 ${isAlertsActive ? 'text-emerald-700 stroke-[2.3]' : 'stroke-[1.8]'}`} />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[11px] tracking-tight">Alerts</span>
        </button>
      </div>
    </nav>
  );
};
