import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { FileSpreadsheet, Lock } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface FeeManagementProps {
  onOpenMonthlyBilling: () => void;
  onOpenRecordPayment: () => void;
  onViewStudentProfile?: (studentId: string) => void;
  onShowToast?: (msg: string) => void;
}

export const FeeManagement: React.FC<FeeManagementProps> = ({
  onOpenMonthlyBilling,
  onOpenRecordPayment,
  onViewStudentProfile,
  onShowToast,
}) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tStatus, tShift, tMonth, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const students = storage.getStudents(schoolId, ayId);
  const classes = storage.getClasses(schoolId, ayId);
  const feeStats = storage.getSchoolFeeStats(schoolId, ayId);
  const feeBills = storage.getFeeBills(schoolId, ayId);

  // Distinct months in bills for selected academic year
  const availableMonths = Array.from(new Set(feeBills.map((b) => b.month)));
  const latestMonth = availableMonths[0] || 'No billing yet';

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || t('common_class');
  };

  const filteredStudents = students.filter((student) => {
    const feeSummary = storage.getStudentFeeSummary(schoolId, student.id, ayId);
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass =
      classFilter === 'all' ? true : student.classId === classFilter;
    const matchesShift =
      shiftFilter === 'all' ? true : student.shift === shiftFilter;
    const matchesEnrollment =
      enrollmentFilter === 'all'
        ? true
        : student.enrollmentStatus === enrollmentFilter;
    const matchesStatus =
      statusFilter === 'all' ? true : feeSummary.status === statusFilter;

    return (
      matchesSearch &&
      matchesClass &&
      matchesShift &&
      matchesEnrollment &&
      matchesStatus
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_fee_title')}
        subtitle={
          selectedAcademicYear
            ? t(isHistoricalReadOnly ? 'adm_aySubtitleHist' : 'adm_aySubtitle', {
                name: selectedAcademicYear.name,
              })
            : t('adm_fee_defaultSub')
        }
        searchPlaceholder={t('adm_fee_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {filteredStudents.length !== students.length && (
              <button
                onClick={() => {
                  const res = excelService.exportFeeManagement(schoolId, filteredStudents, 'Filtered', ayId);
                  onShowToast?.(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : tServiceMsg(res.error) || t('adm_exportFail')
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: filteredStudents.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportFeeManagement(schoolId, undefined, 'All', ayId);
                onShowToast?.(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : tServiceMsg(res.error) || t('adm_exportFail')
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-white"
              title={t('common_exportExcel')}
            >
              <FileSpreadsheet size={15} className="text-[#5458A7]" />
              <span>{t('common_exportExcel')}</span>
            </button>
            <button
              onClick={onOpenMonthlyBilling}
              disabled={isHistoricalReadOnly}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7] text-[#5458A7] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isHistoricalReadOnly && <Lock size={13} />}
              <span>{t('adm_fee_monthlyBillingBtn')}</span>
            </button>
            <button
              onClick={onOpenRecordPayment}
              disabled={isHistoricalReadOnly}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isHistoricalReadOnly && <Lock size={13} />}
              <span>{t('adm_fee_recordPaymentBtn')}</span>
            </button>
          </div>
        }
      />

      {isHistoricalReadOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-800 font-medium flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          <span>
            {t('adm_fee_histBanner', { year: selectedAcademicYear?.name || '' })}
          </span>
        </div>
      )}

      {/* Stat Cards (Current Year Billed, Collected, Current Outstanding, Previous Year Debt) */}
      <div className="grid grid-cols-1 min-[370px]:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <StatCard
          label={t('adm_fee_statBilled')}
          value={`$${feeStats.amountBilled.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_fee_statCollected')}
          value={`$${feeStats.collected.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_fee_statOutstanding')}
          value={`$${feeStats.outstanding.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_fee_statPrevDebt')}
          value={`$${(feeStats.previousYearsOutstanding || 0).toFixed(2)}`}
        />
      </div>

      {/* 5 Filters Row */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5 sm:gap-3">
        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_stu_filterClass')}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Shift Filter */}
        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_fee_allShifts')}</option>
          <option value="Morning">{tShift('Morning')}</option>
          <option value="Afternoon">{tShift('Afternoon')}</option>
          <option value="Evening">{tShift('Evening')}</option>
        </select>

        {/* Enrollment Filter */}
        <select
          value={enrollmentFilter}
          onChange={(e) => setEnrollmentFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_fee_allEnroll')}</option>
          <option value="Active">{tStatus('Active')}</option>
          <option value="Inactive">{tStatus('Inactive')}</option>
        </select>

        {/* Payment Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_fee_allPayStatus')}</option>
          <option value="Paid">{tStatus('Paid')}</option>
          <option value="Partial Payment">{tStatus('Partial Payment')}</option>
          <option value="Unpaid">{tStatus('Unpaid')}</option>
          <option value="Overdue">{tStatus('Overdue')}</option>
        </select>

        {/* Month Filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full min-[420px]:col-span-2 sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_fee_allMonths')}</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {tMonth(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Fees Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredStudents.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_fee_empty')}
            </div>
          ) : (
            filteredStudents.map((student) => {
              const summary = storage.getStudentFeeSummary(schoolId, student.id, ayId);
              const displayMonth = monthFilter === 'all' ? latestMonth : monthFilter;
              return (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {onViewStudentProfile ? (
                        <button
                          onClick={() => onViewStudentProfile(student.id)}
                          className="font-bold font-sora text-sm text-[#23265A] hover:text-[#5458A7] transition-colors cursor-pointer text-start wrap-anywhere"
                        >
                          {student.name}
                        </button>
                      ) : (
                        <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">{student.name}</div>
                      )}
                      <div className="text-xs text-[#555A8A]">
                        {getClassName(student.classId)} · {tShift(student.shift)} · {displayMonth === 'No billing yet' ? t('adm_fee_noBillingYet') : tMonth(displayMonth)}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusChip label={summary.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#F8F9FE] rounded-xl p-2.5 text-center">
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_fee_col_billed')}</span>
                      <span className="font-bold text-[#23265A]">${summary.totalBilled.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_fee_col_paid')}</span>
                      <span className="font-semibold text-[#5458A7]">${summary.totalPaid.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_fee_col_balance')}</span>
                      <span className="font-bold text-[#23265A]">${summary.balance.toFixed(2)}</span>
                    </div>
                  </div>
                  {(summary.previousYearsOutstanding || 0) > 0 && (
                    <div className="text-[11px] font-semibold text-amber-700">
                      {t('adm_fee_priorYearDebtTag', {
                        amount: (summary.previousYearsOutstanding || 0).toFixed(2),
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 sticky start-0 bg-white z-10">{t('common_student')}</th>
                <th className="py-4 px-6">{t('common_class')}</th>
                <th className="py-4 px-6">{t('common_shift')}</th>
                <th className="py-4 px-6">{t('common_month')}</th>
                <th className="py-4 px-6">{t('adm_fee_col_billed')}</th>
                <th className="py-4 px-6">{t('adm_fee_col_paid')}</th>
                <th className="py-4 px-6">{t('adm_fee_col_balance')}</th>
                <th className="py-4 px-6">{t('common_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7280]">
                    {t('adm_fee_empty')}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const summary = storage.getStudentFeeSummary(schoolId, student.id, ayId);
                  const displayMonth = monthFilter === 'all' ? latestMonth : monthFilter;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#F9FAFE] transition-colors"
                    >
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                        {onViewStudentProfile ? (
                          <button
                            onClick={() => onViewStudentProfile(student.id)}
                            className="hover:text-[#5458A7] transition-colors cursor-pointer text-start font-bold"
                          >
                            {student.name}
                          </button>
                        ) : (
                          student.name
                        )}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {getClassName(student.classId)}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A]">
                        {tShift(student.shift)}
                      </td>
                      <td className="py-4 px-6 text-[#23265A] font-medium">
                        {displayMonth === 'No billing yet' ? t('adm_fee_noBillingYet') : tMonth(displayMonth)}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#23265A]">
                        ${summary.totalBilled.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-[#5458A7]">
                        ${summary.totalPaid.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#23265A]">
                        <div>${summary.balance.toFixed(2)}</div>
                        {(summary.previousYearsOutstanding || 0) > 0 && (
                          <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
                            {t('adm_fee_priorYearDebtTag', {
                              amount: (summary.previousYearsOutstanding || 0).toFixed(2),
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <StatusChip label={summary.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
