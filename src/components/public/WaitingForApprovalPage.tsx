import React from 'react';
import { SchoolManagerLogo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';
import { Check, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface WaitingForApprovalPageProps {
  onGoToHome?: () => void;
}

export const WaitingForApprovalPage: React.FC<WaitingForApprovalPageProps> = ({ onGoToHome }) => {
  const { school, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh w-full max-w-full bg-white font-manrope">
      {/* Top Header */}
      <header className="border-b border-[#E4E6F3] px-4 sm:px-12 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div className="shrink-0">
          <div className="sm:hidden">
            <SchoolManagerLogo variant="dark" size="sm" />
          </div>
          <div className="hidden sm:block">
            <SchoolManagerLogo variant="dark" size="md" />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <LanguageSelector />
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 min-h-[40px] sm:min-h-0 text-xs font-bold text-[#5458A7] hover:text-[#23265A] px-3.5 py-1.5 rounded-full border border-[#D5D7EE] transition-all cursor-pointer"
          >
            <LogOut size={14} className="rtl:rotate-180" />
            <span>{t('nav_logout')}</span>
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] p-5 sm:p-12 bg-white shadow-xs space-y-6 sm:space-y-8">
          {/* Top Clock Icon */}
          <div className="w-14 h-14 rounded-full bg-[#5458A7] text-white flex items-center justify-center">
            <Clock size={28} />
          </div>

          <div>
            <h2 className="text-[clamp(1.5rem,3.6vw,1.875rem)] font-extrabold font-sora text-[#23265A] tracking-tight">
              {t('gs_paymentReceivedTitle')}
            </h2>
            <p className="text-sm sm:text-base text-[#555A8A] mt-3 leading-relaxed wrap-anywhere">
              {t('wait_descSchool', { schoolName: school?.name || '' })}
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#5458A7] text-white flex items-center justify-center shrink-0">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="font-semibold text-sm text-[#23265A]">
                {t('gs_check_registered')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#5458A7] text-white flex items-center justify-center shrink-0">
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="font-semibold text-sm text-[#23265A]">
                {t('gs_check_submitted')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-[#5458A7] text-[#5458A7] flex items-center justify-center shrink-0">
                <Clock size={16} strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-sm text-[#23265A]">
                {t('gs_check_waiting')}
              </span>
            </div>
          </div>

          {/* Action to log out or return */}
          <div className="pt-6 border-t border-[#E4E6F3] flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onGoToHome ? onGoToHome : logout}
              className="w-full sm:w-auto min-h-[44px] text-sm font-bold text-[#5458A7] hover:underline cursor-pointer"
            >
              {t('gs_returnHome')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto min-h-[44px] bg-[#5458A7] text-white font-bold text-sm px-6 py-2.5 rounded-full hover:opacity-95 cursor-pointer shadow-sm"
            >
              {t('nav_logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
