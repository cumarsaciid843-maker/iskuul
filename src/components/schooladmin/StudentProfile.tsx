import React, { useState, useEffect } from 'react';
import { Header } from '../common/Header';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Student, PaymentMethod, FeeBillingType, FeePayment } from '../../types';
import {
  Printer,
  Download,
  PlusCircle,
  Edit2,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  Lock,
} from 'lucide-react';
import { excelService } from '../../services/excelService';

interface StudentProfileProps {
  student: Student;
  onViewAttendanceHistory: (classId?: string) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  student: initialStudent,
  onViewAttendanceHistory,
  onBack,
  onShowToast,
}) => {
  const { school, selectedAcademicYear, activeAcademicYear, academicYears, isHistoricalReadOnly } = useAuth();
  const { t, tStatus, tMethod, tShift, tMonth, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';

  const [profileYearId, setProfileYearId] = useState<string>(
    selectedAcademicYear?.id || activeAcademicYear?.id || ''
  );

  useEffect(() => {
    if (selectedAcademicYear?.id) {
      setProfileYearId(selectedAcademicYear.id);
    }
  }, [selectedAcademicYear?.id]);

  const [studentState, setStudentState] = useState<Student>(initialStudent);
  const student = storage.getStudentById(initialStudent.id, profileYearId) || studentState;
  const [activeTab, setActiveTab] = useState<'overview' | 'fee_history'>('overview');

  const profileYearObj =
    academicYears.find((ay) => ay.id === profileYearId) || selectedAcademicYear || activeAcademicYear;
  const isProfileYearReadOnly = Boolean(profileYearObj && profileYearObj.status !== 'Active');

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showFeeSettingsModal, setShowFeeSettingsModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showPrintStatementModal, setShowPrintStatementModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);

  // Edit Profile Form
  const [editName, setEditName] = useState(student.name);
  const [editClassId, setEditClassId] = useState(student.classId);
  const [editGuardianName, setEditGuardianName] = useState(student.guardianName);
  const [editGuardianPhone, setEditGuardianPhone] = useState(student.guardianPhone);
  const [editGuardianAddress, setEditGuardianAddress] = useState(student.guardianAddress || '');
  const [editMonthlyFee, setEditMonthlyFee] = useState(student.monthlyFee);
  const [editFeeStartDate, setEditFeeStartDate] = useState(
    student.feeStartDate || student.registrationDate || '2026-01-01'
  );
  const [editFeeBillingType, setEditFeeBillingType] = useState<FeeBillingType>(
    student.feeBillingType || 'monthly_from_joining_month'
  );

  // Record Payment Modal State
  const todayStr = new Date().toISOString().split('T')[0];
  const [payAmount, setPayAmount] = useState<number>(student.monthlyFee);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payDate, setPayDate] = useState<string>(todayStr);
  const [payMonths, setPayMonths] = useState<string[]>(['Jan']);
  const [payNote, setPayNote] = useState<string>('');
  const [payError, setPayError] = useState<string>('');
  const [payTargetAyId, setPayTargetAyId] = useState<string>(profileYearId);

  // Edit Payment State
  const [editPayAmount, setEditPayAmount] = useState<number>(0);
  const [editPayMethod, setEditPayMethod] = useState<PaymentMethod>('Cash');
  const [editPayDate, setEditPayDate] = useState<string>('');
  const [editPayNote, setEditPayNote] = useState<string>('');

  const classes = storage.getClasses(schoolId, profileYearId);
  const currentClass = classes.find((c) => c.id === student.classId);
  const classTeacher = currentClass?.teacherId
    ? storage.getTeacherById(currentClass.teacherId, profileYearId)
    : undefined;
  const activeYear = profileYearObj?.name || '2025 - 2026';

  const attStats = storage.getStudentAttendanceStats(schoolId, student.id, profileYearId);
  const feeDetails = storage.getStudentFeeHistoryDetails(schoolId, student.id, profileYearId);
  const feeSummary = storage.getStudentFeeSummary(schoolId, student.id, profileYearId);

  const initials = student.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProfileYearReadOnly) {
      onShowToast(t('srv_historicalReadOnly'));
      return;
    }
    const updates = {
      name: editName.trim(),
      classId: editClassId,
      guardianName: editGuardianName.trim(),
      guardianPhone: editGuardianPhone.trim(),
      guardianAddress: editGuardianAddress.trim(),
      monthlyFee: Number(editMonthlyFee) || 0,
      feeStartDate: editFeeStartDate,
      feeBillingType: editFeeBillingType,
    };
    try {
      await storage.updateStudent(student.id, schoolId, updates, profileYearId);
      setStudentState({ ...student, ...updates });
      setShowEditProfileModal(false);
      onShowToast(t('adm_sp_profileUpdatedToast', { name: editName }));
    } catch (err: any) {
      onShowToast(tServiceMsg(err?.message) || t('srv_historicalReadOnly'));
    }
  };

  const handleSaveFeeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProfileYearReadOnly) {
      onShowToast(t('srv_historicalReadOnly'));
      return;
    }
    try {
      await storage.updateStudentFeeSettings(
        schoolId,
        student.id,
        editFeeStartDate,
        editFeeBillingType,
        Number(editMonthlyFee) || 0,
        profileYearId
      );
      setStudentState({
        ...student,
        feeStartDate: editFeeStartDate,
        feeBillingType: editFeeBillingType,
        monthlyFee: Number(editMonthlyFee) || 0,
      });
      setShowFeeSettingsModal(false);
      onShowToast(t('adm_sp_feeStartUpdatedToast'));
    } catch (err: any) {
      onShowToast(tServiceMsg(err?.message) || t('srv_historicalReadOnly'));
    }
  };

  const handleOpenRecordPayment = (presetMonth?: string, presetAmount?: number, overrideTargetAyId?: string) => {
    if (isHistoricalReadOnly && !overrideTargetAyId) {
      onShowToast(t('adm_rp_errHist'));
      return;
    }
    if (!overrideTargetAyId && isProfileYearReadOnly) {
      onShowToast(t('adm_rp_errHist'));
      return;
    }
    const targetAy = overrideTargetAyId || profileYearId;
    setPayTargetAyId(targetAy);
    setPayAmount(presetAmount !== undefined ? presetAmount : feeDetails?.remainingBalance || student.monthlyFee);
    setPayDate(todayStr);
    setPayMethod('Cash');
    setPayNote('');
    setPayError('');
    if (presetMonth) {
      const shortM = presetMonth.split(' ')[0].substring(0, 3);
      setPayMonths([shortM]);
    } else {
      setPayMonths(['Jan']);
    }
    setShowRecordPaymentModal(true);
  };

  const handleSaveRecordPayment = async () => {
    setPayError('');
    if (!payAmount || payAmount <= 0) {
      setPayError(t('adm_rp_errInvalidAmount'));
      return;
    }
    const targetAy = payTargetAyId || profileYearId;
    try {
      await storage.recordPayment(
        schoolId,
        student.id,
        Number(payAmount),
        payDate,
        payMethod,
        payMonths,
        payNote.trim(),
        targetAy
      );
      setShowRecordPaymentModal(false);
      const targetName = academicYears.find((y) => y.id === targetAy)?.name || activeYear;
      onShowToast(
        t('adm_rp_successToast', {
          amount: Number(payAmount).toFixed(2),
          name: student.name,
          year: targetName,
        })
      );
    } catch (err: any) {
      setPayError(tServiceMsg(err?.message) || t('adm_rp_errHist'));
    }
  };

  const handleOpenEditPayment = (p: FeePayment) => {
    setEditingPayment(p);
    setEditPayAmount(p.amount);
    setEditPayMethod(p.method);
    setEditPayDate(p.date);
    setEditPayNote(p.note || '');
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      await storage.updatePayment(editingPayment.id, schoolId, {
        amount: Number(editPayAmount),
        method: editPayMethod,
        date: editPayDate,
        note: editPayNote.trim(),
      });
      setEditingPayment(null);
      onShowToast(t('adm_sp_paymentUpdatedToast'));
    } catch (err: any) {
      onShowToast(tServiceMsg(err?.message) || t('srv_historicalPaymentErr'));
    }
  };

  const handleVoidPayment = async (payment: FeePayment) => {
    if (
      window.confirm(
        t('adm_sp_confirmVoidPay', { amount: payment.amount.toFixed(2) })
      )
    ) {
      try {
        await storage.voidPayment(payment.id, schoolId);
        onShowToast(t('adm_sp_paymentVoidedToast'));
      } catch (err: any) {
        onShowToast(tServiceMsg(err?.message) || t('srv_historicalPaymentErr'));
      }
    }
  };

  const handleDownloadCSV = () => {
    if (!feeDetails) return;
    const headers = [
      t('common_year'),
      t('common_month'),
      `${t('adm_rp_monthlyFee')} ($)`,
      `${t('adm_sp_col_paidAmount')} ($)`,
      `${t('adm_fee_col_balance')} ($)`,
      t('adm_sp_col_dueDate'),
      t('common_status'),
    ];
    const rows = feeDetails.monthsBreakdown.map((m) => [
      feeDetails.academicYearName,
      tMonth(m.monthName),
      m.expectedFee.toFixed(2),
      m.paidAmount.toFixed(2),
      m.balance.toFixed(2),
      m.dueDate,
      tStatus(m.status),
    ]);
    storage.generateCSV(
      `Fee_History_${student.studentIdNumber}_${feeDetails.academicYearName.replace(/\s+/g, '')}_${student.name.replace(/\s+/g, '_')}.csv`,
      headers,
      rows
    );
    onShowToast(t('adm_sp_csvDownloaded'));
  };

  const handleDownloadExcel = () => {
    const res = excelService.exportStudentFeeStatement(schoolId, student.id, profileYearId);
    if (res.success) {
      onShowToast(t('adm_sp_excelDownloaded'));
    } else {
      onShowToast(tServiceMsg(res.error) || t('adm_exportFail'));
    }
  };

  const toggleMonthSelection = (m: string) => {
    if (payMonths.includes(m)) {
      if (payMonths.length > 1) {
        setPayMonths(payMonths.filter((x) => x !== m));
      }
    } else {
      setPayMonths([...payMonths, m]);
    }
  };

  const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_sp_title')}
        searchPlaceholder={t('adm_reg_searchPh')}
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-full border border-[#D5D7EE] font-bold text-xs text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer text-center"
            >
              {t('adm_sp_backToList')}
            </button>
            <button
              onClick={() => {
                if (isProfileYearReadOnly) {
                  onShowToast(t('srv_historicalReadOnly'));
                  return;
                }
                setEditName(student.name);
                setEditClassId(student.classId);
                setEditGuardianName(student.guardianName);
                setEditGuardianPhone(student.guardianPhone);
                setEditGuardianAddress(student.guardianAddress || '');
                setEditMonthlyFee(student.monthlyFee);
                setEditFeeStartDate(student.feeStartDate || student.registrationDate || '2026-01-01');
                setEditFeeBillingType(student.feeBillingType || 'monthly_from_joining_month');
                setShowEditProfileModal(true);
              }}
              disabled={isProfileYearReadOnly}
              className="w-full sm:w-auto border border-[#5458A7] text-[#5458A7] px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
            >
              {isProfileYearReadOnly && <Lock size={13} />}
              <span>{t('adm_sp_editStudent')}</span>
            </button>
          </div>
        }
      />

      {/* Top Profile Card */}
      <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-8 lg:p-10 bg-white shadow-xs text-center relative overflow-hidden">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#5458A7] text-white flex items-center justify-center font-sora text-xl sm:text-2xl font-extrabold mx-auto mb-3 sm:mb-4 shadow-sm">
          {initials}
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold font-sora text-[#23265A] break-words">
          {student.name}
        </h2>
        <div className="text-xs sm:text-sm font-semibold text-[#555A8A] mt-1 break-words">
          {t('adm_sp_idClassShift', {
            id: student.studentIdNumber,
            cls: currentClass?.name || t('common_unassigned'),
            shift: tShift(student.shift),
          })}
        </div>

        {/* Academic Year Switcher Inside Student Profile */}
        {academicYears.length > 0 && (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 bg-[#F8F8FD] border border-[#E4E6F3] px-3 sm:px-4 py-2 rounded-2xl max-w-full">
            <Calendar size={14} className="text-[#5458A7] shrink-0" />
            <span className="text-xs font-bold text-[#4A5080]">{t('adm_sp_ayRecord')}</span>
            <select
              value={profileYearId}
              onChange={(e) => setProfileYearId(e.target.value)}
              className="bg-white border border-[#D5D7EE] rounded-lg px-2.5 py-1.5 min-h-[38px] text-xs font-bold text-[#23265A] focus:outline-none cursor-pointer max-w-full"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} ({ay.status === 'Active' ? t('common_active') : t('common_historical')})
                </option>
              ))}
            </select>
            {isProfileYearReadOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                <Lock size={10} />
                {t('common_readOnly')}
              </span>
            )}
          </div>
        )}

        {/* Tab Switcher: Overview vs Fee History */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-5 border-t border-[#F0F2FA]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 sm:px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#5458A7] text-white shadow-xs'
                : 'text-[#4A5080] hover:bg-[#EEEEF8]'
            }`}
          >
            {t('adm_sp_tabOverview')}
          </button>
          <button
            onClick={() => setActiveTab('fee_history')}
            className={`px-5 sm:px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'fee_history'
                ? 'bg-[#5458A7] text-white shadow-xs'
                : 'text-[#4A5080] hover:bg-[#EEEEF8]'
            }`}
          >
            <span>{t('adm_sp_tabFeeHistory')}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                (feeDetails?.combinedOutstandingBalance ?? 0) === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {(feeDetails?.combinedOutstandingBalance ?? 0) === 0
                ? tStatus('Paid')
                : t('adm_sp_totalDuePill', {
                    amount: feeDetails?.combinedOutstandingBalance.toFixed(2) || '0.00',
                  })}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Row of 3 Cards: Class, Attendance, Fees */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            {/* Class Card */}
            <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-6 bg-white shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <h3 className="text-lg font-extrabold font-sora text-[#23265A] mb-4">
                  {t('common_class')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('common_class')}</span>
                    <span className="font-bold text-[#23265A] text-end">
                      {currentClass?.name || t('common_unassigned')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('common_teacher')}</span>
                    <span className="font-bold text-[#23265A] text-end">
                      {classTeacher?.name || '--'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('common_year')}</span>
                    <span className="font-bold text-[#23265A] text-end">{activeYear}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Card */}
            <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-6 bg-white shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <h3 className="text-lg font-extrabold font-sora text-[#23265A] mb-4">
                  {t('nav_attendance')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('adm_att_present')}</span>
                    <span className="font-bold text-[#23265A] tabular-nums">
                      {attStats.present}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('adm_att_absent')}</span>
                    <span className="font-bold text-[#23265A] tabular-nums">
                      {attStats.absent}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('adm_att_late')}</span>
                    <span className="font-bold text-[#23265A] tabular-nums">{attStats.late}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onViewAttendanceHistory(student.classId)}
                  className="w-full border border-[#5458A7] text-[#5458A7] py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                >
                  {t('adm_sp_viewHistory')}
                </button>
              </div>
            </div>

            {/* Fees Card */}
            <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-6 bg-white shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-extrabold font-sora text-[#23265A]">
                    {t('nav_fees')}
                  </h3>
                  <StatusChip label={feeSummary.status} />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('common_total')}</span>
                    <span className="font-bold text-[#23265A] tabular-nums">
                      ${feeSummary.totalBilled.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('adm_fee_col_paid')}</span>
                    <span className="font-bold text-[#23265A] tabular-nums">
                      ${feeSummary.totalPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                    <span className="text-[#6B7280]">{t('adm_fee_col_balance')}</span>
                    <span className="font-bold text-[#23265A] tabular-nums">
                      ${feeSummary.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => setActiveTab('fee_history')}
                  className="w-full bg-[#5458A7] text-white py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:opacity-95 transition-all cursor-pointer shadow-xs"
                >
                  {t('adm_sp_viewFeeHistory')}
                </button>
              </div>
            </div>
          </div>

          {/* Personal Details Card */}
          <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-8 bg-white shadow-xs">
            <h3 className="text-lg font-extrabold font-sora text-[#23265A] mb-4">
              {t('adm_sp_personalDetails')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_sp_guardian')}</span>
                <span className="font-bold text-[#23265A] break-words">
                  {student.guardianName || '--'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('common_phone')}</span>
                <span className="font-bold text-[#23265A]">
                  {student.guardianPhone || '--'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('common_address')}</span>
                <span className="font-bold text-[#23265A] break-words">
                  {student.guardianAddress || '--'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_sp_regDate')}</span>
                <span className="font-bold text-[#23265A]">
                  {student.registrationDate || '--'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('adm_sp_feeStartDate')}</span>
                <span className="font-bold text-[#5458A7]">
                  {student.feeStartDate || student.registrationDate || '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEE HISTORY (MULTI-YEAR CARRY-FORWARD AWARE) */}
      {activeTab === 'fee_history' && feeDetails && (
        <div className="space-y-6">
          {/* Action buttons & Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-[#E4E6F3] rounded-[24px] p-5 sm:p-6 shadow-xs">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                {t('adm_sp_trackingTitle', { year: feeDetails.academicYearName })}
              </h3>
              <p className="text-xs text-[#6B7280] font-manrope mt-1">
                {t('adm_sp_trackingSub')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => handleOpenRecordPayment()}
                disabled={isProfileYearReadOnly}
                className="w-full sm:w-auto justify-center bg-[#5458A7] text-white px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isProfileYearReadOnly ? <Lock size={13} /> : <PlusCircle size={15} />}
                <span>{t('adm_fee_recordPaymentBtn')}</span>
              </button>
              <button
                onClick={() => {
                  if (isProfileYearReadOnly) {
                    onShowToast(t('srv_historicalReadOnly'));
                    return;
                  }
                  setEditFeeStartDate(feeDetails.feeStartDate);
                  setEditFeeBillingType(feeDetails.feeBillingType);
                  setEditMonthlyFee(feeDetails.monthlyFee);
                  setShowFeeSettingsModal(true);
                }}
                disabled={isProfileYearReadOnly}
                className="flex-1 sm:flex-none justify-center border border-[#5458A7] text-[#5458A7] px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Edit2 size={14} />
                <span>{t('adm_sp_feeSettingsBtn')}</span>
              </button>
              <button
                onClick={() => setShowPrintStatementModal(true)}
                className="flex-1 sm:flex-none justify-center border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>{t('adm_sp_printStatement')}</span>
              </button>
              <button
                onClick={handleDownloadExcel}
                className="flex-1 sm:flex-none justify-center border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-white"
                title={t('common_exportExcel')}
              >
                <FileSpreadsheet size={14} className="text-[#5458A7]" />
                <span>{t('common_exportExcel')}</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex-1 sm:flex-none justify-center border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>{t('adm_sp_downloadCsvBtn')}</span>
              </button>
            </div>
          </div>

          {/* Carry-Forward Previous Year Debts Alert & Quick Settlement */}
          {feeDetails.previousYearDebts.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-[24px] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-extrabold font-sora text-rose-900">
                    {t('adm_sp_priorDebtTitle', {
                      amount: feeDetails.previousYearsOutstanding.toFixed(2),
                    })}
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    {t('adm_sp_priorDebtSub', { year: feeDetails.academicYearName })}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white border border-rose-200 text-xs font-extrabold text-rose-700">
                  {t('adm_sp_combinedAllBal', {
                    amount: feeDetails.combinedOutstandingBalance.toFixed(2),
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {feeDetails.previousYearDebts.map((debt) => (
                  <div
                    key={debt.academicYearId}
                    className="bg-white border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-[#23265A]">
                        {debt.academicYearName}
                      </div>
                      <div className="text-xs text-[#6B7280] mt-0.5">
                        {t('adm_sp_expectedPaidLine', {
                          expected: debt.totalFeesExpected.toFixed(2),
                          paid: debt.totalAmountPaid.toFixed(2),
                        })}
                      </div>
                      {debt.unpaidMonths.length > 0 && (
                        <div className="text-[11px] text-rose-600 font-semibold mt-1 break-words">
                          {t('adm_sp_unpaidPrefix', {
                            months: debt.unpaidMonths.map((m) => tMonth(m)).join(', '),
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="text-base font-extrabold text-rose-700 tabular-nums">
                        ${debt.outstandingBalance.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setProfileYearId(debt.academicYearId)}
                          className="px-3 py-1.5 min-h-[38px] sm:min-h-0 rounded-full border border-[#D5D7EE] text-[11px] font-bold text-[#4A5080] hover:bg-[#F3F4FB] cursor-pointer"
                        >
                          {t('adm_sp_viewYearBtn')}
                        </button>
                        {!isProfileYearReadOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenRecordPayment(
                                debt.unpaidMonths[0],
                                debt.outstandingBalance,
                                debt.academicYearId
                              )
                            }
                            className="px-3 py-1.5 min-h-[38px] sm:min-h-0 rounded-full bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 cursor-pointer"
                          >
                            {t('adm_sp_payPriorDebtBtn')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Student Fee Summary Badges Grid */}
          <div className="grid grid-cols-1 min-[370px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-4 shadow-xs min-w-0">
              <div className="text-[11px] font-semibold text-[#6B7280] mb-1">
                {t('adm_rp_monthlyFee')}
              </div>
              <div className="text-xl font-extrabold font-sora text-[#23265A] tabular-nums">
                ${feeDetails.monthlyFee.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#5458A7] mt-1 font-semibold truncate">
                {feeDetails.feeBillingType === 'exact_date'
                  ? t('adm_sp_exactDateBilling')
                  : t('adm_sp_fullMonthBilling')}
              </div>
            </div>

            <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-4 shadow-xs min-w-0">
              <div className="text-[11px] font-semibold text-[#6B7280] mb-1">
                {t('adm_sp_feeStartDate')}
              </div>
              <div className="text-base font-extrabold font-sora text-[#23265A] truncate">
                {feeDetails.feeStartDate}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 truncate">
                {t('adm_sp_joinedPrefix', { date: feeDetails.registrationDate })}
              </div>
            </div>

            <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-4 shadow-xs min-w-0">
              <div className="text-[11px] font-semibold text-[#6B7280] mb-1">
                {t('adm_sp_monthsPaidYear', { year: feeDetails.academicYearName })}
              </div>
              <div className="text-xl font-extrabold font-sora text-emerald-600 tabular-nums">
                {feeDetails.totalMonthsPaid}{' '}
                <span className="text-xs text-[#6B7280] font-normal">
                  / {feeDetails.totalMonthsExpected}
                </span>
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 truncate">
                {t('adm_sp_lastPrefix', { month: tMonth(feeDetails.lastMonthPaid) })}
              </div>
            </div>

            <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-4 shadow-xs min-w-0">
              <div className="text-[11px] font-semibold text-[#6B7280] mb-1">
                {t('adm_sp_yearPaid')}
              </div>
              <div className="text-xl font-extrabold font-sora text-emerald-700 tabular-nums">
                ${feeDetails.totalAmountPaid.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 truncate">
                {t('adm_sp_expectedPrefix', { amount: feeDetails.totalFeesExpected.toFixed(2) })}
              </div>
            </div>

            <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-4 shadow-xs min-w-0">
              <div className="text-[11px] font-semibold text-[#6B7280] mb-1">
                {t('adm_sp_yearRemaining')}
              </div>
              <div className="text-xl font-extrabold font-sora text-amber-600 tabular-nums">
                ${feeDetails.remainingBalance.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1 font-semibold truncate">
                {t('adm_sp_unpaidMonthsCount', { count: feeDetails.totalMonthsUnpaid })}
              </div>
            </div>

            <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-4 shadow-xs flex flex-col justify-between min-w-0">
              <div className="text-[11px] font-semibold text-[#6B7280] mb-1">
                {t('adm_sp_combinedBalance')}
              </div>
              <div className="text-xl font-extrabold font-sora text-[#23265A] tabular-nums">
                ${feeDetails.combinedOutstandingBalance.toFixed(2)}
              </div>
              <div className="mt-1">
                <StatusChip label={feeDetails.overallStatus} />
              </div>
            </div>
          </div>

          {/* Section 1: Monthly Payment Tracking Table */}
          <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
            <div className="p-5 sm:p-6 border-b border-[#E4E6F3] flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold font-sora text-[#23265A]">
                  {t('adm_sp_monthlyBreakdown')}
                </h3>
                <p className="text-xs text-[#6B7280] font-manrope mt-0.5">
                  {t('adm_sp_monthlyBreakdownSub', { date: feeDetails.feeStartDate })}
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-[#F2F3FA] text-[#5458A7] rounded-full shrink-0">
                {t('adm_sp_billingCyclesCount', { count: feeDetails.monthsBreakdown.length })}
              </span>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="sm:hidden divide-y divide-[#F0F2FA]">
              {feeDetails.monthsBreakdown.map((row) => (
                <div key={row.monthKey} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-[#23265A]">{tMonth(row.monthName)}</div>
                      <div className="text-[11px] text-[#6B7280]">{row.dueDate}</div>
                    </div>
                    <StatusChip label={row.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#F9FAFD] rounded-xl p-2.5 border border-[#F0F2FA]">
                    <div>
                      <div className="text-[10px] text-[#6B7280]">{t('adm_rp_monthlyFee')}</div>
                      <div className="font-bold text-[#23265A] tabular-nums">${row.expectedFee.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6B7280]">{t('adm_sp_col_paidAmount')}</div>
                      <div className="font-bold text-emerald-700 tabular-nums">${row.paidAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6B7280]">{t('adm_sp_col_remBalance')}</div>
                      <div className="font-bold text-amber-700 tabular-nums">${row.balance.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {row.balance > 0 ? (
                      isProfileYearReadOnly ? (
                        <span className="text-xs text-[#6B7280] font-semibold">
                          {t('adm_rp_amountDuePill', { amount: row.balance.toFixed(2) })}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenRecordPayment(row.monthName, row.balance)}
                          className="w-full py-2 min-h-[40px] rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 cursor-pointer"
                        >
                          {t('adm_sp_payNowAmount', { amount: row.balance.toFixed(2) })}
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        {t('adm_rp_cleared')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-start text-sm text-[#23265A]">
                <thead className="border-b border-[#E4E6F3] bg-[#FAFAFE] text-[#5458A7] font-semibold text-xs font-manrope">
                  <tr>
                    <th className="py-3.5 px-4 lg:px-6 sticky start-0 bg-[#FAFAFE] z-10 whitespace-nowrap">{t('common_month')}</th>
                    <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_rp_monthlyFee')}</th>
                    <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_paidAmount')}</th>
                    <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_remBalance')}</th>
                    <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_dueDate')}</th>
                    <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('common_status')}</th>
                    <th className="py-3.5 px-4 lg:px-6 text-end whitespace-nowrap">{t('adm_unp_col_action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2FA] text-sm">
                  {feeDetails.monthsBreakdown.map((row) => (
                    <tr key={row.monthKey} className="group hover:bg-[#F9FAFD] transition-colors">
                      <td className="py-4 px-4 lg:px-6 font-bold text-[#23265A] sticky start-0 bg-white group-hover:bg-[#F9FAFD] z-10 whitespace-nowrap">
                        {tMonth(row.monthName)}
                      </td>
                      <td className="py-4 px-4 lg:px-6 font-semibold tabular-nums whitespace-nowrap">
                        ${row.expectedFee.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 lg:px-6 font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                        ${row.paidAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 lg:px-6 font-bold text-amber-700 tabular-nums whitespace-nowrap">
                        ${row.balance.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-xs text-[#6B7280] whitespace-nowrap">
                        {row.dueDate}
                      </td>
                      <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                        <StatusChip label={row.status} />
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-end whitespace-nowrap">
                        {row.balance > 0 ? (
                          isProfileYearReadOnly ? (
                            <span className="text-xs text-[#6B7280] font-semibold">
                              {t('adm_rp_amountDuePill', { amount: row.balance.toFixed(2) })}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenRecordPayment(row.monthName, row.balance)}
                              className="text-xs font-bold text-[#5458A7] hover:underline cursor-pointer"
                            >
                              {t('adm_sp_payNowAmount', { amount: row.balance.toFixed(2) })}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 size={13} />
                            {t('adm_rp_cleared')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Payment Transaction History Table */}
          <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
            <div className="p-5 sm:p-6 border-b border-[#E4E6F3] flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold font-sora text-[#23265A]">
                  {t('adm_sp_transactionsTitle', { year: feeDetails.academicYearName })}
                </h3>
                <p className="text-xs text-[#6B7280] font-manrope mt-0.5">
                  {t('adm_sp_transactionsSub')}
                </p>
              </div>
              {!isProfileYearReadOnly && (
                <button
                  onClick={() => handleOpenRecordPayment()}
                  className="text-xs font-bold text-[#5458A7] hover:underline cursor-pointer py-1"
                >
                  {t('adm_sp_addNewPaymentLink')}
                </button>
              )}
            </div>

            {feeDetails.payments.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#6B7280]">
                {t('adm_sp_noPaymentsYear', { year: feeDetails.academicYearName })}
              </div>
            ) : (
              <>
                {/* Mobile Stacked Cards */}
                <div className="sm:hidden divide-y divide-[#F0F2FA]">
                  {feeDetails.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-4 space-y-2.5 ${payment.isVoided ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`font-extrabold text-base text-emerald-700 tabular-nums ${payment.isVoided ? 'line-through' : ''}`}>
                            ${payment.amount.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-[#6B7280]">
                            {payment.date} · {tMethod(payment.method)}
                          </div>
                        </div>
                        {payment.isVoided ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {t('adm_sp_voidedBadge')}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {t('adm_sp_validBadge')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {payment.monthsCovered.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7] font-bold text-[11px]"
                          >
                            {tMonth(m)}
                          </span>
                        ))}
                      </div>
                      {payment.note && (
                        <div className="text-xs text-[#6B7280] break-words">{payment.note}</div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-[#F0F2FA]">
                        <span className="text-[10px] font-mono text-[#6B7280]">{payment.id}</span>
                        {isProfileYearReadOnly ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                            <Lock size={11} />
                            {t('common_historical')}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {!payment.isVoided && (
                              <>
                                <button
                                  onClick={() => handleOpenEditPayment(payment)}
                                  className="text-[#5458A7] hover:bg-[#F3F4FB] p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full cursor-pointer"
                                  title={t('adm_sp_editPayTitle')}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleVoidPayment(payment)}
                                  className="text-amber-600 hover:bg-amber-50 p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full cursor-pointer"
                                  title={t('adm_sp_voidPayTitle')}
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-start text-sm text-[#23265A]">
                    <thead className="border-b border-[#E4E6F3] bg-[#FAFAFE] text-[#5458A7] font-semibold text-xs font-manrope">
                      <tr>
                        <th className="py-3.5 px-4 lg:px-6 sticky start-0 bg-[#FAFAFE] z-10 whitespace-nowrap">{t('common_date')}</th>
                        <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_receiptId')}</th>
                        <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_paidAmount')}</th>
                        <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_ph_col_method')}</th>
                        <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_monthsCovered')}</th>
                        <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('adm_sp_col_notes')}</th>
                        <th className="py-3.5 px-4 lg:px-6 whitespace-nowrap">{t('common_status')}</th>
                        <th className="py-3.5 px-4 lg:px-6 text-end whitespace-nowrap">{t('common_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F2FA] text-sm">
                      {feeDetails.payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className={`group hover:bg-[#F9FAFD] transition-colors ${
                            payment.isVoided ? 'opacity-50 line-through bg-gray-50' : ''
                          }`}
                        >
                          <td className="py-4 px-4 lg:px-6 font-semibold sticky start-0 bg-white group-hover:bg-[#F9FAFD] z-10 whitespace-nowrap">{payment.date}</td>
                          <td className="py-4 px-4 lg:px-6 text-xs font-mono text-[#6B7280] whitespace-nowrap">
                            {payment.id}
                          </td>
                          <td className="py-4 px-4 lg:px-6 font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                            ${payment.amount.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 lg:px-6 text-xs whitespace-nowrap">{tMethod(payment.method)}</td>
                          <td className="py-4 px-4 lg:px-6">
                            <div className="flex flex-wrap gap-1">
                              {payment.monthsCovered.map((m) => (
                                <span
                                  key={m}
                                  className="px-2 py-0.5 rounded-full bg-[#EEEEF8] text-[#5458A7] font-bold text-[11px]"
                                >
                                  {tMonth(m)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4 lg:px-6 text-xs text-[#6B7280]">
                            {payment.note || '--'}
                          </td>
                          <td className="py-4 px-4 lg:px-6 whitespace-nowrap">
                            {payment.isVoided ? (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                {t('adm_sp_voidedBadge')}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {t('adm_sp_validBadge')}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 lg:px-6 text-end whitespace-nowrap">
                            {isProfileYearReadOnly ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280]">
                                <Lock size={11} />
                                {t('common_historical')}
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {!payment.isVoided && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditPayment(payment)}
                                      className="text-[#5458A7] hover:bg-[#F3F4FB] p-1.5 rounded-full transition-all cursor-pointer"
                                      title={t('adm_sp_editPayTitle')}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleVoidPayment(payment)}
                                      className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-full transition-all cursor-pointer"
                                      title={t('adm_sp_voidPayTitle')}
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD PAYMENT */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-lg w-full p-5 sm:p-8 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                  {t('adm_fee_recordPaymentBtn')}
                </h3>
                <p className="text-xs text-[#6B7280] font-manrope mt-0.5 break-words">
                  {t('adm_unp_modalStudentLine', {
                    name: student.name,
                    id: student.studentIdNumber,
                  })}{' '}
                  ·{' '}
                  <span className="font-bold text-[#5458A7]">
                    {academicYears.find((y) => y.id === payTargetAyId)?.name || activeYear}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-[#6B7280] hover:text-[#23265A] text-lg font-bold p-2 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer shrink-0"
                aria-label={t('common_close')}
              >
                ✕
              </button>
            </div>

            {payError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                {payError}
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_rp_amountLabel')}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-base font-bold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                    {t('adm_rp_dateLabel')}
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm sm:text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                    {t('adm_rp_methodLabel')}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm sm:text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                  >
                    <option value="Cash">{tMethod('Cash')}</option>
                    <option value="Mobile money">{tMethod('Mobile money')}</option>
                    <option value="Bank transfer">{tMethod('Bank transfer')}</option>
                    <option value="Cheque">{tMethod('Cheque')}</option>
                  </select>
                </div>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_sp_monthsCoveredByPay')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {monthOptions.map((m) => {
                    const isSelected = payMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonthSelection(m)}
                        className={`py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5458A7] text-white shadow-xs'
                            : 'bg-[#F2F3FA] text-[#4A5080] hover:bg-[#E5E7F3]'
                        }`}
                      >
                        {tMonth(m)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_rp_noteLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('adm_unp_notePh')}
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm sm:text-xs text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[#F0F2FA]">
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('common_cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveRecordPayment}
                className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 shadow-xs cursor-pointer"
              >
                {t('adm_sp_savePaymentBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FEE SETTINGS & STARTING DATE */}
      {showFeeSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                  {t('adm_sp_feeSettingsTitle')}
                </h3>
                <p className="text-xs text-[#6B7280] font-manrope mt-0.5">
                  {t('adm_sp_feeSettingsSub')}
                </p>
              </div>
              <button
                onClick={() => setShowFeeSettingsModal(false)}
                className="text-[#6B7280] hover:text-[#23265A] text-lg font-bold p-2 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer shrink-0"
                aria-label={t('common_close')}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFeeSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_sp_feeStartDate')}
                </label>
                <input
                  type="date"
                  required
                  value={editFeeStartDate}
                  onChange={(e) => setEditFeeStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
                <p className="text-[11px] text-[#6B7280] mt-1 font-manrope">
                  {t('adm_reg_feeStartHelp')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_reg_billingOption')}
                </label>
                <select
                  value={editFeeBillingType}
                  onChange={(e) => setEditFeeBillingType(e.target.value as FeeBillingType)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                >
                  <option value="monthly_from_joining_month">
                    {t('adm_reg_billingMonth')}
                  </option>
                  <option value="exact_date">
                    {t('adm_reg_billingExact')}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_reg_monthlyFee')}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  value={editMonthlyFee}
                  onChange={(e) => setEditMonthlyFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm font-bold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-[#F0F2FA]">
                <button
                  type="button"
                  onClick={() => setShowFeeSettingsModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 shadow-xs cursor-pointer"
                >
                  {t('adm_sp_applyRecalcBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PAYMENT */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                {t('adm_ph_modalEditTitle')}
              </h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-[#6B7280] hover:text-[#23265A] text-lg font-bold p-2 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                aria-label={t('common_close')}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_ph_amountLabel')}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  value={editPayAmount}
                  onChange={(e) => setEditPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm font-bold text-[#23265A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_rp_dateLabel')}
                </label>
                <input
                  type="date"
                  required
                  value={editPayDate}
                  onChange={(e) => setEditPayDate(e.target.value)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_ph_col_method')}
                </label>
                <select
                  value={editPayMethod}
                  onChange={(e) => setEditPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A]"
                >
                  <option value="Cash">{tMethod('Cash')}</option>
                  <option value="Mobile money">{tMethod('Mobile money')}</option>
                  <option value="Bank transfer">{tMethod('Bank transfer')}</option>
                  <option value="Cheque">{tMethod('Cheque')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('common_note')}
                </label>
                <input
                  type="text"
                  value={editPayNote}
                  onChange={(e) => setEditPayNote(e.target.value)}
                  className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[#F0F2FA]">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 shadow-xs cursor-pointer"
                >
                  {t('common_saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINT STATEMENT / RECEIPT */}
      {showPrintStatementModal && feeDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E6F3] pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold font-sora text-[#5458A7]">
                  {t('adm_sp_statementTitle')}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {t('adm_sp_statementSchoolYear', {
                    school: school?.name || t('common_school'),
                    year: activeYear,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none justify-center bg-[#5458A7] text-white px-4 py-2 min-h-[40px] sm:min-h-0 rounded-full font-bold text-xs hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  {t('common_print')}
                </button>
                <button
                  onClick={() => setShowPrintStatementModal(false)}
                  className="flex-1 sm:flex-none justify-center border border-[#D5D7EE] text-[#4A5080] px-4 py-2 min-h-[40px] sm:min-h-0 rounded-full font-bold text-xs hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_close')}
                </button>
              </div>
            </div>

            {/* Student metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs bg-[#F9FAFE] p-4 rounded-xl border border-[#E4E6F3]">
              <div>
                <div>
                  <span className="text-[#6B7280]">{t('adm_rp_col_studentName')}</span>{' '}
                  <span className="font-bold text-[#23265A]">{student.name}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[#6B7280]">{t('adm_rp_col_studentId')}</span>{' '}
                  <span className="font-bold text-[#23265A]">{student.studentIdNumber}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[#6B7280]">{t('adm_rp_col_class')}</span>{' '}
                  <span className="font-bold text-[#23265A]">{currentClass?.name || t('common_unassigned')}</span>
                </div>
              </div>
              <div>
                <div>
                  <span className="text-[#6B7280]">{t('adm_sp_guardian')}:</span>{' '}
                  <span className="font-bold text-[#23265A]">{student.guardianName}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[#6B7280]">{t('adm_unp_col_phone')}:</span>{' '}
                  <span className="font-bold text-[#23265A]">{student.guardianPhone}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[#6B7280]">{t('adm_sp_feeStartDate')}:</span>{' '}
                  <span className="font-bold text-[#23265A]">{feeDetails.feeStartDate}</span>
                </div>
              </div>
            </div>

            {/* Statement Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white rounded-xl border border-[#E4E6F3]">
                <div className="text-[11px] text-[#6B7280]">{t('adm_rp_currYearFees')}</div>
                <div className="text-lg font-extrabold text-[#23265A] tabular-nums">
                  ${feeDetails.totalFeesExpected.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[11px] text-emerald-800">{t('adm_sp_yearPaid')}</div>
                <div className="text-lg font-extrabold text-emerald-800 tabular-nums">
                  ${feeDetails.totalAmountPaid.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-[11px] text-amber-800">{t('adm_sp_yearRemaining')}</div>
                <div className="text-lg font-extrabold text-amber-800 tabular-nums">
                  ${feeDetails.remainingBalance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold text-[#23265A] uppercase tracking-wider mb-2 font-manrope">
                {t('adm_sp_statementTableTitle')}
              </h4>
              <div className="overflow-x-auto border border-[#E4E6F3] rounded-xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-[#F0F2FA] text-[#5458A7] font-bold">
                    <tr>
                      <th className="p-2.5 sticky start-0 bg-[#F0F2FA] z-10 whitespace-nowrap">{t('common_month')}</th>
                      <th className="p-2.5 whitespace-nowrap">{t('adm_rp_monthlyFee')}</th>
                      <th className="p-2.5 whitespace-nowrap">{t('adm_sp_col_paidAmount')}</th>
                      <th className="p-2.5 whitespace-nowrap">{t('adm_fee_col_balance')}</th>
                      <th className="p-2.5 whitespace-nowrap">{t('common_status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E6F3]">
                    {feeDetails.monthsBreakdown.map((m) => (
                      <tr key={m.monthKey}>
                        <td className="p-2.5 font-bold sticky start-0 bg-white z-10 whitespace-nowrap">{tMonth(m.monthName)}</td>
                        <td className="p-2.5 tabular-nums whitespace-nowrap">${m.expectedFee.toFixed(2)}</td>
                        <td className="p-2.5 text-emerald-700 font-semibold tabular-nums whitespace-nowrap">${m.paidAmount.toFixed(2)}</td>
                        <td className="p-2.5 text-amber-700 font-semibold tabular-nums whitespace-nowrap">${m.balance.toFixed(2)}</td>
                        <td className="p-2.5 font-bold whitespace-nowrap">{tStatus(m.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 text-center text-[11px] text-[#6B7280] border-t border-[#E4E6F3]">
              {t('adm_sp_statementFooter', { date: todayStr })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT FULL PROFILE */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-lg w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                {t('adm_sp_editDetailsTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="text-[#6B7280] hover:text-[#23265A] text-lg font-bold p-2 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                aria-label={t('common_close')}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_reg_fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_sp_assignedClassLabel')}
                </label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                >
                  <option value="">{t('common_unassigned')}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_reg_guardianName')}
                  </label>
                  <input
                    type="text"
                    value={editGuardianName}
                    onChange={(e) => setEditGuardianName(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_reg_guardianPhone')}
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={editGuardianPhone}
                    onChange={(e) => setEditGuardianPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('common_address')}
                </label>
                <input
                  type="text"
                  value={editGuardianAddress}
                  onChange={(e) => setEditGuardianAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_reg_monthlyFee')}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_sp_feeStartDate')}
                  </label>
                  <input
                    type="date"
                    value={editFeeStartDate}
                    onChange={(e) => setEditFeeStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_reg_billingOption')}
                </label>
                <select
                  value={editFeeBillingType}
                  onChange={(e) => setEditFeeBillingType(e.target.value as FeeBillingType)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5D7EE] text-sm"
                >
                  <option value="monthly_from_joining_month">
                    {t('adm_reg_billingMonth')}
                  </option>
                  <option value="exact_date">
                    {t('adm_reg_billingExact')}
                  </option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] sm:min-h-0 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-xs"
                >
                  {t('common_saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
