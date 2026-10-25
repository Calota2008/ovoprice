import React, { useState } from 'react';
import { Cloud, X } from 'lucide-react';
import { authProvider } from '../services/authProvider';

const KEY = 'ovoprice_auth_nudge_dismissed_v1';
const read = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Quiet one-line invitation shown to guests next to things they saved. Dismissible, never blocks. */
export const AuthNudge: React.FC<{ onOpenAuth: () => void; message: string }> = ({ onOpenAuth, message }) => {
  const [dismissed, setDismissed] = useState(read);
  if (dismissed || authProvider.getUser()) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white pl-3 pr-1.5 py-2">
      <Cloud className="w-4 h-4 text-emerald-700 shrink-0" />
      <p className="flex-1 text-xs text-slate-600 leading-snug">
        {message}{' '}
        <button onClick={onOpenAuth} className="font-semibold text-emerald-800 hover:underline cursor-pointer">
          Sign in
        </button>
      </p>
      <button
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* storage unavailable: dismiss for this visit only */
          }
          setDismissed(true);
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
