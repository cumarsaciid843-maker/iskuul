import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ClassRoom } from '../../types';
import { StatusChip } from '../common/StatusChip';
import { X, FileSpreadsheet, Lock } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface ClassesPageProps {
  onShowToast: (msg: string) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ onShowToast }) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const classes = storage.getClasses(schoolId, ayId);
  const teachers = storage.getTeachers(schoolId, ayId);
  const students = storage.getStudents(schoolId, ayId);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');
  const [viewingClass, setViewingClass] = useState<ClassRoom | null>(null);
  const activeViewingClass = viewingClass
    ? classes.find((c) => c.id === viewingClass.id) || viewingClass
    : null;

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return t('common_unassigned');
    return teachers.find((tc) => tc.id === teacherId)?.name || t('common_unassigned');
  };

  const getStudentCount = (classId: string) => {
    return students.filter(
      (s) => s.classId === classId && s.enrollmentStatus === 'Active'
    ).length;
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistoricalReadOnly) {
      onShowToast(t('adm_cls_errHist'));
      return;
    }
    if (!newClassName.trim()) return;

    try {
      const createdName = newClassName.trim();
      await storage.addClass(schoolId, createdName, newTeacherId || undefined, ayId);
      setShowAddModal(false);
      setNewClassName('');
      setNewTeacherId('');
      onShowToast(t('adm_cls_savedToast', { name: createdName }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to create class.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_cls_title')}
        subtitle={
          selectedAcademicYear
            ? isHistoricalReadOnly
              ? t('adm_aySubtitleHist', { name: selectedAcademicYear.name })
              : t('adm_aySubtitle', { name: selectedAcademicYear.name })
            : undefined
        }
        searchPlaceholder={t('adm_cls_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {filteredClasses.length !== classes.length && (
              <button
                onClick={() => {
                  const res = excelService.exportClasses(schoolId, filteredClasses, 'Filtered', ayId);
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: filteredClasses.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportClasses(schoolId, undefined, 'All', ayId);
                onShowToast(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-white"
              title={t('common_exportExcel')}
            >
              <FileSpreadsheet size={15} className="text-[#5458A7]" />
              <span>{t('common_exportExcel')}</span>
            </button>
            <button
              onClick={() => {
                if (isHistoricalReadOnly) {
                  onShowToast(t('srv_historicalReadOnly'));
                  return;
                }
                setShowAddModal(true);
              }}
              disabled={isHistoricalReadOnly}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isHistoricalReadOnly && <Lock size={13} />}
              <span>{t('adm_cls_addBtn')}</span>
            </button>
          </div>
        }
      />

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#6B7280]">
            {t('adm_cls_empty')}
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const studentCount = getStudentCount(cls.id);
            return (
              <div
                key={cls.id}
                className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs flex flex-col justify-between space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold font-sora text-[#23265A]">
                    {cls.name}
                  </h3>
                  <div className="text-sm text-[#555A8A]">
                    {t('adm_cls_teacherPrefix')} {getTeacherName(cls.teacherId)}
                  </div>
                  <div className="text-sm text-[#555A8A]">
                    {t('adm_cls_studentsPrefix')} {studentCount > 0 ? studentCount : '-'}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setViewingClass(cls)}
                    className="w-full min-h-[44px] lg:min-h-0 border border-[#5458A7] text-[#5458A7] py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  >
                    {t('adm_cls_viewBtn')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="text-xl font-extrabold font-sora text-[#23265A] mb-4">
              {t('adm_cls_addTitle')}
            </h3>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_cls_nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adm_cls_namePh')}
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_cls_teacherLabel')}
                </label>
                <select
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                >
                  <option value="">{t('common_unassigned')}</option>
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB]"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95"
                >
                  {t('adm_cls_createBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Class Modal */}
      {activeViewingClass && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E6F3] pb-4">
              <div>
                <h3 className="text-2xl font-extrabold font-sora text-[#23265A]">
                  {activeViewingClass.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-xs text-[#555A8A]">{t('adm_cls_teacherColon')}</span>
                  {isHistoricalReadOnly ? (
                    <span className="text-xs font-bold text-[#23265A]">
                      {getTeacherName(activeViewingClass.teacherId)}
                    </span>
                  ) : (
                    <select
                      value={activeViewingClass.teacherId || ''}
                      onChange={async (e) => {
                        try {
                          await storage.updateClassTeacherForYear(
                            schoolId,
                            activeViewingClass.id,
                            e.target.value || undefined,
                            ayId
                          );
                          onShowToast(
                            t('adm_cls_teacherUpdated', {
                              name: activeViewingClass.name,
                              year: selectedAcademicYear?.name || t('adm_activeYearFallback'),
                            })
                          );
                        } catch (err: any) {
                          onShowToast(err?.message ? tServiceMsg(err.message) : t('adm_cls_teacherErr'));
                        }
                      }}
                      className="px-3 py-1 rounded-xl border border-[#D5D7EE] bg-[#FAFBFD] text-xs font-bold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                    >
                      <option value="">{t('common_unassigned')}</option>
                      {teachers.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7]">
                  {t('adm_cls_studentsBadge', { count: getStudentCount(activeViewingClass.id) })}
                </span>
                <button
                  onClick={() => setViewingClass(null)}
                  className="p-1 rounded-full text-[#6B7280] hover:text-[#23265A] hover:bg-[#F2F3FA] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
                {t('adm_cls_enrolledTitle')}
              </h4>
              <div className="max-h-72 overflow-y-auto overflow-x-auto border border-[#E4E6F3] rounded-2xl">
                <table className="w-full text-start text-xs text-[#23265A]">
                  <thead className="bg-[#F8F9FE] border-b border-[#E4E6F3] text-[#5458A7] font-semibold">
                    <tr>
                      <th className="py-3 px-4 font-manrope text-start">{t('common_student')}</th>
                      <th className="py-3 px-4 font-manrope text-start">{t('adm_cls_col_id')}</th>
                      <th className="py-3 px-4 font-manrope text-start">{t('adm_cls_col_att')}</th>
                      <th className="py-3 px-4 font-manrope text-start">{t('adm_cls_col_feeStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E6F3]">
                    {students.filter((s) => s.classId === activeViewingClass.id && s.enrollmentStatus === 'Active').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#6B7280]">
                          {t('adm_cls_noStudents')}
                        </td>
                      </tr>
                    ) : (
                      students
                        .filter((s) => s.classId === activeViewingClass.id && s.enrollmentStatus === 'Active')
                        .map((s) => {
                          const attStats = storage.getStudentAttendanceStats(schoolId, s.id, ayId);
                          const feeSummary = storage.getStudentFeeSummary(schoolId, s.id, ayId);
                          return (
                            <tr
                              key={s.id}
                              className="hover:bg-[#F9FAFE] transition-colors"
                            >
                              <td className="py-3 px-4 font-bold text-[#23265A] font-manrope">
                                {s.name}
                              </td>
                              <td className="py-3 px-4 text-[#6B7280] font-mono">
                                {s.studentIdNumber}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-[#23265A]">
                                  {attStats.percentage}%
                                </span>
                                <span className="text-[10px] text-[#6B7280] ms-1">
                                  ({attStats.total}{t('adm_daysShort')})
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <StatusChip label={feeSummary.status} />
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const enrolled = students.filter(
                    (s) => s.classId === activeViewingClass.id && s.enrollmentStatus === 'Active'
                  );
                  const res = excelService.exportStudents(
                    schoolId,
                    enrolled,
                    `${activeViewingClass.name.replace(/\s+/g, '_')}_Roster`,
                    ayId
                  );
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-[#5458A7]" />
                <span>{t('adm_cls_exportRoster')}</span>
              </button>
              <button
                onClick={() => setViewingClass(null)}
                className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-6 py-2.5 rounded-full border border-[#D5D7EE] font-bold text-xs text-[#23265A] hover:bg-[#F3F4FB] cursor-pointer"
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
