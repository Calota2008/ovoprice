import React from 'react';
import ovoPriceLogoSrc from '../assets/images/ovoprice_logo.png';

export interface OvoPriceLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const OvoPriceLogo: React.FC<OvoPriceLogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-lg font-bold tracking-tight',
    lg: 'text-xl font-bold tracking-tight',
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src={ovoPriceLogoSrc}
        alt="OvoPrice"
        className={`${iconSizes[size]} rounded-lg object-contain shadow-xs shrink-0 bg-[#08142e]`}
      />

      {!iconOnly && (
        <span className={`text-slate-900 ${textSizes[size]}`}>
          Ovo<span className="text-[#0284c7]">Price</span>
        </span>
      )}
    </div>
  );
};
