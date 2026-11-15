import React, { useState } from 'react';
import { SchoolManagerLogo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';
import { Building2, Users, LayoutGrid, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface LoginPageProps {
  onGoToGetStarted: () => void;
  onGoToHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onGoToGetStarted,
  onGoToHome,
}) => {
  const { login } = useAuth();
  const { t, tServiceMsg } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error ? tServiceMsg(res.error) : t('srv_invalidCredentials'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('srv_invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full max-w-full flex flex-col lg:flex-row bg-white font-manrope">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between p-5 sm:p-10 lg:p-20 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
            <div className="shrink-0">
              <div className="sm:hidden">
                <SchoolManagerLogo variant="dark" size="sm" onClick={onGoToHome} />
              </div>
              <div className="hidden sm:block">
                <SchoolManagerLogo variant="dark" size="md" onClick={onGoToHome} />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <LanguageSelector />
              <button
                type="button"
                onClick={onGoToHome}
                className="inline-flex items-center gap-1.5 min-h-[40px] lg:min-h-0 px-2 text-xs font-bold text-[#5458A7] hover:underline cursor-pointer"
              >
                <ArrowLeft size={14} className="rtl:rotate-180" />
                <span>{t('login_backHome')}</span>
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto mt-8 sm:mt-14 space-y-6 sm:space-y-8">
            <div>
              <h1 className="text-[clamp(1.65rem,4vw,2.25rem)] font-extrabold font-sora text-[#23265A] tracking-tight">
                {t('login_title')}
              </h1>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium wrap-anywhere">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#23265A] mb-2">
                  {t('login_emailLabel')}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  required
                  placeholder={t('login_emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7] transition-all text-start"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#23265A] mb-2">
                  {t('login_passwordLabel')}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  placeholder={t('login_passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7] transition-all text-start"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] bg-[#5458A7] text-white font-bold text-base py-3.5 rounded-full hover:opacity-95 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? t('login_signingIn') : t('login_submit')}
                </button>
              </div>

              <p className="text-xs text-[#6B7280] leading-relaxed pt-2">
                {t('login_forgotHelp')}{' '}
                <button
                  type="button"
                  onClick={onGoToGetStarted}
                  className="text-[#5458A7] font-bold hover:underline cursor-pointer"
                >
                  {t('login_useGetStarted')}
                </button>
              </p>
            </form>
          </div>
        </div>

        <div className="text-xs text-[#9CA3AF] text-center pt-8">
          {t('login_footer')}
        </div>
      </div>

      {/* Right Purple Panel ("One login for everyone") */}
      <div className="lg:w-1/2 bg-[#5458A7] text-white p-6 sm:p-12 lg:p-20 flex flex-col justify-center min-w-0">
        <div className="max-w-md mx-auto w-full space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-[clamp(1.5rem,3.6vw,2.25rem)] font-extrabold font-sora text-white tracking-tight">
              {t('login_rightTitle')}
            </h2>
            <p className="text-sm sm:text-base text-white/80 mt-3 font-normal leading-relaxed">
              {t('login_rightDesc')}
            </p>
          </div>

          {/* 3 Display-Only Demo Role Cards */}
          <div className="space-y-3 sm:space-y-4">
            {/* School Admin */}
            <div className="w-full bg-white text-[#23265A] rounded-2xl sm:rounded-full p-4 px-5 sm:px-6 flex flex-wrap items-center justify-between gap-2 shadow-md text-start select-none">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Building2 size={22} className="text-[#5458A7] shrink-0" />
                <span className="font-bold text-sm sm:text-base font-sora">
                  {t('login_card_admin_title')}
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7] shrink-0">
                {t('login_card_try')}
              </span>
            </div>

            {/* Teacher */}
            <div className="w-full bg-white text-[#23265A] rounded-2xl sm:rounded-full p-4 px-5 sm:px-6 flex flex-wrap items-center justify-between gap-2 shadow-md text-start select-none">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Users size={22} className="text-[#5458A7] shrink-0" />
                <span className="font-bold text-sm sm:text-base font-sora">
                  {t('login_card_teacher_title')}
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7] shrink-0">
                {t('login_card_try')}
              </span>
            </div>

            {/* Super Admin */}
            <div className="w-full bg-white text-[#23265A] rounded-2xl sm:rounded-full p-4 px-5 sm:px-6 flex flex-wrap items-center justify-between gap-2 shadow-md text-start select-none">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <LayoutGrid size={22} className="text-[#5458A7] shrink-0" />
                <span className="font-bold text-sm sm:text-base font-sora">
                  {t('login_card_super_title')}
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7] shrink-0">
                {t('login_card_try')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
