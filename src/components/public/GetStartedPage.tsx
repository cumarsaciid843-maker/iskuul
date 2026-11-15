import React, { useState } from 'react';
import { SchoolManagerLogo } from '../common/Logo';
import { LanguageSelector } from '../common/LanguageSelector';
import { Check, Clock, ArrowLeft } from 'lucide-react';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';

interface GetStartedPageProps {
  initialPlanId?: string;
  onGoToLogin: () => void;
  onGoToHome: () => void;
}

export const GetStartedPage: React.FC<GetStartedPageProps> = ({
  initialPlanId,
  onGoToLogin,
  onGoToHome,
}) => {
  const { t, tMethod, tPlanText } = useLanguage();
  const [plans, setPlans] = useState(() => storage.getPlans());
  const settings = storage.getSettings();

  React.useEffect(() => {
    if (plans.length === 0) {
      void storage.loadPublicData();
    }
    const unsub = storage.subscribe(() => {
      setPlans(storage.getPlans());
    });
    return unsub;
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form state
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 2 Form state
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialPlanId || plans[1]?.id || plans[0]?.id || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'Mobile money' | 'Bank transfer'>(
    'Mobile money'
  );

  React.useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(initialPlanId || plans[1]?.id || plans[0]?.id || '');
    }
  }, [plans, selectedPlanId, initialPlanId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setStep1Error(t('gs_err_schoolName'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setStep1Error(t('gs_err_email'));
      return;
    }
    if (!password || password.length < 6) {
      setStep1Error(t('gs_err_password'));
      return;
    }
    setStep1Error('');
    setStep(2);
  };

  const handlePaymentSubmit = async () => {
    setStep2Error('');
    setIsSubmitting(true);
    try {
      await storage.registerNewSchool(
        schoolName.trim(),
        email.trim(),
        password,
        selectedPlanId || selectedPlan?.id || '',
        paymentMethod
      );
      setStep(3);
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : 'Failed to submit school registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 1 RENDER
  if (step === 1) {
    return (
      <div className="min-h-dvh w-full max-w-full flex flex-col md:flex-row bg-white font-manrope">
        {/* Left Purple Sidebar with Stepper */}
        <div className="md:w-80 lg:w-1/3 bg-[#5458A7] text-white p-5 sm:p-8 lg:p-12 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="sm:hidden">
                <SchoolManagerLogo variant="light" size="sm" />
              </div>
              <div className="hidden sm:block">
                <SchoolManagerLogo variant="light" size="md" />
              </div>
              <LanguageSelector variant="light" />
            </div>

            <div className="mt-6 md:mt-16 flex md:flex-col gap-3 md:gap-8 overflow-x-auto pb-1 md:pb-0">
              {/* Step 1 */}
              <div className="flex items-center gap-2.5 md:gap-4 shrink-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white text-[#5458A7] flex items-center justify-center font-bold text-sm md:text-base shadow-sm shrink-0">
                  1
                </div>
                <span className="font-bold text-xs sm:text-sm md:text-base text-white font-manrope">
                  {t('gs_step1')}
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-2.5 md:gap-4 opacity-70 shrink-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/60 flex items-center justify-center font-bold text-sm md:text-base text-white shrink-0">
                  2
                </div>
                <span className="font-medium text-xs sm:text-sm md:text-base text-white font-manrope">
                  {t('gs_step2')}
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-2.5 md:gap-4 opacity-70 shrink-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/60 flex items-center justify-center font-bold text-sm md:text-base text-white shrink-0">
                  3
                </div>
                <span className="font-medium text-xs sm:text-sm md:text-base text-white font-manrope">
                  {t('gs_step3')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 md:pt-8">
            <button
              type="button"
              onClick={onGoToHome}
              className="inline-flex items-center gap-2 min-h-[40px] md:min-h-0 text-xs font-semibold text-white/85 hover:text-white cursor-pointer"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" />
              <span>{t('gs_backHome')}</span>
            </button>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex-1 flex items-center justify-center p-5 sm:p-10 lg:p-16 min-w-0">
          <div className="w-full max-w-lg space-y-6 sm:space-y-8 min-w-0">
            <div>
              <h1 className="text-[clamp(1.6rem,3.6vw,2.25rem)] font-extrabold font-sora text-[#23265A] tracking-tight">
                {t('gs_title')}
              </h1>
              <p className="text-sm sm:text-base text-[#555A8A] mt-2">
                {t('gs_subtitle')}
              </p>
            </div>

            {step1Error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium wrap-anywhere">
                {step1Error}
              </div>
            )}

            <form onSubmit={handleStep1Submit} className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#23265A] mb-2">
                  {t('gs_schoolName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('gs_schoolNamePh')}
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#23265A] mb-2">
                  {t('gs_emailLabel')}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  required
                  placeholder={t('gs_emailPh')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7] transition-all text-start"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#23265A] mb-2">
                  {t('gs_passwordLabel')}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  placeholder={t('gs_passwordPh')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[46px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7] transition-all text-start"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[48px] bg-[#5458A7] text-white font-bold text-base py-3.5 rounded-full hover:opacity-95 shadow-md transition-all cursor-pointer"
                >
                  {t('gs_continue')}
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-sm text-[#6B7280]">
                  {t('gs_alreadyHaveAccount')}{' '}
                </span>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-sm font-bold text-[#5458A7] hover:underline cursor-pointer"
                >
                  {t('gs_loginLink')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 RENDER
  if (step === 2) {
    return (
      <div className="min-h-dvh w-full max-w-full bg-white font-manrope">
        {/* Top Header */}
        <header className="border-b border-[#E4E6F3] px-4 sm:px-10 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
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
            <span className="text-xs sm:text-sm font-bold text-[#5458A7] font-sora">
              {t('gs_stepOf')}
            </span>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 sm:space-y-10 min-w-0">
              {/* Plan Picker */}
              <div>
                <h1 className="text-[clamp(1.5rem,3.2vw,1.875rem)] font-extrabold font-sora text-[#23265A] mb-5 sm:mb-6">
                  {t('gs_choosePlan')}
                </h1>
                <div className="space-y-3">
                  {plans.length === 0 && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium wrap-anywhere">
                      {storage.getLastPublicError() ||
                        'Unable to load subscription plans. Please ensure database RLS migration 003 is applied.'}
                    </div>
                  )}
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <label
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all min-h-[60px] ${
                          isSelected
                            ? 'border-[#5458A7] bg-[#EEEEF8] shadow-xs'
                            : 'border-[#E4E6F3] bg-white hover:border-[#C4C7E6]'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <input
                            type="radio"
                            name="plan"
                            checked={isSelected}
                            onChange={() => setSelectedPlanId(p.id)}
                            className="w-5 h-5 accent-[#5458A7] cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-base font-sora text-[#23265A]">
                              {tPlanText(p.name)}
                            </div>
                            <div className="text-xs text-[#5458A7] font-semibold mt-0.5">
                              {t('land_pricing_upToStudents', { count: p.studentLimit })}
                            </div>
                          </div>
                        </div>
                        <div dir="ltr" className="text-base font-extrabold font-sora text-[#23265A] ltr-inline shrink-0">
                          ${p.price.toFixed(2)} {t('common_mo')}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h2 className="text-[clamp(1.35rem,3vw,1.875rem)] font-extrabold font-sora text-[#23265A] mb-5 sm:mb-6">
                  {t('gs_paymentMethod')}
                </h2>
                <div className="space-y-3">
                  {/* Mobile Money */}
                  <label
                    onClick={() => setPaymentMethod('Mobile money')}
                    className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all min-h-[60px] ${
                      paymentMethod === 'Mobile money'
                        ? 'border-[#5458A7] bg-[#EEEEF8] shadow-xs'
                        : 'border-[#E4E6F3] bg-white hover:border-[#C4C7E6]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'Mobile money'}
                      onChange={() => setPaymentMethod('Mobile money')}
                      className="w-5 h-5 mt-0.5 accent-[#5458A7] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-base text-[#23265A]">
                        {tMethod('Mobile money')}
                      </div>
                      <div dir="ltr" className="text-xs text-[#5458A7] font-semibold mt-1 ltr-inline wrap-anywhere">
                        {settings.mobileMoneyNumber}
                      </div>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label
                    onClick={() => setPaymentMethod('Bank transfer')}
                    className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all min-h-[60px] ${
                      paymentMethod === 'Bank transfer'
                        ? 'border-[#5458A7] bg-[#EEEEF8] shadow-xs'
                        : 'border-[#E4E6F3] bg-white hover:border-[#C4C7E6]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'Bank transfer'}
                      onChange={() => setPaymentMethod('Bank transfer')}
                      className="w-5 h-5 mt-0.5 accent-[#5458A7] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-base text-[#23265A]">
                        {tMethod('Bank transfer')}
                      </div>
                      <div className="text-xs text-[#5458A7] font-semibold mt-1 leading-relaxed wrap-anywhere">
                        {settings.bankName} · {settings.accountName} · {t('gs_bankAccPrefix')}{' '}
                        <span dir="ltr" className="ltr-inline">{settings.accountNumber}</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 min-h-[44px] text-sm font-bold text-[#5458A7] hover:underline cursor-pointer"
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                  <span>{t('gs_backToDetails')}</span>
                </button>
              </div>
            </div>

            {/* Right Summary Card */}
            <div className="lg:col-span-5 min-w-0">
              <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
                <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#23265A]">
                  {t('gs_summaryTitle')}
                </h3>

                <div className="space-y-4 text-sm pb-6 border-b border-[#E4E6F3]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B7280]">{t('common_school')}</span>
                    <span className="font-bold text-[#23265A] text-end wrap-anywhere">
                      {schoolName || t('gs_yourSchoolFallback')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B7280]">{t('gs_planLabel')}</span>
                    <span className="font-bold text-[#23265A] text-end">
                      {selectedPlan ? tPlanText(selectedPlan.name) : '--'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 gap-2">
                  <span className="text-base font-bold text-[#23265A]">
                    {t('common_total')}
                  </span>
                  <span dir="ltr" className="text-2xl font-extrabold font-sora text-[#23265A] ltr-inline">
                    ${(selectedPlan?.price ?? 0).toFixed(2)}
                  </span>
                </div>

                {step2Error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium wrap-anywhere">
                    {step2Error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePaymentSubmit}
                  className="w-full min-h-[48px] bg-[#5458A7] text-white font-bold text-base py-3.5 rounded-full hover:opacity-95 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {t('gs_submitPayment')}
                </button>

                <p className="text-xs text-[#6B7280] leading-relaxed text-center">
                  {t('gs_activationNote')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3 RENDER
  return (
    <div className="min-h-dvh w-full max-w-full bg-white font-manrope">
      {/* Top Header */}
      <header className="border-b border-[#E4E6F3] px-4 sm:px-12 py-4 sm:py-5 flex items-center justify-between gap-3 flex-wrap">
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
            <p className="text-sm sm:text-base text-[#555A8A] mt-3 leading-relaxed">
              {t('gs_waitingDesc')}
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

          {/* Action to log in or return */}
          <div className="pt-6 border-t border-[#E4E6F3] flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onGoToHome}
              className="w-full sm:w-auto min-h-[44px] text-sm font-bold text-[#5458A7] hover:underline cursor-pointer"
            >
              {t('gs_returnHome')}
            </button>
            <button
              type="button"
              onClick={onGoToLogin}
              className="w-full sm:w-auto min-h-[44px] bg-[#5458A7] text-white font-bold text-sm px-6 py-2.5 rounded-full hover:opacity-95 cursor-pointer"
            >
              {t('gs_goToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
