import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface StatusChipProps {
  label: string;
  variant?: 'default' | 'active' | 'suspended' | 'closed' | 'paid' | 'partial' | 'unpaid' | 'overdue';
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, className = '' }) => {
  const { tStatus } = useLanguage();
  // In the design system, status chips uniformly use the signature pill shape with #EEEEF8 lavender background and #5458A7 text!
  return (
    <span
      className={`inline-flex items-center justify-center px-3.5 py-1 text-xs font-bold font-manrope rounded-full bg-[#EEEEF8] text-[#5458A7] tracking-wide shadow-xs ${className}`}
    >
      {tStatus(label)}
    </span>
  );
};
