import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatCard } from '../common/StatCard';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  CircleDollarSign,
  FileSpreadsheet,
  Lock,
  History,
} from 'lucide-react';
import { excelService } from '../../services/excelService';

interface SchoolAdminDashboardProps {
  onNavigateTab: (tab: any, params?: any) => void;
  onOpenRegisterStudent: () => void;
  onOpenAddTeacher: () => void;
  onShowToast?: (msg: string) => void;
}

export const SchoolAdminDashboard: React.FC<SchoolAdminDashboardProps> = ({
  onNavigateTab,
  onOpenRegisterStudent,
  onOpenAddTeacher,
  onShowToast,
}) => {
  const {
    school,
    selectedAcademicYear,
    activeAcademicYear,
    isHistoricalReadOnly,
    setSelectedAcademicYearId,
  } = useAuth();
  const { t, tStatus, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const [searchTerm, setSearchTerm] = useState('');

  const comprehensiveStats = storage.getComprehensiveFeeStats(schoolId, ayId);

  // Attendance stats strictly scoped to selected academic year
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceSummary = storage.getSchoolAttendanceSummary(schoolId, ayId, todayStr);

  return (
    <div className="space-y-8">
      {/* Header */}
      <Header
        title={t('adm_dash_title')}
        subtitle={
          selectedAcademicYear
            ? `${t('adm_aySubtitle', { name: selectedAcademicYear.name })} (${tStatus(selectedAcademicYear.status)})`
            : undefined
        }
        searchPlaceholder={t('adm_dash_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const res = excelService.exportAllSystemData(schoolId, school?.name, ayId);
                onShowToast?.(
                  res.success
                    ? t('adm_dash_exportAllSuccess', { filename: res.filename || '' })
                    : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7] text-[#5458A7] bg-white hover:bg-[#F3F4FB] px-5 py-2.5 rounded-full font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              title={t('adm_dash_exportAllTooltip')}
            >
              <FileSpreadsheet size={15} />
              <span>{t('adm_dash_exportAllBtn')}</span>
            </button>
            {!isHistoricalReadOnly && (
              <button
                onClick={onOpenRegisterStudent}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer inline-flex items-center"
              >
                {t('adm_dash_addStudent')}
              </button>
            )}
          </div>
        }
      />

      {/* Historical Read-Only Archive Banner */}
      {isHistoricalReadOnly && selectedAcademicYear && (
        <div className="bg-amber-50 border border-amber-200 rounded-[20px] px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Lock size={16} />
            </div>
            <div>
              <div className="text-sm font-extrabold font-sora text-amber-900">
                {t('adm_dash_histTitle', { name: selectedAcademicYear.name })}
              </div>
              <div className="text-xs text-amber-800">
                {t('adm_dash_histDesc', { name: selectedAcademicYear.name })}
              </div>
            </div>
          </div>
          {activeAcademicYear && (
            <button
              onClick={() => setSelectedAcademicYearId(activeAcademicYear.id)}
              className="bg-amber-700 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-amber-800 transition-colors cursor-pointer"
            >
              {t('adm_dash_returnActive', { name: activeAcademicYear.name })}
            </button>
          )}
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 min-[370px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
        <StatCard label={t('adm_dash_totalStudents')} value={comprehensiveStats.totalStudents} />
        <StatCard
          label={t('adm_dash_paidStudents')}
          value={comprehensiveStats.fullyPaidStudents}
        />
        <StatCard
          label={t('adm_dash_collectedYear')}
          value={`$${comprehensiveStats.totalFeesCollected.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_dash_currentYearBal')}
          value={`$${comprehensiveStats.totalOutstandingFees.toFixed(2)}`}
        />
        <StatCard
          label={t('adm_dash_prevYearDebt')}
          value={`$${comprehensiveStats.previousYearsOutstanding.toFixed(2)}`}
        />
      </div>

      {/* Carry-Forward & Combined Balance Highlight Strip */}
      {(comprehensiveStats.previousYearsOutstanding > 0 || comprehensiveStats.combinedOutstanding > 0) && (
        <div className="bg-[#F8F8FD] border border-[#E4E6F3] rounded-[20px] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EEEEF8] text-[#5458A7] flex items-center justify-center shrink-0">
              <History size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#6B7280]">
                {t('adm_dash_combinedTitle', {
                  year: selectedAcademicYear?.name || t('adm_activeYearFallback'),
                })}
              </div>
              <div className="text-sm font-extrabold font-sora text-[#23265A]">
                {t('adm_dash_combinedFormula', {
                  prev: comprehensiveStats.previousYearsOutstanding.toFixed(2),
                  curr: comprehensiveStats.totalOutstandingFees.toFixed(2),
                })}{' '}
                <span className="text-[#5458A7]">${comprehensiveStats.combinedOutstanding.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('admin_unpaid_students')}
            className="text-xs font-bold text-[#5458A7] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t('adm_dash_inspectCarry')}</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
      )}

      {/* Dashboard Notifications: Monthly Fee Monitoring Alert Cards */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold font-sora text-[#23265A]">
            {t('adm_dash_alertsTitle')}
          </h3>
          <button
            onClick={() => onNavigateTab('admin_unpaid_students')}
            className="text-xs font-bold text-[#5458A7] hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
          >
            <span>{t('adm_dash_viewAllUnpaid')}</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Unpaid this month */}
          <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B7280]">
                  {t('adm_dash_unpaidYear')}
                </span>
                <div className="text-2xl font-extrabold font-sora text-[#23265A] mt-1">
                  {comprehensiveStats.unpaidThisMonthCount}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#5458A7] flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('admin_unpaid_students', { status: 'Unpaid' })}
              className="mt-4 text-xs font-bold text-[#5458A7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t('adm_dash_viewUnpaidList')}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          </div>

          {/* Card 2: Partial payments */}
          <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B7280]">
                  {t('adm_dash_partialPayments')}
                </span>
                <div className="text-2xl font-extrabold font-sora text-amber-600 mt-1">
                  {comprehensiveStats.partialCount}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('admin_unpaid_students', { status: 'Partial' })}
              className="mt-4 text-xs font-bold text-[#5458A7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t('adm_dash_viewPartialList')}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          </div>

          {/* Card 3: Overdue payments */}
          <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B7280]">
                  {t('adm_dash_overduePayments')}
                </span>
                <div className="text-2xl font-extrabold font-sora text-rose-600 mt-1">
                  {comprehensiveStats.overdueCount}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('admin_unpaid_students', { status: 'Overdue' })}
              className="mt-4 text-xs font-bold text-[#5458A7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t('adm_dash_viewOverdueList')}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          </div>

          {/* Card 4: Combined Outstanding */}
          <div className="bg-white border border-[#E4E6F3] rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B7280]">
                  {t('adm_dash_combinedOutstanding')}
                </span>
                <div className="text-2xl font-extrabold font-sora text-amber-700 mt-1">
                  ${comprehensiveStats.combinedOutstanding.toFixed(2)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#EEEEF8] text-[#5458A7] flex items-center justify-center">
                <CircleDollarSign size={18} />
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('admin_unpaid_students')}
              className="mt-4 text-xs font-bold text-[#5458A7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t('adm_dash_manageCollections')}</span>
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Summary & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Attendance Card */}
        <div className="lg:col-span-8 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
              {t('adm_dash_attendanceToday')}
            </h2>
            <span className="text-xs font-bold text-[#5458A7] bg-[#EEEEF8] px-3 py-1 rounded-full">
              {t('adm_dash_attBadge', {
                year: selectedAcademicYear?.name || t('adm_currentYearFallback'),
                total: attendanceSummary.total,
                pct: attendanceSummary.percentage,
              })}
            </span>
          </div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[#F2F3FA] rounded-2xl p-4 sm:p-5 border border-[#E5E7F3]">
              <div className="text-xs sm:text-sm font-semibold text-[#4A5080] mb-2">
                {t('status_present')}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-sora text-[#23265A]">
                {attendanceSummary.todayPresent}
              </div>
              <div className="text-[11px] font-semibold text-[#6B7280] mt-1">
                {t('adm_dash_yearTotal', { count: attendanceSummary.present })}
              </div>
            </div>

            <div className="bg-[#F2F3FA] rounded-2xl p-5 border border-[#E5E7F3]">
              <div className="text-xs sm:text-sm font-semibold text-[#4A5080] mb-2">
                {t('status_absent')}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-sora text-[#23265A]">
                {attendanceSummary.todayAbsent}
              </div>
              <div className="text-[11px] font-semibold text-[#6B7280] mt-1">
                {t('adm_dash_yearTotal', { count: attendanceSummary.absent })}
              </div>
            </div>

            <div className="bg-[#F2F3FA] rounded-2xl p-5 border border-[#E5E7F3]">
              <div className="text-xs sm:text-sm font-semibold text-[#4A5080] mb-2">
                {t('status_late')}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-sora text-[#23265A]">
                {attendanceSummary.todayLate}
              </div>
              <div className="text-[11px] font-semibold text-[#6B7280] mt-1">
                {t('adm_dash_yearTotal', { count: attendanceSummary.late })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="lg:col-span-4 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-5">
          <h2 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
            {t('adm_dash_quickActions')}
          </h2>

          <div className="space-y-3 pt-1">
            <button
              onClick={onOpenRegisterStudent}
              disabled={isHistoricalReadOnly}
              className="w-full bg-[#5458A7] text-white py-3 rounded-full font-bold text-sm hover:opacity-95 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('adm_dash_addStudent')}
            </button>

            <button
              onClick={onOpenAddTeacher}
              className="w-full border-2 border-[#5458A7] text-[#5458A7] py-3 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              {isHistoricalReadOnly ? t('adm_dash_viewTeachers') : t('adm_dash_addTeacher')}
            </button>

            <button
              onClick={() => onNavigateTab(isHistoricalReadOnly ? 'admin_attendance_history' : 'admin_attendance')}
              className="w-full border-2 border-[#5458A7] text-[#5458A7] py-3 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              {isHistoricalReadOnly ? t('adm_dash_viewAttHist') : t('adm_dash_takeAtt')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
