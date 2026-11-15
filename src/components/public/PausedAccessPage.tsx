import React, { useState } from 'react';
import { SchoolManagerLogo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';
import { Lock, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { storage } from '../../services/storage';

export const PausedAccessPage: React.FC = () => {
  const { school, logout, refresh } = useAuth();
  const { t, tMethod, tPlanText } = useLanguage();
  const plans = storage.getPlans();
  const settings = storage.getSettings();

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(school?.planId || plans[1]?.id || plans[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'Mobile money' | 'Bank transfer'>('Mobile money');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleRenewPayment = async () => {
    if (!school) return;
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await storage.renewSchoolSubscription(school.id, selectedPlanId || selectedPlan?.id || '', paymentMethod);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setShowPayModal(false);
        void refresh();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit renewal payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full max-w-full bg-white font-manrope flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#E4E6F3] px-4 sm:px-12 py-4 sm:py-5 flex items-center justify-between gap-2 flex-wrap">
        <div className="shrink-0">
          <div className="sm:hidden">
            <SchoolManagerLogo variant="dark" size="sm" />
          </div>
          <div className="hidden sm:block">
            <SchoolManagerLogo variant="dark" size="md" />
          </div>
        </div>
        <LanguageSelector />
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] p-5 sm:p-12 bg-white shadow-xs space-y-6 sm:space-y-7">
          {/* Lock Icon Circle */}
          <div className="w-14 h-14 rounded-full bg-[#5458A7] text-white flex items-center justify-center">
            <Lock size={26} strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-[clamp(1.5rem,3.6vw,2.25rem)] font-extrabold font-sora text-[#23265A] tracking-tight">
              {t('paused_title')}
            </h1>
            <p className="text-sm sm:text-base text-[#555A8A] mt-3 leading-relaxed">
              {t('paused_desc')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              className="w-full sm:w-auto min-h-[48px] bg-[#5458A7] text-white font-bold text-sm px-8 py-3.5 rounded-full hover:opacity-95 shadow-md transition-all cursor-pointer"
            >
              {t('paused_payNow')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto min-h-[48px] border-2 border-[#5458A7] text-[#5458A7] font-bold text-sm px-8 py-3.5 rounded-full hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              {t('nav_logout')}
            </button>
          </div>
        </div>
      </main>

      <footer className="py-6 px-4 text-center text-xs text-[#9CA3AF]">
        {t('paused_footer')}
      </footer>

      {/* Payment Renewal Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-lg w-full p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#23265A]">
              {t('paused_modalTitle')}
            </h3>

            {isSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <Check size={28} />
                </div>
                <div className="font-bold text-lg text-[#23265A]">
                  {t('paused_successTitle')}
                </div>
                <div className="text-xs text-[#6B7280]">
                  {t('paused_successDesc')}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    {t('paused_selectPlan')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {plans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-3 min-h-[44px] rounded-xl border-2 text-center transition-all cursor-pointer ${
                          selectedPlanId === p.id
                            ? 'border-[#5458A7] bg-[#EEEEF8] text-[#5458A7]'
                            : 'border-[#E4E6F3] text-[#23265A]'
                        }`}
                      >
                        <div className="font-bold text-xs">{tPlanText(p.name)}</div>
                        <div dir="ltr" className="font-extrabold text-sm mt-0.5 ltr-inline">
                          ${p.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    {t('gs_paymentMethod')}
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setPaymentMethod('Mobile money')}
                      className={`block p-3.5 rounded-xl border-2 cursor-pointer ${
                        paymentMethod === 'Mobile money'
                          ? 'border-[#5458A7] bg-[#EEEEF8]'
                          : 'border-[#E4E6F3]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#23265A]">
                        {tMethod('Mobile money')}
                      </div>
                      <div dir="ltr" className="text-[11px] text-[#5458A7] font-semibold mt-0.5 ltr-inline wrap-anywhere">
                        {settings.mobileMoneyNumber}
                      </div>
                    </label>

                    <label
                      onClick={() => setPaymentMethod('Bank transfer')}
                      className={`block p-3.5 rounded-xl border-2 cursor-pointer ${
                        paymentMethod === 'Bank transfer'
                          ? 'border-[#5458A7] bg-[#EEEEF8]'
                          : 'border-[#E4E6F3]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#23265A]">
                        {tMethod('Bank transfer')}
                      </div>
                      <div className="text-[11px] text-[#5458A7] font-semibold mt-0.5 wrap-anywhere">
                        {settings.bankName} · {t('gs_bankAccPrefix')}{' '}
                        <span dir="ltr" className="ltr-inline">{settings.accountNumber}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F4F5FB] flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#6B7280]">
                    {t('paused_totalRenewal')}
                  </span>
                  <span dir="ltr" className="text-xl font-extrabold font-sora text-[#23265A] ltr-inline">
                    ${(selectedPlan?.price ?? 0).toFixed(2)}
                  </span>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium wrap-anywhere">
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full border border-[#D5D7EE] text-sm font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                  >
                    {t('common_cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRenewPayment}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full bg-[#5458A7] text-white text-sm font-bold hover:opacity-95 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {t('paused_submitRenew')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
