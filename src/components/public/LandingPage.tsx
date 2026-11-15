import React, { useEffect, useState } from 'react';
import { SchoolManagerLogo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';
import { TopPWAInstallBanner, PWAInstallFooterLink } from '../common/PWAStatus';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Clock, CircleDollarSign, BarChart3, Check, Menu, X } from 'lucide-react';
import { storage } from '../../services/storage';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToGetStarted: (selectedPlanId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToGetStarted,
}) => {
  const { t, tPlanText } = useLanguage();
  const [plans, setPlans] = useState(() => storage.getPlans());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setPlans(storage.getPlans());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileNavOpen]);

  const scrollTo = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-dvh w-full max-w-full bg-white text-[#23265A] font-manrope selection:bg-[#5458A7] selection:text-white">
      {/* Top Full-Width PWA Install Banner (Public Landing Only) */}
      <TopPWAInstallBanner />

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E6F3]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="min-w-0 shrink-0">
            <div className="sm:hidden">
              <SchoolManagerLogo variant="dark" size="sm" />
            </div>
            <div className="hidden sm:block">
              <SchoolManagerLogo variant="dark" size="md" />
            </div>
          </div>

          {/* Navigation Links (Desktop >= 1024px) */}
          <div className="hidden lg:flex items-center gap-8 font-semibold text-sm text-[#23265A]">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-[#5458A7] transition-colors cursor-pointer"
            >
              {t('land_nav_home')}
            </button>
            <button
              type="button"
              onClick={() => scrollTo('about-us')}
              className="hover:text-[#5458A7] transition-colors cursor-pointer"
            >
              {t('land_nav_about')}
            </button>
            <button
              type="button"
              onClick={() => scrollTo('pricing')}
              className="hover:text-[#5458A7] transition-colors cursor-pointer"
            >
              {t('land_nav_pricing')}
            </button>
          </div>

          {/* Action Buttons & Language Selector */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            <button
              type="button"
              onClick={onGoToLogin}
              className="border-2 border-[#5458A7] text-[#5458A7] font-bold text-xs sm:text-sm px-2.5 sm:px-6 min-h-[40px] sm:min-h-[42px] rounded-full hover:bg-[#F3F4FB] transition-all cursor-pointer whitespace-nowrap"
            >
              {t('land_nav_login')}
            </button>
            <button
              type="button"
              onClick={() => onGoToGetStarted()}
              className="bg-[#5458A7] text-white font-bold text-sm px-4 sm:px-6 py-2 rounded-full hover:opacity-95 shadow-sm transition-all cursor-pointer hidden sm:inline-flex items-center min-h-[42px]"
            >
              {t('land_nav_getStarted')}
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#23265A] hover:bg-[#F3F4FB] cursor-pointer"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile & Tablet Navigation Drawer (<1024px) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 end-0 w-[min(20rem,88vw)] bg-white shadow-2xl border-s border-[#E4E6F3] flex flex-col justify-between p-5 h-dvh overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E4E6F3]">
                <SchoolManagerLogo variant="dark" size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close menu"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#23265A] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl text-start font-bold text-sm text-[#23265A] hover:bg-[#EEEEF8] hover:text-[#5458A7] cursor-pointer"
                >
                  {t('land_nav_home')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('about-us')}
                  className="w-full min-h-[44px] px-4 rounded-xl text-start font-bold text-sm text-[#23265A] hover:bg-[#EEEEF8] hover:text-[#5458A7] cursor-pointer"
                >
                  {t('land_nav_about')}
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('pricing')}
                  className="w-full min-h-[44px] px-4 rounded-xl text-start font-bold text-sm text-[#23265A] hover:bg-[#EEEEF8] hover:text-[#5458A7] cursor-pointer"
                >
                  {t('land_nav_pricing')}
                </button>
              </div>

              <div className="pt-2 border-t border-[#E4E6F3]">
                <LanguageSelector className="w-full justify-between" />
              </div>
            </div>

            <div className="pt-6 space-y-3 border-t border-[#E4E6F3]">
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onGoToGetStarted();
                }}
                className="w-full min-h-[44px] bg-[#5458A7] text-white font-bold text-sm py-3 rounded-full hover:opacity-95 shadow-sm cursor-pointer"
              >
                {t('land_nav_getStarted')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onGoToLogin();
                }}
                className="w-full min-h-[44px] border-2 border-[#5458A7] text-[#5458A7] font-bold text-sm py-3 rounded-full hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('land_nav_login')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-10 sm:py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 min-w-0">
            <h1 className="text-[clamp(1.9rem,5.4vw,3.75rem)] font-extrabold font-sora text-[#23265A] tracking-tight leading-[1.16] wrap-anywhere">
              {t('land_hero_title_1')} <br className="hidden sm:inline" />
              {t('land_hero_title_2')} <br className="hidden sm:inline" />
              {t('land_hero_title_3')}
            </h1>
            <p className="text-base sm:text-lg text-[#555A8A] max-w-xl font-normal leading-relaxed">
              {t('land_hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={() => onGoToGetStarted()}
                className="w-full sm:w-auto min-h-[48px] bg-[#5458A7] text-white font-bold text-base px-8 py-3.5 rounded-full hover:opacity-95 shadow-md transition-all cursor-pointer"
              >
                {t('land_hero_ctaPrimary')}
              </button>
              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full sm:w-auto min-h-[48px] border-2 border-[#5458A7] text-[#5458A7] font-bold text-base px-8 py-3.5 rounded-full hover:bg-[#F3F4FB] transition-all cursor-pointer"
              >
                {t('land_hero_ctaSecondary')}
              </button>
            </div>
          </div>

          {/* Right 4 Feature Tiles Container */}
          <div className="lg:col-span-5 min-w-0">
            <div className="border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 lg:p-8 bg-white shadow-xs">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Students */}
                <div className="bg-[#EEF0F9] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5458A7] text-white flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <span className="font-bold text-sm text-[#23265A] font-sora wrap-anywhere">
                    {t('land_tile_students')}
                  </span>
                </div>

                {/* Attendance */}
                <div className="bg-[#EEF0F9] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5458A7] text-white flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <span className="font-bold text-sm text-[#23265A] font-sora wrap-anywhere">
                    {t('land_tile_attendance')}
                  </span>
                </div>

                {/* Fees */}
                <div className="bg-[#EEF0F9] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5458A7] text-white flex items-center justify-center shrink-0">
                    <CircleDollarSign size={20} />
                  </div>
                  <span className="font-bold text-sm text-[#23265A] font-sora wrap-anywhere">
                    {t('land_tile_fees')}
                  </span>
                </div>

                {/* Reports */}
                <div className="bg-[#EEF0F9] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#5458A7] text-white flex items-center justify-center shrink-0">
                    <BarChart3 size={20} />
                  </div>
                  <span className="font-bold text-sm text-[#23265A] font-sora wrap-anywhere">
                    {t('land_tile_reports')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-12 sm:py-20 bg-[#FBFCFE] border-y border-[#E4E6F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            {/* Founder Photo */}
            <div className="lg:col-span-5 flex flex-col items-start min-w-0">
              <div className="w-full max-w-sm rounded-[24px] overflow-hidden bg-white shadow-sm border border-[#E4E6F3]">
                <img
                  src="/assets/omar_said_hassan.png"
                  alt={t('land_about_founderName')}
                  className="w-full h-auto object-cover object-top aspect-4/5"
                />
              </div>
              <div className="mt-4">
                <h4 className="text-base font-bold font-sora text-[#23265A]">
                  {t('land_about_founderName')}
                </h4>
                <p className="text-xs font-semibold text-[#5458A7]">
                  {t('land_about_founderTitle')}
                </p>
              </div>
            </div>

            {/* About Us Narrative */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 min-w-0">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#5458A7] font-sora">
                {t('land_about_badge')}
              </span>
              <h2 className="text-[clamp(1.5rem,3.6vw,2.25rem)] font-extrabold font-sora text-[#23265A] tracking-tight leading-snug">
                {t('land_about_title_1')} <br className="hidden sm:inline" />
                {t('land_about_title_2')}
              </h2>
              <p className="text-sm sm:text-base text-[#4E527D] leading-relaxed">
                {t('land_about_p1')}
              </p>

              {/* Quote Card */}
              <div className="bg-[#EEF0F9] border border-[#E2E5F5] rounded-[20px] p-5 sm:p-7">
                <p className="italic text-sm sm:text-base text-[#23265A] font-medium leading-relaxed">
                  {t('land_about_quote')}
                </p>
              </div>

              <p className="text-sm sm:text-base text-[#4E527D] leading-relaxed">
                {t('land_about_p2')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-14 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16 space-y-3">
          <h2 className="text-[clamp(1.5rem,3.6vw,2.25rem)] font-extrabold font-sora text-[#23265A]">
            {t('land_pricing_title')}
          </h2>
          <p className="text-sm sm:text-base text-[#555A8A] max-w-xl mx-auto">
            {t('land_pricing_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {plans.map((plan) => {
            const isStandard = !!plan.popular;

            return (
              <div
                key={plan.id}
                className={`rounded-[24px] p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 min-w-0 ${
                  isStandard
                    ? 'bg-[#5458A7] text-white shadow-xl lg:scale-105 z-10 border-2 border-[#5458A7]'
                    : 'bg-white text-[#23265A] border-2 border-[#5458A7] hover:shadow-md'
                }`}
              >
                <div className="space-y-6">
                  <div>
                    <h3
                      className={`text-xl sm:text-2xl font-extrabold font-sora ${
                        isStandard ? 'text-white' : 'text-[#23265A]'
                      }`}
                    >
                      {tPlanText(plan.name)}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-1 flex-wrap">
                      <span dir="ltr" className="text-3xl sm:text-4xl font-extrabold font-sora tracking-tight ltr-inline">
                        ${plan.price.toFixed(2)}
                      </span>
                      <span
                        className={`text-sm ${
                          isStandard ? 'text-white/80' : 'text-[#6B7280]'
                        }`}
                      >
                        {t('common_perMonth')}
                      </span>
                    </div>
                    <p
                      className={`text-xs font-semibold mt-2 ${
                        isStandard ? 'text-white/90' : 'text-[#5458A7]'
                      }`}
                    >
                      {t('land_pricing_upToStudents', { count: plan.studentLimit })}
                    </p>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-3 pt-4 border-t border-current/15">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                        <Check
                          size={16}
                          className={`shrink-0 mt-0.5 ${
                            isStandard ? 'text-white' : 'text-[#5458A7]'
                          }`}
                        />
                        <span className={isStandard ? 'text-white/95' : 'text-[#4A5080]'}>
                          {tPlanText(feature)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Button */}
                <div className="pt-8">
                  <button
                    type="button"
                    onClick={() => onGoToGetStarted(plan.id)}
                    className={`w-full min-h-[44px] py-3.5 rounded-full font-bold text-sm transition-all cursor-pointer ${
                      isStandard
                        ? 'bg-white text-[#5458A7] hover:bg-white/90 shadow-sm'
                        : 'bg-[#5458A7] text-white hover:opacity-95'
                    }`}
                  >
                    {t('land_pricing_cta')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F8F9FD] border-t border-[#E4E6F3] py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <SchoolManagerLogo variant="dark" size="sm" />
          <p className="text-xs text-[#6B7280] font-manrope text-center">
            {t('land_footer_copyright')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#555A8A] font-semibold">
            <button
              type="button"
              className="min-h-[44px] md:min-h-0 px-1 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {t('land_nav_home')}
            </button>
            <button
              type="button"
              className="min-h-[44px] md:min-h-0 px-1 cursor-pointer"
              onClick={() => scrollTo('about-us')}
            >
              {t('land_nav_about')}
            </button>
            <button
              type="button"
              className="min-h-[44px] md:min-h-0 px-1 cursor-pointer"
              onClick={() => scrollTo('pricing')}
            >
              {t('land_nav_pricing')}
            </button>
            <button
              type="button"
              className="min-h-[44px] md:min-h-0 px-1 cursor-pointer"
              onClick={onGoToLogin}
            >
              {t('land_nav_login')}
            </button>
            <PWAInstallFooterLink />
          </div>
        </div>
      </footer>
    </div>
  );
};
