import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Header } from '../common/Header';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { excelService } from '../../services/excelService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PaymentMethod, FeePayment, Student, StudentFeeHistoryDetails } from '../../types';
import {
  Search,
  Check,
  CheckCircle2,
  Printer,
  Download,
  User,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
  CreditCard,
  FileCheck,
  CalendarDays,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';

interface RecordPaymentProps {
  initialStudentId?: string;
  initialAcademicYearId?: string;
  onGoToPaymentHistory: () => void;
  onCancel: () => void;
  onShowToast: (msg: string) => void;
}

const ALL_12_MONTHS = [
  { index: 1, name: 'January', short: 'Jan' },
  { index: 2, name: 'February', short: 'Feb' },
  { index: 3, name: 'March', short: 'Mar' },
  { index: 4, name: 'April', short: 'Apr' },
  { index: 5, name: 'May', short: 'May' },
  { index: 6, name: 'June', short: 'Jun' },
  { index: 7, name: 'July', short: 'Jul' },
  { index: 8, name: 'August', short: 'Aug' },
  { index: 9, name: 'September', short: 'Sep' },
  { index: 10, name: 'October', short: 'Oct' },
  { index: 11, name: 'November', short: 'Nov' },
  { index: 12, name: 'December', short: 'Dec' },
];

export const RecordPayment: React.FC<RecordPaymentProps> = ({
  initialStudentId,
  initialAcademicYearId,
  onGoToPaymentHistory,
  onCancel,
  onShowToast,
}) => {
  const {
    school,
    selectedAcademicYear,
    activeAcademicYear,
    academicYears,
    isHistoricalReadOnly,
    refresh,
  } = useAuth();
  const { t, tMethod, tMonth, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const allowAdvancePayments = school?.allowAdvancePayments !== false;
  const ayId = selectedAcademicYear?.id;

  const students = storage.getStudents(schoolId, ayId);
  const classes = storage.getClasses(schoolId, ayId);
  const todayStr = new Date().toISOString().split('T')[0];

  // Selected Student State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students.length > 0 ? students[0].id : '')
  );

  // Target Academic Year being settled (can be current year OR a previous year's debt)
  const [targetPaymentAyId, setTargetPaymentAyId] = useState<string>(
    initialAcademicYearId || ayId || activeAcademicYear?.id || ''
  );

  useEffect(() => {
    if (initialAcademicYearId) {
      setTargetPaymentAyId(initialAcademicYearId);
    } else if (ayId) {
      setTargetPaymentAyId(ayId);
    }
  }, [initialAcademicYearId, ayId]);

  useEffect(() => {
    if (students.length > 0 && !students.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(initialStudentId && students.some((s) => s.id === initialStudentId) ? initialStudentId : students[0].id);
    }
  }, [ayId, students.length, initialStudentId]);

  // Smart Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [dateReceived, setDateReceived] = useState<string>(todayStr);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Generated Receipt State
  const [completedPayment, setCompletedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Helper to get class name
  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || t('common_unassigned');
  };

  const selectedStudent: Student | undefined = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || (selectedStudentId ? storage.getStudentById(selectedStudentId, ayId) : undefined);
  }, [students, selectedStudentId, ayId]);

  // Multi-year context from the currently viewed academic year
  const activeContextDetails: StudentFeeHistoryDetails | null = useMemo(() => {
    if (!selectedStudentId) return null;
    return storage.getStudentFeeHistoryDetails(schoolId, selectedStudentId, ayId);
  }, [schoolId, selectedStudentId, ayId, completedPayment]);

  // Target year details (the exact academic year whose months/debt are being settled)
  const effectiveTargetAyId = targetPaymentAyId || ayId || activeAcademicYear?.id;
  const targetAyObj = useMemo(() => {
    return (
      academicYears.find((y) => y.id === effectiveTargetAyId) ||
      selectedAcademicYear ||
      activeAcademicYear ||
      undefined
    );
  }, [academicYears, effectiveTargetAyId, selectedAcademicYear, activeAcademicYear]);

  const feeDetails: StudentFeeHistoryDetails | null = useMemo(() => {
    if (!selectedStudentId) return null;
    return storage.getStudentFeeHistoryDetails(schoolId, selectedStudentId, effectiveTargetAyId);
  }, [schoolId, selectedStudentId, effectiveTargetAyId, completedPayment]);

  const displayYear = useMemo(() => {
    if (feeDetails?.monthsBreakdown && feeDetails.monthsBreakdown.length > 0) {
      return feeDetails.monthsBreakdown[0].year;
    }
    return storage.getCalendarYearForAcademicYear(targetAyObj);
  }, [feeDetails, targetAyObj]);

  // Map 12 months with their live payment status from storage for the target year
  const months12StatusList = useMemo(() => {
    if (!selectedStudent) return [];

    const monthlyFee = feeDetails?.monthlyFee ?? (selectedStudent.monthlyFee || 45);

    return ALL_12_MONTHS.map((m) => {
      const record = feeDetails?.monthsBreakdown.find((r) => r.monthIndex === m.index);
      const year = record?.year || displayYear;
      const expectedFee = record?.expectedFee ?? monthlyFee;
      const paid = record?.paidAmount ?? 0;
      const balance = record?.balance ?? expectedFee;
      const isBeforeEnrollment = record ? expectedFee === 0 : false;
      const isPaid = record ? expectedFee === 0 || record.status === 'Paid' : false;
      const isPartial = record ? record.status === 'Partial' : false;
      const isOverdue = record ? record.status === 'Overdue' : false;
      const isAdvance = record ? Boolean(record.isAdvance) : true;
      const isPolicyLocked = isAdvance && !allowAdvancePayments;

      return {
        ...m,
        year,
        displayName: `${m.name} ${year}`,
        isPaid,
        isPartial,
        isOverdue,
        isAdvance,
        isPolicyLocked,
        isBeforeEnrollment,
        balance,
        paid,
        expectedFee,
      };
    });
  }, [selectedStudent, feeDetails, displayYear, allowAdvancePayments]);

  // Initialize selected months and suggested amount when student or target year changes
  useEffect(() => {
    if (!feeDetails || months12StatusList.length === 0) return;

    const selectableList = months12StatusList.filter((m) => !m.isPaid && !m.isPolicyLocked);
    const dueFirst = selectableList.filter((m) => !m.isAdvance);

    if (dueFirst.length > 0) {
      const firstUnpaid = dueFirst[0];
      setSelectedMonths([firstUnpaid.short]);
      setAmountReceived(firstUnpaid.balance);
    } else if (selectableList.length > 0) {
      const nextMonth = selectableList[0];
      setSelectedMonths([nextMonth.short]);
      setAmountReceived(nextMonth.balance || nextMonth.expectedFee);
    } else {
      setSelectedMonths([]);
      setAmountReceived(0);
    }
  }, [selectedStudentId, effectiveTargetAyId, feeDetails?.student.id, allowAdvancePayments]);

  // Filter students dynamically for the Smart Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return students.slice(0, 10);
    }
    const q = searchQuery.toLowerCase().trim();
    return students
      .filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const idMatch = s.studentIdNumber.toLowerCase().includes(q);
        const phoneMatch = s.guardianPhone.toLowerCase().includes(q);
        const classMatch = getClassName(s.classId).toLowerCase().includes(q);
        return nameMatch || idMatch || phoneMatch || classMatch;
      })
      .slice(0, 15);
  }, [students, searchQuery, classes]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle student selection from autocomplete
  const handleSelectStudent = (s: Student) => {
    setSelectedStudentId(s.id);
    if (ayId) {
      setTargetPaymentAyId(ayId);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
    setError('');
  };

  // Toggle selection of any of the 12 months (Requirements 2, 4, 5)
  const handleToggleMonth = (monthShort: string, isDisabled: boolean) => {
    if (isDisabled) return;

    let updatedMonths: string[];
    if (selectedMonths.includes(monthShort)) {
      if (selectedMonths.length === 1) {
        return;
      }
      updatedMonths = selectedMonths.filter((m) => m !== monthShort);
    } else {
      updatedMonths = [...selectedMonths, monthShort];
    }
    setSelectedMonths(updatedMonths);

    const totalBalance = months12StatusList
      .filter((m) => updatedMonths.includes(m.short))
      .reduce((sum, m) => sum + m.balance, 0);

    setAmountReceived(totalBalance > 0 ? totalBalance : selectedStudent?.monthlyFee || 45);
  };

  // Quick Select Helpers
  const selectAllUnpaidMonths = () => {
    const dueUnpaids = months12StatusList.filter((m) => !m.isPaid && !m.isAdvance);
    const targetList = dueUnpaids.length > 0
      ? dueUnpaids
      : months12StatusList.filter((m) => !m.isPaid && !m.isPolicyLocked);
    if (targetList.length === 0) return;
    const shorts = targetList.map((m) => m.short);
    setSelectedMonths(shorts);
    const sumBal = targetList.reduce((sum, m) => sum + m.balance, 0);
    setAmountReceived(sumBal);
  };

  const selectOldestUnpaidMonth = () => {
    const unpaids = months12StatusList.filter((m) => !m.isPaid && !m.isPolicyLocked);
    if (unpaids.length === 0) return;
    const oldest = unpaids[0];
    setSelectedMonths([oldest.short]);
    setAmountReceived(oldest.balance);
  };

  const handleToggleAdvancePolicy = async () => {
    const nextValue = !allowAdvancePayments;
    try {
      await storage.updateSchoolFeePolicy(schoolId, nextValue);
      await refresh();
      onShowToast(
        nextValue
          ? t('adm_rp_policyAllowedToast')
          : t('adm_rp_policyRestrictedToast')
      );
    } catch (err: any) {
      setError(tServiceMsg(err?.message) || t('adm_rp_errHist'));
    }
  };

  // Calculations for live balance remaining
  const currentTotalOutstanding = feeDetails?.remainingBalance ?? 0;
  const selectedMonthsBalance = months12StatusList
    .filter((m) => selectedMonths.includes(m.short))
    .reduce((sum, m) => sum + m.balance, 0);
  const newBalanceRemaining = Math.max(0, currentTotalOutstanding - (amountReceived || 0));

  // Save Payment Handler
  const handleSavePayment = async () => {
    setError('');
    if (isHistoricalReadOnly) {
      setError(t('adm_rp_errHist'));
      return;
    }
    if (!selectedStudentId || !selectedStudent) {
      setError(t('adm_rp_errNoStudent'));
      return;
    }
    if (!amountReceived || amountReceived <= 0) {
      setError(t('adm_rp_errInvalidAmount'));
      return;
    }
    if (selectedMonths.length === 0) {
      setError(t('adm_rp_errNoMonths'));
      return;
    }

    try {
      const recorded = await storage.recordPayment(
        schoolId,
        selectedStudentId,
        Number(amountReceived),
        dateReceived,
        paymentMethod,
        selectedMonths,
        note.trim(),
        effectiveTargetAyId
      );

      setCompletedPayment(recorded);
      setShowReceiptModal(true);
      onShowToast(
        t('adm_rp_successToast', {
          amount: Number(amountReceived).toFixed(2),
          name: selectedStudent.name,
          year: targetAyObj?.name || t('adm_currentYearFallback'),
        })
      );
    } catch (err: any) {
      setError(tServiceMsg(err?.message) || t('adm_rp_errHist'));
    }
  };

  // Download Receipt via Excel Service
  const handleDownloadReceipt = () => {
    if (!completedPayment || !selectedStudent) return;
    const headers = [
      t('adm_sp_col_receiptId'),
      t('common_school'),
      t('adm_rp_targetAy'),
      t('common_date'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      t('common_class'),
      `${t('adm_ph_col_amount')} ($)`,
      t('adm_rp_methodLabel'),
      t('adm_sp_col_monthsCovered'),
      t('adm_ph_noteLabel'),
      `${t('adm_sp_col_remBalance')} ($)`,
    ];
    const row = [
      completedPayment.id,
      school?.name || t('common_school'),
      targetAyObj?.name || '',
      completedPayment.date,
      selectedStudent.studentIdNumber,
      selectedStudent.name,
      getClassName(selectedStudent.classId),
      completedPayment.amount,
      tMethod(completedPayment.method),
      completedPayment.monthsCovered.map((m) => `${tMonth(m)} ${displayYear}`).join(', '),
      completedPayment.note || '--',
      newBalanceRemaining,
    ];
    const res = excelService.generateWorkbook(
      `Receipt_${completedPayment.id}_${selectedStudent.studentIdNumber}.xlsx`,
      [{ name: t('adm_rp_receiptTitle'), headers, data: [row] }]
    );
    if (res.success) {
      onShowToast(t('adm_exportedAllToast', { count: 1 }));
    } else {
      onShowToast(tServiceMsg(res.error) || t('adm_exportFail'));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <Header
        title={t('adm_rp_title')}
        subtitle={
          selectedAcademicYear
            ? t('adm_rp_subActive', {
                year: `${selectedAcademicYear.name}${
                  isHistoricalReadOnly
                    ? ` (${t('common_historical')} · ${t('common_readOnly')})`
                    : ''
                }`,
              })
            : undefined
        }
        searchPlaceholder={t('adm_fee_searchPh')}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const res = excelService.exportPaymentHistory(schoolId, undefined, 'All', effectiveTargetAyId);
                onShowToast(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : tServiceMsg(res.error) || t('adm_exportFail')
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>{t('adm_rp_exportPaymentsBtn')}</span>
            </button>
            <button
              onClick={onGoToPaymentHistory}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7] text-[#5458A7] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer inline-flex items-center"
            >
              {t('nav_paymentHistory')}
            </button>
          </div>
        }
      />

      {/* Subtitle Notice */}
      <div>
        <div className="inline-flex max-w-full items-center gap-2 bg-[#EEEEF8] text-[#5458A7] text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-2xl sm:rounded-full shadow-xs leading-relaxed">
          <span>{t('adm_rp_notice')}</span>
        </div>
      </div>

      {isHistoricalReadOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-800 font-medium flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          <span>
            {t('adm_rp_histBanner', { year: selectedAcademicYear?.name || '' })}
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 font-bold hover:text-red-700 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: SMART STUDENT SEARCH */}
      <div className="bg-white border border-[#E4E6F3] rounded-[24px] p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-sm font-extrabold font-sora text-[#23265A]">
              {t('adm_rp_searchLabel')}
            </label>
            <p className="text-xs text-[#6B7280] font-manrope">
              {t('adm_rp_searchSub')}
            </p>
          </div>

          {selectedStudent && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">{t('adm_rp_currentlySelected')}</span>
              <span className="px-3 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7] font-bold text-xs">
                {selectedStudent.name} ({selectedStudent.studentIdNumber})
              </span>
            </div>
          )}
        </div>

        {/* Search Input with Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute start-4 text-[#5458A7]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder={t('adm_rp_searchPh')}
              className="w-full ps-11 pe-10 py-3 rounded-2xl border border-[#D5D7EE] bg-white text-sm font-medium text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/25 focus:border-[#5458A7] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-4 text-[#9CA3AF] hover:text-[#23265A] cursor-pointer"
                aria-label={t('common_clearSearch')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Results Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full inset-x-0 mt-2 bg-white border border-[#E4E6F3] rounded-2xl shadow-xl z-40 max-h-72 overflow-y-auto divide-y divide-[#F0F2FA] animate-in fade-in duration-100">
              <div className="p-2.5 bg-[#FAFAFE] text-[11px] font-bold text-[#5458A7] uppercase tracking-wider flex justify-between">
                <span>{t('adm_rp_matchingCount', { count: searchResults.length })}</span>
                <span className="font-normal text-[#6B7280]">{t('adm_rp_clickToSelect')}</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6B7280]">
                  {t('adm_rp_noMatch', { query: searchQuery })}
                </div>
              ) : (
                searchResults.map((s) => {
                  const sDetails = storage.getStudentFeeHistoryDetails(schoolId, s.id, ayId);
                  const isSelected = s.id === selectedStudentId;
                  const combinedDue = sDetails?.combinedOutstandingBalance ?? 0;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className={`w-full px-3.5 sm:px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-start hover:bg-[#F3F4FB] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#EEEEF8]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#5458A7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#23265A] flex flex-wrap items-center gap-1.5">
                            <span className="wrap-anywhere">{s.name}</span>
                            <span className="text-xs font-mono font-semibold text-[#5458A7] bg-[#EEEEF8] px-2 py-0.5 rounded-md">
                              {s.studentIdNumber}
                            </span>
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5 wrap-anywhere">
                            {t('common_class')}: {getClassName(s.classId)} · {t('common_phone')}: {s.guardianPhone}
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        {combinedDue === 0 ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            {t('adm_rp_cleared')}
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                              {t('adm_rp_amountDuePill', { amount: combinedDue.toFixed(2) })}
                            </span>
                            {(sDetails?.previousYearsOutstanding || 0) > 0 && (
                              <span className="text-[10px] font-semibold text-rose-600">
                                {t('adm_rp_inclPriorDebt', {
                                  amount: (sDetails?.previousYearsOutstanding || 0).toFixed(2),
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: STUDENT FEE SUMMARY CARD (MULTI-YEAR CARRY-FORWARD AWARE) */}
      {selectedStudent && feeDetails && activeContextDetails && (
        <div className="bg-white border border-[#E4E6F3] rounded-[24px] p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F2FA] pb-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#5458A7] text-white flex items-center justify-center font-sora font-extrabold text-base sm:text-lg shadow-xs shrink-0">
                {selectedStudent.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A] wrap-anywhere">
                  {selectedStudent.name}
                </h3>
                <div className="text-xs font-semibold text-[#555A8A] mt-0.5 wrap-anywhere">
                  {t('adm_unp_col_id')}:{' '}
                  <span className="font-mono text-[#5458A7]">{selectedStudent.studentIdNumber}</span> ·{' '}
                  {t('common_class')}:{' '}
                  <span className="text-[#23265A]">{getClassName(selectedStudent.classId)}</span> ·{' '}
                  {t('adm_sp_guardian')}: {selectedStudent.guardianName} ({selectedStudent.guardianPhone})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">
                {t('adm_rp_yearStatus', { year: targetAyObj?.name || '' })}
              </span>
              <StatusChip label={feeDetails.overallStatus} />
            </div>
          </div>

          {/* 6 Multi-Year Summary Metric Cards */}
          <div className="grid grid-cols-1 min-[370px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
            <div className="p-3.5 bg-[#FAFAFE] border border-[#E4E6F3] rounded-2xl">
              <div className="text-[11px] font-semibold text-[#6B7280]">{t('adm_rp_monthlyFee')}</div>
              <div className="text-lg font-extrabold font-sora text-[#23265A] mt-1">
                ${feeDetails.monthlyFee.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#5458A7] mt-0.5 font-medium">
                {t('adm_rp_startPrefix', { date: feeDetails.feeStartDate })}
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border ${activeContextDetails.previousYearsOutstanding > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-[#FAFAFE] border-[#E4E6F3]'}`}>
              <div className="text-[11px] font-semibold text-[#6B7280]">{t('adm_rp_prevYearsDebt')}</div>
              <div className={`text-lg font-extrabold font-sora mt-1 ${activeContextDetails.previousYearsOutstanding > 0 ? 'text-rose-700' : 'text-[#23265A]'}`}>
                ${activeContextDetails.previousYearsOutstanding.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">
                {activeContextDetails.previousYearDebts.length > 0
                  ? t('adm_rp_priorYearsCount', { count: activeContextDetails.previousYearDebts.length })
                  : t('adm_rp_noCarryDebt')}
              </div>
            </div>

            <div className="p-3.5 bg-[#FAFAFE] border border-[#E4E6F3] rounded-2xl">
              <div className="text-[11px] font-semibold text-[#6B7280]">{t('adm_rp_currYearFees')}</div>
              <div className="text-lg font-extrabold font-sora text-[#23265A] mt-1">
                ${activeContextDetails.totalFeesExpected.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">
                {activeContextDetails.academicYearName}
              </div>
            </div>

            <div className="p-3.5 bg-[#FAFAFE] border border-[#E4E6F3] rounded-2xl">
              <div className="text-[11px] font-semibold text-[#6B7280]">{t('adm_rp_currYearPayments')}</div>
              <div className="text-lg font-extrabold font-sora text-emerald-700 mt-1">
                ${activeContextDetails.totalAmountPaid.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">
                {t('adm_rp_paidMonthsRatio', {
                  paid: feeDetails.totalMonthsPaid,
                  expected: feeDetails.totalMonthsExpected,
                })}
              </div>
            </div>

            <div className="p-3.5 bg-[#FAFAFE] border border-[#E4E6F3] rounded-2xl">
              <div className="text-[11px] font-semibold text-[#6B7280]">{t('adm_rp_targetYearDue')}</div>
              <div className="text-lg font-extrabold font-sora text-amber-700 mt-1">
                ${feeDetails.remainingBalance.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5 truncate">
                {t('adm_rp_payingYear', { year: targetAyObj?.name || '' })}
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="text-[11px] font-semibold text-amber-900">{t('adm_rp_combinedTotalBal')}</div>
              <div className="text-lg font-extrabold font-sora text-amber-700 mt-1">
                ${activeContextDetails.combinedOutstandingBalance.toFixed(2)}
              </div>
              <div className="text-[10px] text-amber-800 font-medium mt-0.5">{t('adm_rp_priorPlusCurr')}</div>
            </div>
          </div>

          {/* Target Academic Year Allocation Switcher */}
          {(activeContextDetails.previousYearDebts.length > 0 || academicYears.length > 1) && (
            <div className="pt-3 border-t border-[#F0F2FA] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold font-sora text-[#23265A]">
                    {t('adm_rp_allocateTitle')}
                  </span>
                  <span className="text-xs text-[#6B7280] ms-2">
                    {t('adm_rp_allocateDesc')}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {activeContextDetails.previousYearDebts.map((prevDebt) => {
                  const isChosen = effectiveTargetAyId === prevDebt.academicYearId;
                  return (
                    <button
                      key={prevDebt.academicYearId}
                      type="button"
                      onClick={() => setTargetPaymentAyId(prevDebt.academicYearId)}
                      className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        isChosen
                          ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      <span>{t('adm_rp_prevYearDebtBtn', { year: prevDebt.academicYearName })}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${isChosen ? 'bg-white/20 text-white' : 'bg-white text-rose-700'}`}>
                        {t('adm_rp_amountDuePill', { amount: prevDebt.outstandingBalance.toFixed(2) })}
                      </span>
                    </button>
                  );
                })}
                {selectedAcademicYear && (
                  <button
                    type="button"
                    onClick={() => setTargetPaymentAyId(selectedAcademicYear.id)}
                    className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      effectiveTargetAyId === selectedAcademicYear.id
                        ? 'bg-[#5458A7] border-[#5458A7] text-white shadow-xs'
                        : 'bg-[#F4F5FB] border-[#D5D7EE] text-[#23265A] hover:bg-[#EEEEF8]'
                    }`}
                  >
                    <span>{t('adm_rp_currYearBtn', { year: selectedAcademicYear.name })}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${effectiveTargetAyId === selectedAcademicYear.id ? 'bg-white/20 text-white' : 'bg-white text-[#5458A7]'}`}>
                      {t('adm_rp_amountDuePill', { amount: activeContextDetails.remainingBalance.toFixed(2) })}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ALL 12 MONTHS COVERED SELECTOR */}
      {selectedStudent && (
        <div className="bg-white border border-[#E4E6F3] rounded-[24px] p-4 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="text-[#5458A7] shrink-0" size={20} />
                <h3 className="text-base sm:text-lg font-extrabold font-sora text-[#23265A]">
                  {t('adm_rp_selectMonthsTitle', {
                    year: targetAyObj?.name || displayYear,
                    calYear: displayYear,
                  })}
                </h3>
              </div>
              <p className="text-xs text-[#6B7280] font-manrope mt-1">
                {t('adm_rp_selectMonthsSub', { year: targetAyObj?.name || displayYear })}
              </p>
            </div>

            {/* Quick Select & Policy Actions */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleToggleAdvancePolicy}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full border font-bold cursor-pointer transition-all ${
                  allowAdvancePayments
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                {t('adm_rp_policyLabel', {
                  state: allowAdvancePayments ? t('adm_rp_policyAllowed') : t('adm_rp_policyRestricted'),
                })}
              </button>
              <button
                type="button"
                onClick={selectOldestUnpaidMonth}
                className="min-h-[38px] px-3.5 py-1.5 rounded-full border border-[#D5D7EE] text-[#5458A7] font-bold hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('adm_rp_oldestUnpaid')}
              </button>
              <button
                type="button"
                onClick={selectAllUnpaidMonths}
                className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#EEEEF8] text-[#5458A7] font-bold hover:bg-[#E2E4F4] cursor-pointer"
              >
                {t('adm_rp_selectAllUnpaid')}
              </button>
            </div>
          </div>

          {/* Responsive 12 Months Grid: 4 cols Desktop, 3 cols Tablet, 2 cols Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
            {months12StatusList.map((m) => {
              const isSelected = selectedMonths.includes(m.short);
              const isDisabled = m.isPaid || m.isPolicyLocked;

              // Visual State determination
              let cardBg = 'bg-white border-[#D5D7EE] hover:border-[#5458A7]/50 cursor-pointer';
              let badgeContent = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{t('adm_rp_badgeUnpaid')}</span>;
              let balanceText = t('adm_rp_amountDuePill', { amount: m.balance.toFixed(2) });
              let balanceColor = 'text-[#23265A]';

              if (m.isPaid) {
                cardBg = 'bg-emerald-50/50 border-emerald-200 cursor-not-allowed opacity-80';
                badgeContent = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{t('adm_rp_badgePaid')}</span>;
                balanceText = t('adm_rp_fullyCleared');
                balanceColor = 'text-emerald-700 font-semibold';
              } else if (m.isPolicyLocked) {
                cardBg = 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-65';
                badgeContent = <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{t('adm_rp_badgeFuture')}</span>;
                balanceText = t('adm_rp_advanceDisabled');
                balanceColor = 'text-slate-500 font-medium';
              } else if (isSelected) {
                cardBg = 'bg-[#5458A7] border-[#5458A7] text-white shadow-sm ring-2 ring-[#5458A7]/20 cursor-pointer';
                badgeContent = (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-[#5458A7] flex items-center gap-1">
                    <Check size={10} strokeWidth={3} />
                    {t('adm_rp_badgeSelected')}
                  </span>
                );
                balanceText = t('adm_rp_applying', { amount: m.balance.toFixed(2) });
                balanceColor = 'text-white/90 font-bold';
              } else if (m.isPartial) {
                cardBg = 'bg-amber-50/50 border-amber-300 hover:border-amber-400 cursor-pointer';
                badgeContent = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{t('adm_rp_badgePartial')}</span>;
                balanceText = t('adm_rp_remaining', { amount: m.balance.toFixed(2) });
                balanceColor = 'text-amber-700 font-bold';
              } else if (m.isOverdue) {
                cardBg = 'bg-rose-50/40 border-rose-200 hover:border-rose-300 cursor-pointer';
                badgeContent = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">{t('adm_rp_badgeOverdue')}</span>;
                balanceText = t('adm_rp_pastDue', { amount: m.balance.toFixed(2) });
                balanceColor = 'text-rose-700 font-bold';
              } else if (m.isAdvance) {
                cardBg = 'bg-[#FAFAFE] border-[#E4E6F3] hover:border-[#5458A7]/40 cursor-pointer';
                badgeContent = <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7]">{t('adm_rp_badgeAdvance')}</span>;
                balanceText = `$${m.balance.toFixed(2)} ${t('common_perMonth')}`;
                balanceColor = 'text-[#555A8A] font-medium';
              }

              return (
                <button
                  key={m.index}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleToggleMonth(m.short, isDisabled)}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all select-none flex flex-col justify-between min-h-[100px] text-start w-full ${cardBg}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 w-full">
                    <span className={`font-sora font-extrabold text-xs sm:text-sm ${isSelected ? 'text-white' : 'text-[#23265A]'}`}>
                      {tMonth(m.name)} <span className="text-[11px] sm:text-xs font-normal opacity-75">{m.year}</span>
                    </span>
                    {badgeContent}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] sm:text-xs w-full gap-1">
                    <span className={balanceColor}>
                      {balanceText}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white text-[#5458A7] flex items-center justify-center font-bold shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: PAYMENT FORM & LIVE ALLOCATION CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Form Inputs */}
        <div className="lg:col-span-7 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
          <h3 className="text-lg font-extrabold font-sora text-[#23265A]">
            {t('adm_rp_entryTitle')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Amount Received */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_rp_amountLabel')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-base font-extrabold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/25 focus:border-[#5458A7]"
              />
              <p className="text-[11px] text-[#6B7280] mt-1 font-manrope">
                {t('adm_rp_supportsPartial')}
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_rp_methodLabel')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
              >
                <option value="Cash">{tMethod('Cash')}</option>
                <option value="Mobile money">{tMethod('Mobile money')}</option>
                <option value="Bank transfer">{tMethod('Bank transfer')}</option>
                <option value="Cheque">{tMethod('Cheque')}</option>
              </select>
            </div>

            {/* Date Received */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_rp_dateLabel')}
              </label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
              />
            </div>

            {/* Months Covered Summary */}
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-2">
                {t('adm_rp_selectedMonthsLabel', { count: selectedMonths.length })}
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedMonths.length === 0 ? (
                  <span className="text-xs text-red-500 font-semibold">
                    {t('adm_rp_noMonthSelWarn')}
                  </span>
                ) : (
                  selectedMonths.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-full bg-[#5458A7] text-white font-bold text-xs"
                    >
                      {tMonth(m)} {displayYear}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Note or Reference */}
          <div>
            <label className="block text-xs font-bold text-[#23265A] mb-2">
              {t('adm_rp_noteLabel')}
            </label>
            <input
              type="text"
              placeholder={t('adm_rp_notePh')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            />
          </div>
        </div>

        {/* Right Live Preview & Calculation Card */}
        <div className="lg:col-span-5 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
          <h2 className="text-xl font-extrabold font-sora text-[#23265A]">
            {t('adm_rp_allocCardTitle')}
          </h2>

          <p className="text-xs text-[#555A8A] leading-relaxed">
            {t('adm_rp_allocCardDesc')}
          </p>

          <div className="space-y-3 pt-2 border-t border-[#F0F2FA] text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">{t('adm_rp_targetAy')}</span>
              <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7]">
                {targetAyObj?.name || t('adm_currentYearFallback')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">{t('adm_rp_targetYearOutstanding')}</span>
              <span className="font-bold text-base text-[#23265A]">
                ${currentTotalOutstanding.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">{t('adm_rp_selectedMonthsTotal', { count: selectedMonths.length })}</span>
              <span className="font-bold text-base text-[#5458A7]">
                ${selectedMonthsBalance.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">{t('adm_rp_amountReceivingNow')}</span>
              <span className="font-extrabold text-base text-emerald-700">
                ${(amountReceived || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F0F2FA]">
              <span className="text-[#23265A] font-bold">
                {t('adm_rp_newRemainingBal', { year: targetAyObj?.name || '' })}
              </span>
              <span
                className={`font-extrabold text-xl font-sora ${
                  newBalanceRemaining === 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                ${newBalanceRemaining.toFixed(2)}
              </span>
            </div>

            {newBalanceRemaining === 0 && currentTotalOutstanding > 0 && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                <span>{t('adm_rp_willClearAll', { year: targetAyObj?.name || '' })}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              type="button"
              disabled={isHistoricalReadOnly}
              onClick={handleSavePayment}
              className="w-full bg-[#5458A7] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-95 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isHistoricalReadOnly ? <Lock size={16} /> : <CreditCard size={18} />}
              <span>{isHistoricalReadOnly ? t('adm_rp_histArchiveBtn') : t('adm_rp_submitBtn')}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full border-2 border-[#5458A7] text-[#5458A7] py-3 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              {t('common_cancel')}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: PAYMENT SUCCESS & OFFICIAL RECEIPT MODAL */}
      {showReceiptModal && completedPayment && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-xl w-full p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 my-auto max-h-[90dvh] overflow-y-auto animate-in zoom-in-95 duration-150 print:p-0 print:border-none print:shadow-none">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E4E6F3] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                    {t('adm_rp_receiptTitle')}
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    {t('adm_rp_receiptSub')}
                  </p>
                </div>
              </div>

              <span className="font-mono text-xs font-bold text-[#5458A7] bg-[#EEEEF8] px-3 py-1.5 rounded-full">
                {t('adm_rp_receiptNum', { id: completedPayment.id })}
              </span>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-5 rounded-2xl bg-[#FAFAFE] border border-[#E4E6F3] space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('common_school')}:</span>
                <span className="font-bold text-[#23265A]">{school?.name || t('common_school')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_targetAy')}:</span>
                <span className="font-bold text-[#5458A7]">{targetAyObj?.name || t('adm_currentYearFallback')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_col_studentName')}</span>
                <span className="font-bold text-[#23265A]">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_col_studentId')}</span>
                <span className="font-mono font-bold text-[#5458A7]">{selectedStudent.studentIdNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_col_class')}</span>
                <span className="font-bold text-[#23265A]">{getClassName(selectedStudent.classId)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_col_payDate')}</span>
                <span className="font-semibold text-[#23265A]">{completedPayment.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_col_payMethod')}</span>
                <span className="font-semibold text-[#23265A]">{tMethod(completedPayment.method)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_rp_monthsCovered')}</span>
                <span className="font-bold text-[#5458A7]">
                  {completedPayment.monthsCovered.map((m) => `${tMonth(m)} ${displayYear}`).join(', ')}
                </span>
              </div>
              {completedPayment.note && (
                <div className="flex justify-between py-1 border-b border-[#F0F2FA]">
                  <span className="text-[#6B7280]">{t('adm_rp_refNote')}</span>
                  <span className="text-[#23265A]">{completedPayment.note}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-[#E4E6F3] text-sm">
                <span className="font-bold text-[#23265A]">{t('adm_rp_amountPaid')}</span>
                <span className="font-extrabold text-emerald-700 text-lg">
                  ${completedPayment.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="text-[#6B7280]">{t('adm_rp_remainingBalYear', { year: targetAyObj?.name || '' })}</span>
                <span className="font-bold text-amber-700">
                  ${newBalanceRemaining.toFixed(2)}
                </span>
              </div>
              {activeContextDetails && (
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-[#6B7280]">{t('adm_rp_combinedBalAll')}</span>
                  <span className="font-bold text-[#23265A]">
                    ${activeContextDetails.combinedOutstandingBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 pt-2 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial justify-center min-h-[44px] lg:min-h-0 px-4 py-2 rounded-full border border-[#D5D7EE] text-[#23265A] font-bold text-xs hover:bg-[#F3F4FB] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{t('common_print')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="flex-1 sm:flex-initial justify-center min-h-[44px] lg:min-h-0 px-4 py-2 rounded-full border border-[#D5D7EE] text-[#23265A] font-bold text-xs hover:bg-[#F3F4FB] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>{t('common_downloadExcel')}</span>
                </button>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setAmountReceived(0);
                    setNote('');
                  }}
                  className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-5 py-2.5 rounded-full border border-[#5458A7] text-[#5458A7] font-bold text-xs hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('adm_rp_recordAnother')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    onGoToPaymentHistory();
                  }}
                  className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-6 py-2.5 rounded-full bg-[#5458A7] text-white font-bold text-xs hover:opacity-95 shadow-xs cursor-pointer"
                >
                  {t('adm_rp_viewHistory')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
