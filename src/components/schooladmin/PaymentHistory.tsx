import React, { useState, useEffect } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { FeePayment, PaymentMethod } from '../../types';
import { FileSpreadsheet, Lock } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface PaymentHistoryProps {
  onOpenRecordPayment: () => void;
  onShowToast: (msg: string) => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  onOpenRecordPayment,
  onShowToast,
}) => {
  const { school, selectedAcademicYear, academicYears, isHistoricalReadOnly } = useAuth();
  const { t, tStatus, tMethod, tMonth, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';

  const [yearFilter, setYearFilter] = useState<string>(selectedAcademicYear?.id || 'all');

  useEffect(() => {
    if (selectedAcademicYear?.id) {
      setYearFilter(selectedAcademicYear.id);
    }
  }, [selectedAcademicYear?.id]);

  const payments = storage.getFeePayments(schoolId, yearFilter);
  const students = storage.getAllBaseStudents(schoolId);

  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Edit payment modal
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMethod, setEditMethod] = useState<PaymentMethod>('Cash');
  const [editDate, setEditDate] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  const getStudentName = (studentId: string) => {
    return students.find((s) => s.id === studentId)?.name || t('common_student');
  };

  const getAyName = (ayId?: string) => {
    if (!ayId) return selectedAcademicYear?.name || '--';
    return academicYears.find((y) => y.id === ayId)?.name || '--';
  };

  const filteredPayments = payments.filter((p) => {
    const sName = getStudentName(p.studentId).toLowerCase();
    const matchesSearch =
      sName.includes(searchTerm.toLowerCase()) ||
      p.date.includes(searchTerm) ||
      (p.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth =
      monthFilter === 'all'
        ? true
        : p.monthsCovered.some((m) => m.toLowerCase().includes(monthFilter.toLowerCase()));
    const matchesMethod =
      methodFilter === 'all' ? true : p.method === methodFilter;

    return matchesSearch && matchesMonth && matchesMethod;
  });

  const handleVoid = async (payment: FeePayment) => {
    if (
      window.confirm(
        t('adm_ph_confirmVoid', {
          amount: payment.amount.toFixed(2),
          name: getStudentName(payment.studentId),
        })
      )
    ) {
      try {
        await storage.voidPayment(payment.id, schoolId);
        onShowToast(t('adm_ph_voidedToast'));
      } catch (err: any) {
        onShowToast(tServiceMsg(err?.message) || t('srv_historicalPaymentErr'));
      }
    }
  };

  const openEdit = (p: FeePayment) => {
    setEditingPayment(p);
    setEditAmount(p.amount);
    setEditMethod(p.method);
    setEditDate(p.date);
    setEditNote(p.note || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      await storage.updatePayment(editingPayment.id, schoolId, {
        amount: Number(editAmount),
        method: editMethod,
        date: editDate,
        note: editNote.trim(),
      });

      setEditingPayment(null);
      onShowToast(t('adm_ph_updatedToast'));
    } catch (err: any) {
      onShowToast(tServiceMsg(err?.message) || t('srv_historicalPaymentErr'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_ph_title')}
        subtitle={
          selectedAcademicYear
            ? t('adm_aySubtitle', { name: getAyName(yearFilter === 'all' ? undefined : yearFilter) })
            : undefined
        }
        searchPlaceholder={t('adm_ph_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {filteredPayments.length !== payments.length && (
              <button
                onClick={() => {
                  const res = excelService.exportPaymentHistory(
                    schoolId,
                    filteredPayments,
                    'Filtered',
                    yearFilter === 'all' ? undefined : yearFilter
                  );
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : tServiceMsg(res.error) || t('adm_exportFail')
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: filteredPayments.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportPaymentHistory(
                  schoolId,
                  payments,
                  yearFilter === 'all' ? 'AllYears' : getAyName(yearFilter).replace(/\s+/g, ''),
                  yearFilter === 'all' ? undefined : yearFilter
                );
                onShowToast(
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

      <p className="text-sm text-[#555A8A] -mt-2 sm:-mt-4">
        {t('adm_ph_subtitleNotice')}
      </p>

      {/* Filters: Academic Year, All months, All methods */}
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2.5 sm:gap-4">
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_ph_allYears')}</option>
          {academicYears.map((ay) => (
            <option key={ay.id} value={ay.id}>
              {ay.name} ({tStatus(ay.status)})
            </option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_ph_allMonths')}</option>
          <option value="Jan">{tMonth('January')}</option>
          <option value="Feb">{tMonth('February')}</option>
          <option value="Mar">{tMonth('March')}</option>
          <option value="Apr">{tMonth('April')}</option>
          <option value="May">{tMonth('May')}</option>
          <option value="Jun">{tMonth('June')}</option>
          <option value="Jul">{tMonth('July')}</option>
          <option value="Aug">{tMonth('August')}</option>
          <option value="Sep">{tMonth('September')}</option>
          <option value="Oct">{tMonth('October')}</option>
          <option value="Nov">{tMonth('November')}</option>
          <option value="Dec">{tMonth('December')}</option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('adm_ph_allMethods')}</option>
          <option value="Cash">{tMethod('Cash')}</option>
          <option value="Mobile money">{tMethod('Mobile money')}</option>
          <option value="Bank transfer">{tMethod('Bank transfer')}</option>
          <option value="Cheque">{tMethod('Cheque')}</option>
        </select>
      </div>

      {/* Payments Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredPayments.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_ph_empty')}
            </div>
          ) : (
            filteredPayments.map((p) => {
              const sName = getStudentName(p.studentId);
              const isRowLocked =
                isHistoricalReadOnly ||
                (p.academicYearId ? storage.isAcademicYearReadOnly(schoolId, p.academicYearId) : false);
              return (
                <div
                  key={p.id}
                  className={`p-4 space-y-2.5 ${p.isVoided ? 'opacity-65 bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                        {sName}
                        {p.isVoided && (
                          <span className="ms-1.5 text-[10px] text-red-500 font-bold uppercase">
                            {t('adm_ph_voidedTag')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B7280]">{p.date} · {tMethod(p.method)}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="font-extrabold font-sora text-base text-[#23265A]">
                        ${p.amount.toFixed(2)}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7] text-[10px] font-bold">
                        {getAyName(p.academicYearId)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-[#555A8A] bg-[#F8F9FE] rounded-xl p-2.5">
                    <span className="text-[#6B7280] font-semibold me-1">{t('adm_ph_col_months')}:</span>
                    <span>{p.monthsCovered.map((m) => tMonth(m)).join(', ')}</span>
                  </div>
                  {p.isVoided ? (
                    <div className="text-xs font-semibold text-gray-400">{t('adm_ph_voidedAudit')}</div>
                  ) : isRowLocked ? (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                      <Lock size={11} />
                      {t('common_historical')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="min-h-[44px] border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                      >
                        {t('common_edit')}
                      </button>
                      <button
                        onClick={() => handleVoid(p)}
                        className="min-h-[44px] border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                      >
                        {t('adm_ph_voidBtn')}
                      </button>
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
                <th className="py-4 px-6 sticky start-0 bg-white z-10">{t('common_date')}</th>
                <th className="py-4 px-6">{t('common_student')}</th>
                <th className="py-4 px-6">{t('adm_ph_col_targetYear')}</th>
                <th className="py-4 px-6">{t('adm_ph_col_months')}</th>
                <th className="py-4 px-6">{t('adm_ph_col_amount')}</th>
                <th className="py-4 px-6">{t('adm_ph_col_method')}</th>
                <th className="py-4 px-6 text-end">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                    {t('adm_ph_empty')}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const sName = getStudentName(p.studentId);
                  const isRowLocked =
                    isHistoricalReadOnly ||
                    (p.academicYearId ? storage.isAcademicYearReadOnly(schoolId, p.academicYearId) : false);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#F9FAFE] transition-colors ${
                        p.isVoided ? 'opacity-60 bg-gray-50' : ''
                      }`}
                    >
                      <td className="py-4 px-6 text-[#23265A] font-medium sticky start-0 bg-white">
                        {p.date}
                      </td>
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A]">
                        {sName}
                        {p.isVoided && (
                          <span className="ms-2 text-[10px] text-red-500 font-bold uppercase tracking-wider">
                            {t('adm_ph_voidedTag')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7] text-[11px] font-bold">
                          {getAyName(p.academicYearId)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {p.monthsCovered.map((m) => tMonth(m)).join(', ')}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#23265A]">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-xs text-[#5458A7] font-semibold">
                        {tMethod(p.method)}
                      </td>
                      <td className="py-4 px-6 text-end">
                        {p.isVoided ? (
                          <span className="text-xs font-semibold text-gray-400">
                            {t('adm_ph_voidedAudit')}
                          </span>
                        ) : isRowLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                            <Lock size={11} />
                            {t('common_historical')}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                            >
                              {t('common_edit')}
                            </button>
                            <button
                              onClick={() => handleVoid(p)}
                              className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                            >
                              {t('adm_ph_voidBtn')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="text-xl font-extrabold font-sora text-[#23265A] mb-4">
              {t('adm_ph_modalEditTitle')}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_ph_amountLabel')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_rp_methodLabel')}
                </label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                >
                  <option value="Cash">{tMethod('Cash')}</option>
                  <option value="Mobile money">{tMethod('Mobile money')}</option>
                  <option value="Bank transfer">{tMethod('Bank transfer')}</option>
                  <option value="Cheque">{tMethod('Cheque')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('common_date')}
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_ph_noteLabel')}
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB]"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95"
                >
                  {t('adm_ph_updateBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
