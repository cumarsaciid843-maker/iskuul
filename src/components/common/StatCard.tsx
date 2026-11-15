import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  highlight = false,
  className = '',
}) => {
  return (
    <div
      className={`rounded-[20px] p-4 sm:p-5 lg:p-6 min-w-0 transition-all border ${
        highlight
          ? 'bg-[#5458A7] text-white border-[#5458A7] shadow-sm'
          : 'bg-[#F2F3FA] text-[#23265A] border-[#E5E7F3]'
      } ${className}`}
    >
      <div
        className={`text-xs sm:text-sm font-semibold tracking-wide mb-1.5 sm:mb-2 truncate ${
          highlight ? 'text-white/80' : 'text-[#4A5080]'
        }`}
        title={label}
      >
        {label}
      </div>
      <div
        className={`text-[clamp(1.25rem,2.6vw,1.875rem)] leading-tight font-extrabold font-sora tracking-tight wrap-anywhere ${
          highlight ? 'text-white' : 'text-[#23265A]'
        }`}
      >
        {value === '' || value === null || value === undefined ? '--' : value}
      </div>
    </div>
  );
};
