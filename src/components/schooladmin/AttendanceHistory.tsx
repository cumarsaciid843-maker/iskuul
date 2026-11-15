import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AttendanceStatus } from '../../types';
import { X, ChevronRight, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface AttendanceHistoryProps {
  initialClassId?: string;
  isTeacherMode?: boolean;
  onShowToast?: (msg: string) => void;
}

interface SelectedHistoryRow {
  date: string;
  classId: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  initialClassId,
  isTeacherMode = false,
  onShowToast,
}) => {
  const { school, user, selectedAcademicYear } = useAuth();
  const { t, tStatus, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const allClasses = storage.getClasses(schoolId, ayId);
  const teacherObj = user?.teacherId ? storage.getTeacherById(user.teacherId, ayId) : undefined;
  const classes = isTeacherMode && teacherObj
    ? allClasses.filter((c) => teacherObj.assignedClassIds.includes(c.id))
    : allClasses;

  const [classFilter, setClassFilter] = useState(initialClassId || 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Drill down modal state
  const [drillDownRecord, setDrillDownRecord] = useState<SelectedHistoryRow | null>(null);
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState<'all' | AttendanceStatus>('all');

  const historyRecords = storage.getAttendanceHistory(
    schoolId,
    classFilter,
    fromDate,
    toDate,
    ayId
  );

  const getClassName = (id: string) => {
    return classes.find((c) => c.id === id)?.name || t('common_class');
  };

  const filteredHistory = historyRecords.filter((rec) => {
    const cName = getClassName(rec.classId).toLowerCase();
    const query = searchTerm.toLowerCase();
    return cName.includes(query) || rec.date.includes(query);
  });

  // Load all students for the drill-down record
  const getDrillDownStudents = () => {
    if (!drillDownRecord) return [];
    const allStudentsInClass = storage
      .getStudents(schoolId, ayId)
      .filter((s) => s.classId === drillDownRecord.classId && s.enrollmentStatus === 'Active');

    const recorded = storage.getAttendanceForClassAndDate(
      schoolId,
      drillDownRecord.classId,
      drillDownRecord.date,
      ayId
    );

    const studentsWithStatus = allStudentsInClass.map((s) => {
      const match = recorded.find((r) => r.studentId === s.id);
      const status: AttendanceStatus = match ? match.status : 'present';
      return {
        ...s,
        status,
      };
    });

    if (drillDownStatusFilter === 'all') return studentsWithStatus;
    return studentsWithStatus.filter((s) => s.status === drillDownStatusFilter);
  };

  const drillDownList = getDrillDownStudents();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_ah_title')}
        subtitle={
          selectedAcademicYear
            ? t('adm_aySubtitle', { name: selectedAcademicYear.name })
            : undefined
        }
        searchPlaceholder={isTeacherMode ? t('adm_ah_searchPhTeacher') : t('adm_ah_searchPhAdmin')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {(classFilter !== 'all' || fromDate || toDate) && (
              <button
                onClick={() => {
                  const res = excelService.exportAttendance(
                    schoolId,
                    classFilter !== 'all' ? classFilter : undefined,
                    fromDate || undefined,
                    toDate || undefined,
                    {
                      allowedClassIds: isTeacherMode ? classes.map((c) => c.id) : undefined,
                      isTeacherMode,
                      academicYearId: ayId,
                    }
                  );
                  onShowToast?.(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                  );
                }}
                className="border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_ah_exportFiltered')}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportAttendance(
                  schoolId,
                  undefined,
                  undefined,
                  undefined,
                  {
                    allowedClassIds: isTeacherMode ? classes.map((c) => c.id) : undefined,
                    isTeacherMode,
                    academicYearId: ayId,
                  }
                );
                onShowToast?.(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                );
              }}
              className="border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-white"
              title={t('common_exportExcel')}
            >
              <FileSpreadsheet size={15} className="text-[#5458A7]" />
              <span>{t('common_exportExcel')}</span>
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-6">
        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs font-bold text-[#6B7280]">{t('common_class')}</label>
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            >
              <option value="all">{t('adm_ah_allClasses')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs font-bold text-[#6B7280]">{t('adm_ah_fromDate')}</label>
          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            />
          </div>
        </div>

        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs font-bold text-[#6B7280]">{t('adm_ah_toDate')}</label>
          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            />
          </div>
        </div>
      </div>

      {/* History Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredHistory.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_ah_empty')}
            </div>
          ) : (
            filteredHistory.map((row, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDrillDownRecord(row);
                  setDrillDownStatusFilter('all');
                }}
                className="w-full text-start p-4 space-y-2.5 hover:bg-[#F9FAFE] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold font-sora text-sm text-[#23265A]">{row.date}</div>
                    <div className="text-xs text-[#555A8A] font-medium">{getClassName(row.classId)}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5458A7]">
                    <span>{t('adm_ah_viewStudents')}</span>
                    <ChevronRight size={14} className="rtl:rotate-180" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center bg-[#F8F9FE] rounded-xl p-2 text-xs">
                  <div>
                    <span className="block text-[10px] text-[#6B7280]">{t('adm_att_present')}</span>
                    <span className="font-bold text-green-700">{row.present}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#6B7280]">{t('adm_att_absent')}</span>
                    <span className="font-bold text-red-600">{row.absent}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#6B7280]">{t('adm_att_late')}</span>
                    <span className="font-bold text-amber-600">{row.late}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 text-start sticky start-0 bg-white z-10">{t('common_date')}</th>
                <th className="py-4 px-6 text-start">{t('common_class')}</th>
                <th className="py-4 px-6 text-start">{t('adm_att_present')}</th>
                <th className="py-4 px-6 text-start">{t('adm_att_absent')}</th>
                <th className="py-4 px-6 text-start">{t('adm_att_late')}</th>
                <th className="py-4 px-6 text-end">{t('adm_ah_col_details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    {t('adm_ah_empty')}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => {
                      setDrillDownRecord(row);
                      setDrillDownStatusFilter('all');
                    }}
                    className="hover:bg-[#F9FAFE] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                      {row.date}
                    </td>
                    <td className="py-4 px-6 text-[#555A8A] font-medium">
                      {getClassName(row.classId)}
                    </td>
                    <td className="py-4 px-6 font-semibold text-green-700">
                      {row.present}
                    </td>
                    <td className="py-4 px-6 font-semibold text-red-600">
                      {row.absent}
                    </td>
                    <td className="py-4 px-6 font-semibold text-amber-600">
                      {row.late}
                    </td>
                    <td className="py-4 px-6 text-end">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5458A7] group-hover:underline">
                        <span>{t('adm_ah_viewStudents')}</span>
                        <ChevronRight size={14} className="rtl:rotate-180" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Attendance Drill-down Modal */}
      {drillDownRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E4E6F3] pb-4 gap-3">
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#23265A] truncate">
                  {getClassName(drillDownRecord.classId)}
                </h3>
                <p className="text-xs text-[#555A8A] mt-1 font-medium">
                  {t('adm_ah_modalDate', { date: drillDownRecord.date })}
                </p>
              </div>
              <button
                onClick={() => setDrillDownRecord(null)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-full text-[#6B7280] hover:text-[#23265A] hover:bg-[#F2F3FA] transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Attendance Counts Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#F2F3FA] rounded-2xl p-3.5 border border-[#E5E7F3] text-center">
                <div className="text-[11px] font-bold text-[#4A5080] uppercase tracking-wider mb-1">
                  {t('common_total')}
                </div>
                <div className="text-xl font-extrabold font-sora text-[#23265A]">
                  {drillDownRecord.total}
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-3.5 border border-green-200 text-center">
                <div className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-1">
                  {t('adm_att_present')}
                </div>
                <div className="text-xl font-extrabold font-sora text-green-800">
                  {drillDownRecord.present}
                </div>
              </div>

              <div className="bg-red-50 rounded-2xl p-3.5 border border-red-200 text-center">
                <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
                  {t('adm_att_absent')}
                </div>
                <div className="text-xl font-extrabold font-sora text-red-800">
                  {drillDownRecord.absent}
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-center">
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                  {t('adm_att_late')}
                </div>
                <div className="text-xl font-extrabold font-sora text-amber-800">
                  {drillDownRecord.late}
                </div>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-[#F0F2FA] pb-3">
              <span className="text-xs font-bold text-[#6B7280] me-2">{t('adm_ah_filterStatus')}</span>
              <button
                type="button"
                onClick={() => setDrillDownStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  drillDownStatusFilter === 'all'
                    ? 'bg-[#5458A7] text-white shadow-xs'
                    : 'bg-[#F2F3FA] text-[#4A5080] hover:bg-[#E5E7F3]'
                }`}
              >
                {t('common_all')} ({drillDownRecord.total})
              </button>
              <button
                type="button"
                onClick={() => setDrillDownStatusFilter('present')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  drillDownStatusFilter === 'present'
                    ? 'bg-green-600 text-white shadow-xs'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {t('adm_att_present')} ({drillDownRecord.present})
              </button>
              <button
                type="button"
                onClick={() => setDrillDownStatusFilter('absent')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  drillDownStatusFilter === 'absent'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {t('adm_att_absent')} ({drillDownRecord.absent})
              </button>
              <button
                type="button"
                onClick={() => setDrillDownStatusFilter('late')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  drillDownStatusFilter === 'late'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {t('adm_att_late')} ({drillDownRecord.late})
              </button>
            </div>

            {/* Every Student In That Class List */}
            <div className="max-h-72 overflow-y-auto overflow-x-auto border border-[#E4E6F3] rounded-2xl">
              <table className="w-full text-start text-xs text-[#23265A]">
                <thead className="bg-[#F8F9FE] border-b border-[#E4E6F3] text-[#5458A7] font-semibold">
                  <tr>
                    <th className="py-3 px-4 font-manrope text-start">{t('common_student')}</th>
                    <th className="py-3 px-4 font-manrope text-start">{t('adm_cls_col_id')}</th>
                    <th className="py-3 px-4 font-manrope text-end">{t('adm_ah_col_recorded')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E6F3]">
                  {drillDownList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[#6B7280]">
                        {t('adm_ah_noMatchFilter')}
                      </td>
                    </tr>
                  ) : (
                    drillDownList.map((s) => (
                      <tr key={s.id} className="hover:bg-[#F9FAFE] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#23265A] font-manrope">
                          {s.name}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] font-mono">
                          {s.studentIdNumber}
                        </td>
                        <td className="py-3 px-4 text-end">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              s.status === 'present'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : s.status === 'absent'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.status === 'present' && <CheckCircle2 size={12} />}
                            {s.status === 'absent' && <XCircle size={12} />}
                            {s.status === 'late' && <AlertTriangle size={12} />}
                            <span className="capitalize">{tStatus(s.status)}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#6B7280]">
                {t('adm_ah_showingCount', {
                  shown: drillDownList.length,
                  total: drillDownRecord.total,
                })}
              </span>
              <button
                type="button"
                onClick={() => setDrillDownRecord(null)}
                className="px-6 py-2.5 rounded-full border border-[#D5D7EE] font-bold text-xs text-[#23265A] hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('common_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
