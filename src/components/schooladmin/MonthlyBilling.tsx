import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '../common/Header';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { excelService } from '../../services/excelService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { FileSpreadsheet, Lock } from 'lucide-react';

interface MonthlyBillingProps {
  onBackToFees: () => void;
  onShowToast: (msg: string) => void;
}

export const MonthlyBilling: React.FC<MonthlyBillingProps> = ({
  onBackToFees,
  onShowToast,
}) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tMonth, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;
  const calYear = storage.getCalendarYearForAcademicYear(selectedAcademicYear || undefined);

  const classes = storage.getClasses(schoolId, ayId);
  const students = storage.getStudents(schoolId, ayId).filter((s) => s.enrollmentStatus === 'Active');
  const billingRuns = storage.getBillingRuns(schoolId, ayId);

  const months = useMemo(
    () => [
      `January ${calYear}`,
      `February ${calYear}`,
      `March ${calYear}`,
      `April ${calYear}`,
      `May ${calYear}`,
      `June ${calYear}`,
      `July ${calYear}`,
      `August ${calYear}`,
      `September ${calYear}`,
      `October ${calYear}`,
      `November ${calYear}`,
      `December ${calYear}`,
    ],
    [calYear]
  );

  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const [applyToClassId, setApplyToClassId] = useState('all');
  const [feeOption, setFeeOption] = useState<'student_fee' | 'custom'>('student_fee');
  const [customFeeAmount, setCustomFeeAmount] = useState(45.0);
  const [dueDate, setDueDate] = useState(`${calYear}-01-25`);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setSelectedMonth(months[0]);
    setDueDate(`${calYear}-01-25`);
  }, [calYear, months]);

  // Calculate live preview of students to bill for selected academic year
  const existingBills = storage.getFeeBills(schoolId, ayId).filter((b) => b.month === selectedMonth);
  const existingBilledStudentIds = new Set(existingBills.map((b) => b.studentId));

  const targetStudents =
    applyToClassId === 'all'
      ? students
      : students.filter((s) => s.classId === applyToClassId);

  const studentsToBill = targetStudents.filter((s) => !existingBilledStudentIds.has(s.id));

  const totalToBill = studentsToBill.reduce((sum, s) => {
    return sum + (feeOption === 'custom' ? customFeeAmount : s.monthlyFee);
  }, 0);

  const handleBillAllStudents = async () => {
    setErrorMsg('');
    if (isHistoricalReadOnly) {
      setErrorMsg(t('srv_billingClosedErr'));
      return;
    }
    try {
      const res = await storage.createMonthlyBillingRun(
        schoolId,
        selectedMonth,
        applyToClassId,
        feeOption,
        customFeeAmount,
        dueDate,
        ayId
      );

      if (res.success) {
        onShowToast(
          t('adm_bill_successToast', {
            count: res.studentsBilled,
            amount: res.totalBilled.toFixed(2),
            month: tMonth(selectedMonth),
          })
        );
      } else {
        setErrorMsg(tServiceMsg(res.message) || t('adm_bill_errFail'));
      }
    } catch (err: any) {
      setErrorMsg(tServiceMsg(err?.message) || t('adm_bill_errFail'));
    }
  };

  const filteredHistory = billingRuns.filter(
    (b) =>
      b.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tMonth(b.month).toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.classes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <Header
        title={t('adm_bill_title')}
        subtitle={
          selectedAcademicYear
            ? t(isHistoricalReadOnly ? 'adm_aySubtitleHist' : 'adm_aySubtitle', {
                name: selectedAcademicYear.name,
              })
            : undefined
        }
        searchPlaceholder={t('adm_bill_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const res = excelService.exportBillingRuns(schoolId, ayId);
                if (res.success) {
                  onShowToast(t('adm_exportedAllToast', { count: res.count || 0 }));
                } else {
                  onShowToast(tServiceMsg(res.error) || t('adm_exportFail'));
                }
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 inline-flex items-center gap-2 border border-[#5458A7] text-[#5458A7] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>{t('common_exportExcel')}</span>
            </button>
            <button
              onClick={onBackToFees}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7] text-[#5458A7] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer inline-flex items-center"
            >
              {t('adm_bill_backToFees')}
            </button>
          </div>
        }
      />

      <p className="text-sm text-[#555A8A] max-w-3xl leading-relaxed -mt-2 sm:-mt-4">
        {t('adm_bill_desc', { year: selectedAcademicYear?.name || calYear })}
      </p>

      {isHistoricalReadOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-800 font-medium flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          <span>
            {t('adm_bill_histBanner', { year: selectedAcademicYear?.name || '' })}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Top 2 Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Form Card */}
        <div className="lg:col-span-8 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Month */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_bill_monthLabel')}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {tMonth(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply To */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_bill_applyTo')}
              </label>
              <select
                value={applyToClassId}
                onChange={(e) => setApplyToClassId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
              >
                <option value="all">{t('adm_stu_filterClass')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Amount */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_bill_feeAmount')}
              </label>
              <select
                value={feeOption}
                onChange={(e) => setFeeOption(e.target.value as 'student_fee' | 'custom')}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
              >
                <option value="student_fee">{t('adm_bill_optEachStudent')}</option>
                <option value="custom">{t('adm_bill_optCustom')}</option>
              </select>
              {feeOption === 'custom' && (
                <input
                  type="number"
                  step="0.01"
                  value={customFeeAmount}
                  onChange={(e) => setCustomFeeAmount(parseFloat(e.target.value) || 0)}
                  placeholder={t('adm_bill_customPh')}
                  className="w-full mt-2 px-4 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_bill_dueDateLabel')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
              />
            </div>
          </div>
        </div>

        {/* Right Summary Card ("This billing run") */}
        <div className="lg:col-span-4 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
          <h2 className="text-xl font-extrabold font-sora text-[#23265A]">
            {t('adm_bill_cardTitle')}
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between py-1 border-b border-[#F0F2FA]">
              <span className="text-[#6B7280]">{t('adm_bill_studentsToBill')}</span>
              <span className="font-bold text-base text-[#23265A]">
                {studentsToBill.length > 0 ? studentsToBill.length : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#F0F2FA]">
              <span className="text-[#6B7280]">{t('adm_bill_totalToBill')}</span>
              <span className="font-extrabold text-xl font-sora text-[#23265A]">
                {studentsToBill.length > 0 ? `$${totalToBill.toFixed(2)}` : '$-'}
              </span>
            </div>
          </div>

          <button
            onClick={handleBillAllStudents}
            disabled={isHistoricalReadOnly || studentsToBill.length === 0}
            className="w-full bg-[#5458A7] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-95 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
          >
            {isHistoricalReadOnly && <Lock size={14} />}
            <span>{t('adm_fee_monthlyBillingBtn')}</span>
          </button>
        </div>
      </div>

      {/* Billing History Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold font-sora text-[#23265A]">
          {t('adm_bill_historyTitle')}
        </h2>

        <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
          {/* Mobile Stacked Cards (<640px) */}
          <div className="sm:hidden divide-y divide-[#E4E6F3]">
            {filteredHistory.length === 0 ? (
              <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
                {t('adm_bill_empty')}
              </div>
            ) : (
              filteredHistory.map((run) => (
                <div key={run.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold font-sora text-sm text-[#23265A]">{tMonth(run.month)}</div>
                      <div className="text-xs text-[#555A8A]">
                        {run.classes === 'All classes' ? t('adm_stu_filterClass') : run.classes}
                      </div>
                    </div>
                    <StatusChip label={run.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8F9FE] rounded-xl p-2.5">
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_bill_col_count')}</span>
                      <span className="font-semibold text-[#23265A]">{run.studentsBilledCount}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_bill_col_amount')}</span>
                      <span className="font-bold text-[#23265A]">${run.totalBilledAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-start text-sm text-[#23265A]">
              <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
                <tr>
                  <th className="py-4 px-6 sticky start-0 bg-white z-10">{t('common_month')}</th>
                  <th className="py-4 px-6">{t('common_classes')}</th>
                  <th className="py-4 px-6">{t('adm_bill_col_count')}</th>
                  <th className="py-4 px-6">{t('adm_bill_col_amount')}</th>
                  <th className="py-4 px-6">{t('common_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6F3]">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                      {t('adm_bill_empty')}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-[#F9FAFE] transition-colors"
                    >
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                        {tMonth(run.month)}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {run.classes === 'All classes' ? t('adm_stu_filterClass') : run.classes}
                      </td>
                      <td className="py-4 px-6 font-semibold text-[#23265A]">
                        {run.studentsBilledCount}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#23265A]">
                        ${run.totalBilledAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <StatusChip label={run.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
