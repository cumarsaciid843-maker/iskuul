import React, { useState, useEffect } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AttendanceStatus } from '../../types';
import { Check, X, FileSpreadsheet, Lock } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface AttendanceSheetProps {
  forcedClassId?: string; // If teacher is restricted to assigned classes
  isTeacherMode?: boolean;
  onShowToast: (msg: string) => void;
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  forcedClassId,
  isTeacherMode = false,
  onShowToast,
}) => {
  const { school, user, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const allClasses = storage.getClasses(schoolId, ayId);
  // If teacher mode, only show teacher's assigned classes
  const teacherObj = user?.teacherId ? storage.getTeacherById(user.teacherId, ayId) : undefined;
  const classes = isTeacherMode && teacherObj
    ? allClasses.filter((c) => teacherObj.assignedClassIds.includes(c.id))
    : allClasses;

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedClassId, setSelectedClassId] = useState<string>(
    forcedClassId || classes[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState('');

  // Local state for radio marks: { [studentId]: 'present' | 'absent' | 'late' }
  const [statusMap, setStatusMap] = useState<{ [studentId: string]: AttendanceStatus }>({});

  useEffect(() => {
    if (classes.length === 0) {
      if (selectedClassId) setSelectedClassId('');
      return;
    }
    if (!classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(forcedClassId && classes.some((c) => c.id === forcedClassId) ? forcedClassId : classes[0].id);
    }
  }, [ayId, classes.length, forcedClassId]);

  // Load existing attendance for this class, date, and academic year
  useEffect(() => {
    if (!selectedClassId) {
      setStatusMap({});
      return;
    }
    const existing = storage.getAttendanceForClassAndDate(
      schoolId,
      selectedClassId,
      selectedDate,
      ayId
    );
    const map: { [id: string]: AttendanceStatus } = {};

    const classStudents = storage
      .getStudents(schoolId, ayId)
      .filter((s) => s.classId === selectedClassId && s.enrollmentStatus === 'Active');

    classStudents.forEach((student) => {
      const found = existing.find((e) => e.studentId === student.id);
      map[student.id] = found ? found.status : 'present'; // Default to present as in design
    });

    setStatusMap(map);
  }, [schoolId, selectedClassId, selectedDate, ayId]);

  const studentsInClass = storage
    .getStudents(schoolId, ayId)
    .filter((s) => s.classId === selectedClassId && s.enrollmentStatus === 'Active')
    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isHistoricalReadOnly) return;
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    setSaveError(null);
    if (isHistoricalReadOnly) {
      setSaveError(t('adm_att_errHist'));
      return;
    }
    if (!selectedClassId) {
      setSaveError(t('adm_att_errNoClass'));
      return;
    }

    try {
      const records = Object.entries(statusMap).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      if (records.length === 0) {
        setSaveError(t('adm_att_errNoStudents'));
        return;
      }

      // Updates existing records for date, class, and academicYearId without duplication
      await storage.saveAttendance(schoolId, selectedClassId, selectedDate, records, ayId);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err: any) {
      setSaveError(err?.message ? tServiceMsg(err.message) : t('adm_att_errFailed'));
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Save Success Confirmation Modal/Toast (~2 seconds) */}
      {saveSuccess && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[28px] p-6 sm:p-8 shadow-2xl flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-150 w-full max-w-[min(320px,calc(100vw-2rem))] max-h-[90dvh] overflow-y-auto text-center">
            <div className="w-16 h-16 rounded-full bg-[#5458A7] text-white flex items-center justify-center shadow-md">
              <Check size={32} strokeWidth={3} />
            </div>
            <div className="text-xl font-extrabold font-sora text-[#23265A]">
              {t('adm_att_savedModal')}
            </div>
          </div>
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm font-semibold text-red-600 flex items-center justify-between">
          <span>{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="p-1 hover:bg-red-100 rounded-lg text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <Header
        title={t('adm_att_title')}
        subtitle={
          selectedAcademicYear
            ? isHistoricalReadOnly
              ? t('adm_aySubtitleHist', { name: selectedAcademicYear.name })
              : t('adm_aySubtitle', { name: selectedAcademicYear.name })
            : undefined
        }
        searchPlaceholder={t('adm_att_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const res = excelService.exportAttendance(
                  schoolId,
                  selectedClassId || undefined,
                  selectedDate,
                  selectedDate,
                  {
                    allowedClassIds: isTeacherMode ? classes.map((c) => c.id) : undefined,
                    isTeacherMode,
                    academicYearId: ayId,
                  }
                );
                onShowToast(
                  res.success
                    ? t('adm_exportedAllToast', { count: res.count ?? 0 })
                    : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                );
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#D5D7EE] text-[#4A5080] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all flex items-center gap-2 cursor-pointer bg-white shadow-xs"
            >
              <FileSpreadsheet size={15} className="text-[#5458A7]" />
              <span>{t('common_exportExcel')}</span>
            </button>
            <button
              onClick={handleSaveAttendance}
              disabled={isHistoricalReadOnly}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-7 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isHistoricalReadOnly && <Lock size={13} />}
              <span>{t('adm_att_saveBtn')}</span>
            </button>
          </div>
        }
      />

      {isHistoricalReadOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-800 font-medium flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          <span>
            {t('adm_att_histBanner', { year: selectedAcademicYear?.name || '' })}
          </span>
        </div>
      )}

      {/* Class and Date Pickers */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-6">
        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs font-bold text-[#6B7280]">{t('common_class')}</label>
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs font-bold text-[#6B7280]">{t('common_date')}</label>
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            />
          </div>
        </div>
      </div>

      {/* Attendance Sheet Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Attendance Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {studentsInClass.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_att_emptyClass')}
            </div>
          ) : (
            studentsInClass.map((student) => {
              const currentStatus = statusMap[student.id] || 'present';
              return (
                <div key={student.id} className="p-4 space-y-3">
                  <div>
                    <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                      {student.name}
                    </div>
                    <div className="text-xs text-[#6B7280]">{student.studentIdNumber}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label
                      className={`min-h-[44px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 px-2 transition-colors ${
                        currentStatus === 'present'
                          ? 'bg-[#5458A7] text-white border-[#5458A7]'
                          : 'bg-[#F8F9FE] text-[#23265A] border-[#D5D7EE]'
                      } ${isHistoricalReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name={`att-m-${student.id}`}
                        disabled={isHistoricalReadOnly}
                        checked={currentStatus === 'present'}
                        onChange={() => handleStatusChange(student.id, 'present')}
                        className="sr-only"
                      />
                      <span className="truncate">{t('adm_att_present')}</span>
                    </label>
                    <label
                      className={`min-h-[44px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 px-2 transition-colors ${
                        currentStatus === 'absent'
                          ? 'bg-[#5458A7] text-white border-[#5458A7]'
                          : 'bg-[#F8F9FE] text-[#23265A] border-[#D5D7EE]'
                      } ${isHistoricalReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name={`att-m-${student.id}`}
                        disabled={isHistoricalReadOnly}
                        checked={currentStatus === 'absent'}
                        onChange={() => handleStatusChange(student.id, 'absent')}
                        className="sr-only"
                      />
                      <span className="truncate">{t('adm_att_absent')}</span>
                    </label>
                    <label
                      className={`min-h-[44px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 px-2 transition-colors ${
                        currentStatus === 'late'
                          ? 'bg-[#5458A7] text-white border-[#5458A7]'
                          : 'bg-[#F8F9FE] text-[#23265A] border-[#D5D7EE]'
                      } ${isHistoricalReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name={`att-m-${student.id}`}
                        disabled={isHistoricalReadOnly}
                        checked={currentStatus === 'late'}
                        onChange={() => handleStatusChange(student.id, 'late')}
                        className="sr-only"
                      />
                      <span className="truncate">{t('adm_att_late')}</span>
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 w-1/3 text-start sticky start-0 bg-white z-10">{t('common_student')}</th>
                <th className="py-4 px-6 text-center">{t('adm_att_present')}</th>
                <th className="py-4 px-6 text-center">{t('adm_att_absent')}</th>
                <th className="py-4 px-6 text-center">{t('adm_att_late')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {studentsInClass.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#6B7280]">
                    {t('adm_att_emptyClass')}
                  </td>
                </tr>
              ) : (
                studentsInClass.map((student) => {
                  const currentStatus = statusMap[student.id] || 'present';
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

                      {/* Present Radio */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="radio"
                          name={`att-${student.id}`}
                          disabled={isHistoricalReadOnly}
                          checked={currentStatus === 'present'}
                          onChange={() => handleStatusChange(student.id, 'present')}
                          className="w-5 h-5 accent-[#5458A7] cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Absent Radio */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="radio"
                          name={`att-${student.id}`}
                          disabled={isHistoricalReadOnly}
                          checked={currentStatus === 'absent'}
                          onChange={() => handleStatusChange(student.id, 'absent')}
                          className="w-5 h-5 accent-[#5458A7] cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Late Radio */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="radio"
                          name={`att-${student.id}`}
                          disabled={isHistoricalReadOnly}
                          checked={currentStatus === 'late'}
                          onChange={() => handleStatusChange(student.id, 'late')}
                          className="w-5 h-5 accent-[#5458A7] cursor-pointer disabled:cursor-not-allowed"
                        />
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
