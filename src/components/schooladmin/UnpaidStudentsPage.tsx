import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PaymentMethod, UnpaidStudentItem } from '../../types';
import {
  Download,
  Printer,
  CheckCircle,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { excelService } from '../../services/excelService';

interface UnpaidStudentsPageProps {
  onRecordPaymentClick: (studentId: string, targetAcademicYearId?: string) => void;
  onViewStudentProfile: (studentId: string) => void;
  onShowToast: (msg: string) => void;
  initialStatusFilter?: string;
}

export const UnpaidStudentsPage: React.FC<UnpaidStudentsPageProps> = ({
  onRecordPaymentClick,
  onViewStudentProfile,
  onShowToast,
  initialStatusFilter = 'all',
}) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tMethod, tMonth, tStatus, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [debtScope, setDebtScope] = useState<'all' | 'previous_year' | 'current_year'>('all');

  // Quick record payment modal
  const [payingStudent, setPayingStudent] = useState<UnpaidStudentItem | null>(null);
  const [payTargetAyId, setPayTargetAyId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState<string>('');
  const [payMonths, setPayMonths] = useState<string[]>(['Jan']);

  const classes = storage.getClasses(schoolId, ayId);
  const comprehensiveStats = storage.getComprehensiveFeeStats(schoolId, ayId);

  // Unpaid items
  const unpaidItems = storage.getUnpaidStudentsList(schoolId, {
    classId: classFilter,
    month: monthFilter,
    status: statusFilter,
    search: searchTerm,
    academicYearId: ayId,
    debtScope,
  });

  // All unpaid items for this academic year (used for month filter & Export All)
  const allUnpaidItems = storage.getUnpaidStudentsList(schoolId, { academicYearId: ayId });
  const distinctMonths = Array.from(
    new Set(allUnpaidItems.flatMap((item) => item.dueMonthsList))
  );

  const handleExportCSV = () => {
    const headers = [
      t('common_year'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      t('common_class'),
      t('adm_unp_col_phone'),
      `${t('adm_rp_monthlyFee')} ($)`,
      `${t('adm_unp_col_currPaid')} ($)`,
      `${t('adm_unp_col_currDue')} ($)`,
      `${t('adm_unp_col_priorDebt')} ($)`,
      `${t('adm_unp_col_combinedDue')} ($)`,
      t('adm_unp_col_dueMonths'),
      t('common_status'),
    ];
    const rows = unpaidItems.map((item) => [
      selectedAcademicYear?.name || '',
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianPhone,
      item.monthlyFee.toFixed(2),
      item.amountPaid.toFixed(2),
      item.remainingBalance.toFixed(2),
      item.previousYearDebt.toFixed(2),
      item.combinedBalance.toFixed(2),
      item.dueMonthsList.map((m) => tMonth(m)).join('; '),
      tStatus(item.status),
    ]);
    storage.generateCSV(
      `Unpaid_Students_Report_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    onShowToast(t('adm_unp_csvToast'));
  };

  const handlePrint = () => {
    window.print();
  };

  const openQuickPayModal = (item: UnpaidStudentItem) => {
    if (isHistoricalReadOnly) {
      onShowToast(t('adm_rp_errHist'));
      return;
    }
    setPayingStudent(item);
    // Default to previous year if current year owes $0 and prior year owes > $0
    if (item.remainingBalance <= 0 && item.previousYearBreakdown.length > 0) {
      const prior = item.previousYearBreakdown[0];
      setPayTargetAyId(prior.academicYearId);
      setPayAmount(prior.outstandingBalance);
      const firstPriorMonth = (prior.unpaidMonths[0] || 'Jan').split(' ')[0].substring(0, 3);
      setPayMonths([firstPriorMonth]);
    } else {
      setPayTargetAyId(ayId || '');
      setPayAmount(item.remainingBalance > 0 ? item.remainingBalance : item.combinedBalance);
      const shortM = item.dueMonth.split(' ')[0].substring(0, 3);
      setPayMonths([shortM || 'Jan']);
    }
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('Cash');
    setPayNote('');
  };

  const handleSaveQuickPay = async () => {
    if (!payingStudent) return;
    if (isHistoricalReadOnly) {
      onShowToast(t('srv_historicalReadOnly'));
      return;
    }
    if (!payAmount || payAmount <= 0) {
      onShowToast(t('adm_unp_errValidAmount'));
      return;
    }

    try {
      await storage.recordPayment(
        schoolId,
        payingStudent.studentId,
        Number(payAmount),
        payDate,
        payMethod,
        payMonths,
        payNote.trim(),
        payTargetAyId || ayId
      );

      const targetYearName =
        payingStudent.previousYearBreakdown.find((d) => d.academicYearId === payTargetAyId)
          ?.academicYearName ||
        selectedAcademicYear?.name ||
        '';

      onShowToast(
        t('adm_rp_successToast', {
          amount: Number(payAmount).toFixed(2),
          name: payingStudent.studentName,
          year: targetYearName,
        })
      );
      setPayingStudent(null);
    } catch (err: any) {
      onShowToast(tServiceMsg(err?.message) || t('adm_rp_errHist'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_unp_title')}
        subtitle={
          selectedAcademicYear
            ? t('adm_unp_subAy', {
                name: selectedAcademicYear.name,
                ro: isHistoricalReadOnly
                  ? ` (${t('common_historical')} · ${t('common_readOnly')})`
                  : '',
              })
            : t('adm_unp_subDefault')
        }
        searchPlaceholder={t('adm_unp_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto print:hidden">
            {unpaidItems.length !== allUnpaidItems.length && (
              <button
                onClick={() => {
                  const res = excelService.exportUnpaidStudents(schoolId, unpaidItems, 'Filtered', ayId);
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : tServiceMsg(res.error) || t('adm_exportFail')
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: unpaidItems.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportUnpaidStudents(schoolId, allUnpaidItems, 'All', ayId);
                onShowToast(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : tServiceMsg(res.error) || t('adm_exportFail')
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer bg-white shadow-xs"
              title={t('common_exportExcel')}
            >
              <FileSpreadsheet size={15} className="text-[#5458A7]" />
              <span>{t('common_exportExcel')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer bg-white"
            >
              <Printer size={15} />
              <span>{t('adm_unp_printReport')}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-5 py-2.5 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download size={15} />
              <span>{t('adm_unp_exportCsv')}</span>
            </button>
          </div>
        }
      />

      {/* Top 4 Summary Cards (Multi-Year Carry-Forward Totals) */}
      <div className="grid grid-cols-1 min-[370px]:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
        <StatCard
          label={t('adm_unp_statPriorStudents')}
          value={comprehensiveStats.studentsWithPreviousDebtCount}
        />
        <StatCard
          label={t('adm_unp_statPrevOut')}
          value={`$${comprehensiveStats.previousYearsOutstanding.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_unp_statCurrOut')}
          value={`$${comprehensiveStats.totalOutstandingFees.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_unp_statCombined')}
          value={`$${comprehensiveStats.combinedOutstanding.toFixed(2)}`}
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 print:hidden">
        {/* Debt Scope Filter */}
        <select
          value={debtScope}
          onChange={(e) => setDebtScope(e.target.value as 'all' | 'previous_year' | 'current_year')}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_unp_scopeAll')}</option>
          <option value="previous_year">{t('adm_unp_scopePrev')}</option>
          <option value="current_year">{t('adm_unp_scopeCurr')}</option>
        </select>

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

        {/* Month Filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_unp_allDueMonths')}</option>
          {distinctMonths.map((m) => (
            <option key={m} value={m}>
              {tMonth(m)}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3.5 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_unp_allStatusesOpt')}</option>
          <option value="Unpaid">{t('adm_unp_unpaidOnly')}</option>
          <option value="Partial">{t('adm_unp_partialOnly')}</option>
          <option value="Overdue">{t('adm_unp_overdueOnly')}</option>
        </select>

        <span className="text-xs text-[#6B7280] font-manrope sm:ms-auto min-[420px]:col-span-2">
          {t('adm_unp_showingCount', { count: unpaidItems.length })}
        </span>
      </div>

      {/* Main Unpaid Students Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {unpaidItems.length === 0 ? (
          <div className="p-10 sm:p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <h4 className="text-lg font-extrabold font-sora text-[#23265A]">
              {t('adm_unp_emptyTitle')}
            </h4>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto font-manrope">
              {t('adm_unp_emptyDesc')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (<640px) */}
            <div className="sm:hidden divide-y divide-[#E4E6F3]">
              {unpaidItems.map((item) => (
                <div key={item.studentId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        onClick={() => onViewStudentProfile(item.studentId)}
                        className="font-bold font-sora text-sm text-[#23265A] hover:text-[#5458A7] cursor-pointer text-start wrap-anywhere"
                      >
                        {item.studentName}
                      </button>
                      <div className="text-xs text-[#6B7280]">
                        {item.studentIdNumber} · {item.className}
                      </div>
                      <div className="text-xs text-[#6B7280] wrap-anywhere">{item.guardianPhone}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusChip label={item.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#F8F9FE] rounded-xl p-2.5 text-center">
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_unp_col_currDue')}</span>
                      <span className="font-bold text-[#23265A]">${item.remainingBalance.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_unp_col_priorDebt')}</span>
                      <span className="font-bold text-rose-600">${item.previousYearDebt.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_unp_col_combinedDue')}</span>
                      <span className="font-extrabold text-amber-700">${item.combinedBalance.toFixed(2)}</span>
                    </div>
                  </div>
                  {item.dueMonthsList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.dueMonthsList.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7] text-[11px] font-bold"
                        >
                          {tMonth(m)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                      onClick={() => openQuickPayModal(item)}
                      disabled={isHistoricalReadOnly}
                      className="flex-1 min-h-[44px] bg-[#5458A7] text-white px-3.5 py-2 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
                    >
                      {isHistoricalReadOnly && <Lock size={11} />}
                      <span>
                        {item.remainingBalance <= 0 && item.previousYearDebt > 0
                          ? t('adm_unp_payPrior')
                          : t('adm_fee_recordPaymentBtn')}
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        onRecordPaymentClick(
                          item.studentId,
                          item.remainingBalance <= 0 && item.previousYearBreakdown[0]
                            ? item.previousYearBreakdown[0].academicYearId
                            : ayId
                        )
                      }
                      disabled={isHistoricalReadOnly}
                      className="min-h-[44px] border border-[#5458A7] text-[#5458A7] px-3.5 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {t('adm_unp_fullForm')}
                    </button>
                    <button
                      onClick={() => onViewStudentProfile(item.studentId)}
                      className="min-h-[44px] border border-[#D5D7EE] text-[#4A5080] px-3.5 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                    >
                      {t('adm_unp_profileBtn')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-start text-sm text-[#23265A]">
                <thead className="border-b border-[#E4E6F3] bg-[#FAFAFE] text-[#5458A7] font-semibold text-xs font-manrope">
                  <tr>
                    <th className="py-4 px-5 sticky start-0 bg-[#FAFAFE] z-10">{t('adm_unp_col_id')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_name')}</th>
                    <th className="py-4 px-5">{t('common_class')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_phone')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_currPaid')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_currDue')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_priorDebt')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_combinedDue')}</th>
                    <th className="py-4 px-5">{t('adm_unp_col_dueMonths')}</th>
                    <th className="py-4 px-5">{t('common_status')}</th>
                    <th className="py-4 px-5 text-end print:hidden">{t('adm_unp_col_action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2FA] text-sm">
                {unpaidItems.map((item) => (
                  <tr
                    key={item.studentId}
                    className="hover:bg-[#F9FAFD] transition-colors"
                  >
                    <td className="py-4 px-5 font-mono text-xs text-[#6B7280] sticky start-0 bg-white">
                      {item.studentIdNumber}
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => onViewStudentProfile(item.studentId)}
                        className="font-bold text-[#23265A] hover:text-[#5458A7] transition-colors cursor-pointer text-start"
                      >
                        {item.studentName}
                      </button>
                    </td>
                    <td className="py-4 px-5 text-xs text-[#4A5080]">
                      {item.className}
                    </td>
                    <td className="py-4 px-5 text-xs text-[#6B7280]">
                      {item.guardianPhone}
                    </td>
                    <td className="py-4 px-5 text-xs font-semibold text-emerald-700">
                      ${item.amountPaid.toFixed(2)}
                    </td>
                    <td className="py-4 px-5 font-bold text-[#23265A]">
                      ${item.remainingBalance.toFixed(2)}
                    </td>
                    <td className="py-4 px-5 font-bold text-rose-600">
                      {item.previousYearDebt > 0 ? `$${item.previousYearDebt.toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="py-4 px-5 font-extrabold text-amber-700">
                      ${item.combinedBalance.toFixed(2)}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1">
                        {item.dueMonthsList.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7] text-[11px] font-bold"
                          >
                            {tMonth(m)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <StatusChip label={item.status} />
                    </td>
                    <td className="py-4 px-5 text-end print:hidden">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openQuickPayModal(item)}
                          disabled={isHistoricalReadOnly}
                          className="bg-[#5458A7] text-white px-3.5 py-1.5 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          {isHistoricalReadOnly && <Lock size={11} />}
                          <span>
                            {item.remainingBalance <= 0 && item.previousYearDebt > 0
                              ? t('adm_unp_payPrior')
                              : t('adm_fee_recordPaymentBtn')}
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            onRecordPaymentClick(
                              item.studentId,
                              item.remainingBalance <= 0 && item.previousYearBreakdown[0]
                                ? item.previousYearBreakdown[0].academicYearId
                                : ayId
                            )
                          }
                          disabled={isHistoricalReadOnly}
                          className="border border-[#5458A7] text-[#5458A7] px-3 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          {t('adm_unp_fullForm')}
                        </button>
                        <button
                          onClick={() => onViewStudentProfile(item.studentId)}
                          className="border border-[#D5D7EE] text-[#4A5080] px-3 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer whitespace-nowrap"
                        >
                          {t('adm_unp_profileBtn')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* QUICK RECORD PAYMENT MODAL */}
      {payingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold font-sora text-[#23265A]">
                  {t('adm_fee_recordPaymentBtn')}
                </h3>
                <p className="text-xs text-[#6B7280] font-manrope mt-0.5">
                  {t('adm_unp_modalStudentLine', {
                    name: payingStudent.studentName,
                    id: payingStudent.studentIdNumber,
                  })}
                </p>
              </div>
              <button
                onClick={() => setPayingStudent(null)}
                className="text-[#6B7280] hover:text-[#23265A] text-lg font-bold p-1 cursor-pointer"
                aria-label={t('common_close')}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-3 bg-[#F4F5FB] rounded-xl border border-[#E4E6F3] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('adm_unp_modalCurrBal')}</span>
                  <span className="font-bold text-[#23265A]">${payingStudent.remainingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('adm_unp_modalPrevDebt')}</span>
                  <span className="font-bold text-rose-600">${payingStudent.previousYearDebt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E4E6F3]">
                  <span className="text-[#23265A] font-bold">{t('adm_unp_modalTotalOut')}</span>
                  <span className="font-extrabold text-amber-700">${payingStudent.combinedBalance.toFixed(2)}</span>
                </div>
              </div>

              {payingStudent.previousYearBreakdown.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                    {t('adm_unp_modalTargetAy')}
                  </label>
                  <select
                    value={payTargetAyId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setPayTargetAyId(nextId);
                      const matchedPrev = payingStudent.previousYearBreakdown.find((d) => d.academicYearId === nextId);
                      if (matchedPrev) {
                        setPayAmount(matchedPrev.outstandingBalance);
                        const mShort = (matchedPrev.unpaidMonths[0] || 'Jan').split(' ')[0].substring(0, 3);
                        setPayMonths([mShort]);
                      } else {
                        setPayAmount(payingStudent.remainingBalance);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A]"
                  >
                    {payingStudent.previousYearBreakdown.map((d) => (
                      <option key={d.academicYearId} value={d.academicYearId}>
                        {t('adm_unp_optPrevDebt', {
                          year: d.academicYearName,
                          amount: d.outstandingBalance.toFixed(2),
                        })}
                      </option>
                    ))}
                    {selectedAcademicYear && (
                      <option value={selectedAcademicYear.id}>
                        {t('adm_unp_optCurrYear', {
                          year: selectedAcademicYear.name,
                          amount: payingStudent.remainingBalance.toFixed(2),
                        })}
                      </option>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_unp_payAmountLabel')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-base font-bold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                    {t('adm_unp_dateRecvLabel')}
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                    {t('adm_unp_payMethodLabel')}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A]"
                  >
                    <option value="Cash">{tMethod('Cash')}</option>
                    <option value="Mobile money">{tMethod('Mobile money')}</option>
                    <option value="Bank transfer">{tMethod('Bank transfer')}</option>
                    <option value="Cheque">{tMethod('Cheque')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_unp_receiptNoteOpt')}
                </label>
                <input
                  type="text"
                  placeholder={t('adm_unp_notePh')}
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-xs text-[#23265A]"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[#F0F2FA]">
              <button
                type="button"
                onClick={() => setPayingStudent(null)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('common_cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveQuickPay}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 shadow-xs cursor-pointer"
              >
                {t('adm_fee_recordPaymentBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
