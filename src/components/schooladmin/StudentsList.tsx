import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { excelService } from '../../services/excelService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Student } from '../../types';
import { FileSpreadsheet, Lock } from 'lucide-react';

interface StudentsListProps {
  onOpenAddStudent: () => void;
  onViewStudentProfile: (student: Student) => void;
  onShowToast?: (msg: string) => void;
}

export const StudentsList: React.FC<StudentsListProps> = ({
  onOpenAddStudent,
  onViewStudentProfile,
  onShowToast,
}) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const students = storage.getStudents(schoolId, ayId);
  const classes = storage.getClasses(schoolId, ayId);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass =
      classFilter === 'all' ? true : s.classId === classFilter;
    return matchesSearch && matchesClass;
  });

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || t('common_unassigned');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_stu_title')}
        subtitle={
          selectedAcademicYear
            ? isHistoricalReadOnly
              ? t('adm_aySubtitleHistRoster', { name: selectedAcademicYear.name })
              : t('adm_aySubtitle', { name: selectedAcademicYear.name })
            : undefined
        }
        searchPlaceholder={t('adm_stu_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {filteredStudents.length !== students.length && (
              <button
                onClick={() => {
                  const res = excelService.exportStudents(schoolId, filteredStudents, 'Filtered', ayId);
                  onShowToast?.(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
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
                const res = excelService.exportStudents(schoolId, undefined, 'All', ayId);
                onShowToast?.(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer bg-white"
            >
              <FileSpreadsheet size={15} className="text-[#5458A7]" />
              <span>{t('common_exportExcel')}</span>
            </button>
            {isHistoricalReadOnly ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <Lock size={13} />
                {t('adm_stu_readOnlyBadge')}
              </span>
            ) : (
              <button
                onClick={onOpenAddStudent}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer inline-flex items-center"
              >
                {t('adm_stu_addBtn')}
              </button>
            )}
          </div>
        }
      />

      {/* Class Filter */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#6B7280]">{t('common_class')}</label>
        <div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
          >
            <option value="all">{t('adm_stu_filterClass')}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredStudents.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_stu_empty', {
                year: selectedAcademicYear?.name || t('adm_currentYearFallback'),
              })}
            </div>
          ) : (
            filteredStudents.map((student) => {
              const att = storage.getStudentAttendanceStats(schoolId, student.id, ayId);
              const feeSummary = storage.getStudentFeeSummary(schoolId, student.id, ayId);
              return (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                        {student.name}
                      </div>
                      <div className="text-xs text-[#6B7280]">{student.studentIdNumber}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusChip label={feeSummary.status} />
                      {feeSummary.previousYearsOutstanding > 0 && (
                        <span className="text-[11px] font-bold text-rose-600">
                          {t('adm_stu_priorDebtTag', {
                            amount: feeSummary.previousYearsOutstanding.toFixed(2),
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8F9FE] rounded-xl p-2.5">
                    <div>
                      <span className="text-[#6B7280] block">{t('common_class')}</span>
                      <span className="font-semibold text-[#23265A]">{getClassName(student.classId)}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">{t('adm_stu_col_attendance')}</span>
                      <span className="font-semibold text-[#23265A]">
                        {att.percentage}% ({att.total} {att.total === 1 ? t('adm_day') : t('adm_days')})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewStudentProfile(student)}
                    className="w-full min-h-[44px] border border-[#5458A7] text-[#5458A7] px-5 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  >
                    {t('adm_stu_viewProfile')}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 text-start sticky start-0 bg-white z-10">{t('common_student')}</th>
                <th className="py-4 px-6 text-start">{t('common_class')}</th>
                <th className="py-4 px-6 text-start">{t('adm_stu_col_attendance')}</th>
                <th className="py-4 px-6 text-start">{t('adm_stu_col_fees')}</th>
                <th className="py-4 px-6 text-end"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                    {t('adm_stu_empty', {
                      year: selectedAcademicYear?.name || t('adm_currentYearFallback'),
                    })}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const att = storage.getStudentAttendanceStats(schoolId, student.id, ayId);
                  const feeSummary = storage.getStudentFeeSummary(schoolId, student.id, ayId);

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#F9FAFE] transition-colors"
                    >
                      <td className="py-4 px-6 sticky start-0 bg-white">
                        <div className="font-bold font-sora text-[#23265A]">
                          {student.name}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {student.studentIdNumber}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {getClassName(student.classId)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-[#23265A]">
                        <span>{att.percentage}%</span>
                        <span className="text-[11px] font-normal text-[#6B7280] ms-1">
                          ({att.total} {att.total === 1 ? t('adm_day') : t('adm_days')})
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-start gap-1">
                          <StatusChip label={feeSummary.status} />
                          {feeSummary.previousYearsOutstanding > 0 && (
                            <span className="text-[11px] font-bold text-rose-600">
                              {t('adm_stu_priorDebtTag', {
                                amount: feeSummary.previousYearsOutstanding.toFixed(2),
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-end">
                        <button
                          onClick={() => onViewStudentProfile(student)}
                          className="border border-[#5458A7] text-[#5458A7] px-5 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer whitespace-nowrap"
                        >
                          {t('adm_stu_viewProfile')}
                        </button>
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
