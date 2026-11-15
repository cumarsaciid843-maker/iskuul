import React from 'react';
import { Globe } from 'lucide-react';
import { LANGUAGE_OPTIONS, Language } from '../../i18n';
import { useLanguage } from '../../context/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'light';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'default',
  className = '',
}) => {
  const { language, setLanguage, t } = useLanguage();

  const containerStyle =
    variant === 'light'
      ? 'bg-white/15 border-white/25 text-white hover:bg-white/20'
      : 'bg-[#F8F8FD] border-[#E4E6F3] text-[#23265A] hover:border-[#C7CBE8]';

  const iconStyle = variant === 'light' ? 'text-white/90' : 'text-[#5458A7]';
  const selectTextStyle = variant === 'light' ? 'text-white' : 'text-[#23265A]';

  return (
    <div
      className={`inline-flex items-center gap-1.5 border rounded-xl px-2.5 min-h-[40px] lg:min-h-0 py-1 transition-colors max-w-full ${containerStyle} ${className}`}
    >
      <Globe size={13} className={`${iconStyle} shrink-0`} />
      <select
        aria-label={t('lang_label')}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pe-1 max-w-[92px] sm:max-w-none truncate ${selectTextStyle}`}
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code} className="text-[#23265A] bg-white">
            {opt.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  );
};
