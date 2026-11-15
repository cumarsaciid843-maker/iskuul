import React from 'react';
import { Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  actions?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  actions,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`mb-5 sm:mb-6 flex flex-col gap-3 min-w-0 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 min-w-0">
        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-[clamp(1.375rem,2.6vw,1.875rem)] font-extrabold font-sora text-[#23265A] tracking-tight leading-tight wrap-anywhere">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#6B7280] font-manrope mt-1 wrap-anywhere">
              {subtitle}
            </p>
          )}
        </div>

        {/* Search and Action Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 min-w-0">
          {searchPlaceholder && (
            <div className="relative w-full sm:w-72 lg:w-80 min-w-0">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full min-h-[44px] ps-10 pe-4 py-2.5 bg-white border border-[#D5D7EE] rounded-full text-sm text-[#23265A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7] transition-all shadow-xs"
              />
              <Search
                size={16}
                className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
            </div>
          )}

          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
