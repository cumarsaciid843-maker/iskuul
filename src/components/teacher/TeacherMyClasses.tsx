import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ClassRoom } from '../../types';
import { X, Lock } from 'lucide-react';

interface TeacherMyClassesProps {
  onTakeAttendance: (classId: string) => void;
}

export const TeacherMyClasses: React.FC<TeacherMyClassesProps> = ({ onTakeAttendance }) => {
  const { school, user, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const teacher = user?.teacherId ? storage.getTeacherById(user.teacherId, ayId) : undefined;
  const allClasses = storage.getClasses(schoolId, ayId);
  const students = storage.getStudents(schoolId, ayId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<ClassRoom | null>(null);

  // Strictly assigned classes only
  const myClasses = allClasses.filter((c) =>
    teacher?.assignedClassIds?.includes(c.id)
  );

  const filtered = myClasses.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentCount = (classId: string) => {
    return students.filter(
      (s) => s.classId === classId && s.enrollmentStatus === 'Active'
    ).length;
  };

  const selectedClassStudents = selectedClassForStudents
    ? students.filter(
        (s) => s.classId === selectedClassForStudents.id && s.enrollmentStatus === 'Active'
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('tch_classes_title')}
        searchPlaceholder={t('tch_classes_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Subtitle */}
      <p className="text-sm text-[#555A8A] -mt-4">
        {t('tch_classes_subtitle', {
          ay: selectedAcademicYear ? ` (${selectedAcademicYear.name})` : '',
        })}
      </p>

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#6B7280]">
            {t('tch_classes_empty')}
          </div>
        ) : (
          filtered.map((cls) => {
            const count = getStudentCount(cls.id);
            return (
              <div
                key={cls.id}
                className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs flex flex-col justify-between space-y-5 sm:space-y-6 min-w-0"
              >
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A] wrap-anywhere">
                    {cls.name}
                  </h3>
                  <div className="text-sm text-[#555A8A]">
                    {t('tch_classes_studentsLabel')} {count > 0 ? count : '-'}
                  </div>
                </div>

                <div className="flex flex-col min-[380px]:flex-row flex-wrap items-stretch min-[380px]:items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClassForStudents(cls)}
                    className="flex-1 min-h-[44px] border border-[#5458A7] text-[#5458A7] py-2.5 px-3 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  >
                    {t('tch_classes_viewStudents')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onTakeAttendance(cls.id)}
                    disabled={isHistoricalReadOnly}
                    className="flex-1 min-h-[44px] bg-[#5458A7] text-white py-2.5 px-3 rounded-full font-bold text-xs hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
                    title={isHistoricalReadOnly ? t('srv_historicalReadOnly') : t('tch_classes_takeAttendance')}
                  >
                    {isHistoricalReadOnly && <Lock size={11} />}
                    <span>{isHistoricalReadOnly ? t('tch_classes_closedYear') : t('tch_classes_takeAttendance')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Class Students & Absence Modal */}
      {selectedClassForStudents && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b border-[#E4E6F3] pb-4">
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#23265A] wrap-anywhere">
                  {selectedClassForStudents.name}
                </h3>
                <p className="text-xs text-[#555A8A] mt-1">
                  {t('tch_classes_modalSub')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassForStudents(null)}
                aria-label={t('common_close')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#23265A] hover:bg-[#F2F3FA] transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Students Mobile Cards (<640px) + Desktop Table (>=640px) */}
            <div className="max-h-96 overflow-y-auto border border-[#E4E6F3] rounded-2xl">
              <div className="sm:hidden divide-y divide-[#E4E6F3]">
                {selectedClassStudents.length === 0 ? (
                  <div className="py-8 px-4 text-center text-xs text-[#6B7280]">
                    {t('tch_classes_noActiveStudents')}
                  </div>
                ) : (
                  selectedClassStudents.map((s) => {
                    const stats = storage.getStudentAttendanceStats(schoolId, s.id, ayId);
                    return (
                      <div key={s.id} className="p-3.5 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-[#23265A] wrap-anywhere">{s.name}</div>
                            <div dir="ltr" className="text-[#6B7280] font-mono ltr-inline">{s.studentIdNumber}</div>
                          </div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                              stats.total === 0
                                ? 'bg-[#F2F3FA] text-[#6B7280]'
                                : stats.percentage >= 90
                                ? 'bg-[#EEEEF8] text-[#5458A7]'
                                : stats.percentage >= 75
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-600'
                            }`}
                          >
                            <span dir="ltr" className="ltr-inline">{stats.percentage}%</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className={stats.absent > 0 ? 'text-red-600 font-bold' : 'text-[#6B7280]'}>
                            {t('tch_classes_col_absent')}: {stats.absent}
                          </span>
                          <span className={stats.late > 0 ? 'text-amber-600 font-bold' : 'text-[#6B7280]'}>
                            {t('tch_classes_col_late')}: {stats.late}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-start text-xs text-[#23265A]">
                  <thead className="bg-[#F8F9FE] border-b border-[#E4E6F3] text-[#5458A7] font-semibold">
                    <tr>
                      <th className="py-3 px-4 font-manrope">{t('tch_classes_col_student')}</th>
                      <th className="py-3 px-4 font-manrope">{t('tch_classes_col_id')}</th>
                      <th className="py-3 px-4 font-manrope">{t('tch_classes_col_absent')}</th>
                      <th className="py-3 px-4 font-manrope">{t('tch_classes_col_late')}</th>
                      <th className="py-3 px-4 font-manrope">{t('tch_classes_col_rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E6F3]">
                    {selectedClassStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#6B7280]">
                          {t('tch_classes_noActiveStudents')}
                        </td>
                      </tr>
                    ) : (
                      selectedClassStudents.map((s) => {
                        const stats = storage.getStudentAttendanceStats(schoolId, s.id, ayId);
                        return (
                          <tr key={s.id} className="hover:bg-[#F9FAFE] transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#23265A] font-manrope">
                              {s.name}
                            </td>
                            <td className="py-3.5 px-4 text-[#6B7280] font-mono">
                              <span dir="ltr" className="ltr-inline">{s.studentIdNumber}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`font-semibold ${
                                  stats.absent > 0 ? 'text-red-600 font-bold' : 'text-[#6B7280]'
                                }`}
                              >
                                {stats.absent} {stats.absent === 1 ? t('tch_classes_day') : t('tch_classes_days')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`font-semibold ${
                                  stats.late > 0 ? 'text-amber-600 font-bold' : 'text-[#6B7280]'
                                }`}
                              >
                                {stats.late} {stats.late === 1 ? t('tch_classes_day') : t('tch_classes_days')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  stats.total === 0
                                    ? 'bg-[#F2F3FA] text-[#6B7280]'
                                    : stats.percentage >= 90
                                    ? 'bg-[#EEEEF8] text-[#5458A7]'
                                    : stats.percentage >= 75
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-600'
                                }`}
                              >
                                <span dir="ltr" className="ltr-inline">{stats.percentage}%</span>{' '}
                                {stats.total === 0 ? t('tch_classes_noRecords') : `(${stats.total})`}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[#6B7280]">
                {t('tch_classes_totalStudents', { count: selectedClassStudents.length })}
              </span>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedClassForStudents(null)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full border border-[#D5D7EE] font-bold text-xs text-[#23265A] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_close')}
                </button>
                {!isHistoricalReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const cid = selectedClassForStudents.id;
                      setSelectedClassForStudents(null);
                      onTakeAttendance(cid);
                    }}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full bg-[#5458A7] text-white font-bold text-xs hover:opacity-95 shadow-sm cursor-pointer"
                  >
                    {t('tch_classes_takeAttendance')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
