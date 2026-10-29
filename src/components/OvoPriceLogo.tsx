import React from 'react';
/** Vector mark (public/ovoprice_mark.svg): stays sharp at every size. */
const OVOPRICE_MARK = '/ovoprice_mark.svg';

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
    md: 'w-8 h-8 lg:w-10 lg:h-10',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-lg lg:text-xl font-bold tracking-tight',
    lg: 'text-xl font-bold tracking-tight',
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src={OVOPRICE_MARK}
        alt="OvoPrice"
        width={40}
        height={40}
        className={`${iconSizes[size]} object-contain shrink-0`}
      />

      {!iconOnly && (
        <span className={`text-slate-900 ${textSizes[size]}`}>
          Ovo<span className="text-[#0284c7]">Price</span>
        </span>
      )}
    </div>
  );
};
