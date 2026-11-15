import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface LogoProps {
  variant?: 'light' | 'dark'; // 'light' is used on purple sidebar backgrounds, 'dark' is used on white/light backgrounds
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export const SchoolManagerLogo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  className = '',
  onClick,
}) => {
  const { t } = useLanguage();
  const isLight = variant === 'light';

  // Sizing factors
  const circleSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const pillHeight = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10';
  const fontSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const paddingX = size === 'sm' ? 'px-2.5' : size === 'lg' ? 'px-5' : 'px-4';
  const gapSize = size === 'sm' ? 'gap-1.5' : 'gap-2.5';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${gapSize} select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Circle Temple Icon */}
      <div
        className={`${circleSize} rounded-full flex items-center justify-center transition-transform hover:scale-105 shrink-0 ${
          isLight ? 'bg-white text-[#5458A7]' : 'bg-[#5458A7] text-white shadow-sm'
        }`}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Pediment (triangle roof) */}
          <path d="M3 9.5L12 3l9 6.5" />
          <path d="M4 9.5h16" />
          {/* Columns */}
          <line x1="6" y1="12" x2="6" y2="18" />
          <line x1="10" y1="12" x2="10" y2="18" />
          <line x1="14" y1="12" x2="14" y2="18" />
          <line x1="18" y1="12" x2="18" y2="18" />
          {/* Base */}
          <line x1="3" y1="18" x2="21" y2="18" />
          <line x1="2" y1="21" x2="22" y2="21" />
        </svg>
      </div>

      {/* Pill Badge: "School | Manager" */}
      <div
        className={`inline-flex items-stretch rounded-full overflow-hidden font-sora font-extrabold ${pillHeight} ${
          isLight
            ? 'border-2 border-white shadow-sm'
            : 'border-2 border-[#5458A7]'
        }`}
      >
        <div
          className={`flex items-center justify-center bg-[#5458A7] text-white ${paddingX} ${fontSize} tracking-tight font-extrabold`}
        >
          {t('brand_school')}
        </div>
        <div
          className={`flex items-center justify-center bg-white text-[#5458A7] ${paddingX} ${fontSize} tracking-tight font-extrabold`}
        >
          {t('brand_manager')}
        </div>
      </div>
    </div>
  );
};
