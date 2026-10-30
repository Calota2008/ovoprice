import React, { useState } from 'react';
import { isSafeHttpUrl } from '../utils/url';

/**
 * Small store mark. Shows the store's official logo only when the data source provides one
 * (for example from the affiliate network, with the store's permission); otherwise the initials.
 */
const initials = (name: string) =>
  name
    .replace(/\.(de|at|com)$/i, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

export const StoreBadge: React.FC<{ name: string; logo?: string; size?: 'sm' | 'md' }> = ({ name, logo, size = 'md' }) => {
  const [broken, setBroken] = useState(false);
  const box = size === 'sm' ? 'w-7 h-7 text-[9px]' : 'w-9 h-9 text-[10px]';
  if (logo && !broken && isSafeHttpUrl(logo)) {
    return (
      <span className={`${box} rounded-lg bg-white border border-slate-200 grid place-items-center overflow-hidden shrink-0`}>
        <img src={logo} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${box} rounded-lg bg-slate-100 border border-slate-200 grid place-items-center font-extrabold text-slate-600 shrink-0`}>
      {initials(name)}
    </span>
  );
};
