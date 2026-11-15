import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShiftType, EnrollmentStatus, FeeBillingType } from '../../types';

interface RegisterStudentProps {
  onCancel: () => void;
  onSuccess: () => void;
  onShowToast: (msg: string) => void;
}

export const RegisterStudent: React.FC<RegisterStudentProps> = ({
  onCancel,
  onSuccess,
  onShowToast,
}) => {
  const { school, activeAcademicYear, isHistoricalReadOnly, setSelectedAcademicYearId } = useAuth();
  const { t, tShift, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const targetAyId = activeAcademicYear?.id;
  const classes = storage.getClasses(schoolId, targetAyId);

  const todayStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState(
    `STD-${Math.floor(100 + Math.random() * 900)}`
  );
  const [classId, setClassId] = useState(classes[0]?.id || 'unassigned');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [shift, setShift] = useState<ShiftType>('Morning');
  const [monthlyFee, setMonthlyFee] = useState<number>(45.0);
  const [registrationDate, setRegistrationDate] = useState(todayStr);
  const [feeStartDate, setFeeStartDate] = useState(todayStr);
  const [feeBillingType, setFeeBillingType] = useState<FeeBillingType>('monthly_from_joining_month');
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('Active');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('adm_reg_errName'));
      return;
    }
    if (!studentIdNumber.trim()) {
      setError(t('adm_reg_errId'));
      return;
    }

    try {
      await storage.addStudent(
        schoolId,
        {
          name: name.trim(),
          studentIdNumber: studentIdNumber.trim(),
          classId: classId === 'unassigned' ? '' : classId,
          guardianName: guardianName.trim(),
          guardianPhone: guardianPhone.trim(),
          shift,
          monthlyFee: Number(monthlyFee) || 0,
          registrationDate,
          feeStartDate: feeStartDate || registrationDate,
          feeBillingType,
          enrollmentStatus,
        },
        targetAyId
      );

      if (targetAyId && isHistoricalReadOnly) {
        setSelectedAcademicYearId(targetAyId);
      }

      onShowToast(
        t('adm_reg_successToast', {
          name: name.trim(),
          year: activeAcademicYear?.name || t('adm_activeYearFallback'),
        })
      );
      onSuccess();
    } catch (err: any) {
      setError(err?.message ? tServiceMsg(err.message) : t('adm_reg_errUnable'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_reg_title')}
        searchPlaceholder={t('adm_reg_searchPh')}
        subtitle={t('adm_reg_subtitle', {
          year: activeAcademicYear?.name || t('adm_currentYearFallback'),
        })}
      />

      {isHistoricalReadOnly && activeAcademicYear && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-xs font-semibold text-amber-800 max-w-4xl">
          {t('adm_reg_histBanner', { year: activeAcademicYear.name })}
        </div>
      )}

      {/* Main Registration Card */}
      <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-8 max-w-4xl bg-white shadow-xs">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_fullName')}
              </label>
              <input
                type="text"
                required
                placeholder={t('adm_reg_fullNamePh')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_studentId')}
              </label>
              <input
                type="text"
                required
                placeholder={t('adm_reg_studentIdPh')}
                value={studentIdNumber}
                onChange={(e) => setStudentIdNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('common_class')}
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              >
                <option value="unassigned">{t('common_unassigned')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_guardianName')}
              </label>
              <input
                type="text"
                placeholder={t('adm_reg_guardianNamePh')}
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_guardianPhone')}
              </label>
              <input
                type="tel"
                placeholder={t('adm_reg_guardianPhonePh')}
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('common_shift')}
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as ShiftType)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              >
                <option value="Morning">{tShift('Morning')}</option>
                <option value="Afternoon">{tShift('Afternoon')}</option>
                <option value="Evening">{tShift('Evening')}</option>
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_monthlyFee')}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_regDate')}
              </label>
              <input
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_enrollStatus')}
              </label>
              <select
                value={enrollmentStatus}
                onChange={(e) => setEnrollmentStatus(e.target.value as EnrollmentStatus)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              >
                <option value="Active">{t('adm_reg_optActive')}</option>
                <option value="Inactive">{t('adm_reg_optInactive')}</option>
              </select>
            </div>
          </div>

          {/* Row 4: Fee Starting Date & Billing Option */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1 border-t border-[#F0F2FA]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                <label className="block text-xs font-bold text-[#23265A]">
                  {t('adm_reg_feeStartDate')}
                </label>
                <span className="text-[11px] font-semibold text-[#5458A7]">
                  {t('adm_reg_feeStartDefault')}
                </span>
              </div>
              <input
                type="date"
                value={feeStartDate}
                onChange={(e) => setFeeStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              />
              <p className="text-[11px] text-[#6B7280] mt-1.5 font-manrope">
                {t('adm_reg_feeStartHelp')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_reg_billingOption')}
              </label>
              <select
                value={feeBillingType}
                onChange={(e) => setFeeBillingType(e.target.value as FeeBillingType)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
              >
                <option value="monthly_from_joining_month">
                  {t('adm_reg_billingMonth')}
                </option>
                <option value="exact_date">
                  {t('adm_reg_billingExact')}
                </option>
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1.5 font-manrope">
                {t('adm_reg_billingHelp')}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto min-h-[44px] border border-[#5458A7] text-[#5458A7] font-bold text-sm px-7 py-2.5 rounded-full hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              {t('common_cancel')}
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] bg-[#5458A7] text-white font-bold text-sm px-7 py-2.5 rounded-full hover:opacity-95 shadow-sm transition-all cursor-pointer"
            >
              {t('adm_reg_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
