import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { excelService } from '../../services/excelService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { FileSpreadsheet, Lock } from 'lucide-react';

interface PromotionPageProps {
  onShowToast: (msg: string) => void;
}

export const PromotionPage: React.FC<PromotionPageProps> = ({ onShowToast }) => {
  const { school, selectedAcademicYear, activeAcademicYear, academicYears } = useAuth();
  const { t, tStatus, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';

  const defaultTargetAy = activeAcademicYear || selectedAcademicYear || academicYears[0];
  const [targetYearId, setTargetYearId] = useState(defaultTargetAy?.id || '');

  React.useEffect(() => {
    if (selectedAcademicYear?.id) {
      setTargetYearId(selectedAcademicYear.id);
    }
  }, [selectedAcademicYear?.id]);

  const targetAyObj = academicYears.find((y) => y.id === targetYearId) || defaultTargetAy;
  const isTargetClosed = Boolean(targetAyObj && targetAyObj.status !== 'Active');

  const classes = storage.getClasses(schoolId, targetAyObj?.id);
  const [fromClassId, setFromClassId] = useState(classes[0]?.id || '');
  const [toClassId, setToClassId] = useState(classes[1]?.id || classes[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  const studentsInFromClass = storage
    .getStudents(schoolId, targetAyObj?.id)
    .filter((s) => s.classId === fromClassId && s.enrollmentStatus === 'Active');

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    studentsInFromClass.map((s) => s.id)
  );

  React.useEffect(() => {
    const nextStudents = storage
      .getStudents(schoolId, targetAyObj?.id)
      .filter((s) => s.classId === fromClassId && s.enrollmentStatus === 'Active');
    setSelectedStudentIds(nextStudents.map((s) => s.id));
  }, [fromClassId, targetYearId, schoolId]);

  const toggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((x) => x !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedStudentIds.length === studentsInFromClass.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentsInFromClass.map((s) => s.id));
    }
  };

  const handlePromote = async () => {
    if (isTargetClosed) {
      onShowToast(t('adm_promo_errClosed'));
      return;
    }
    if (!toClassId || toClassId === fromClassId) {
      onShowToast(t('adm_promo_errDiffClass'));
      return;
    }
    if (selectedStudentIds.length === 0) {
      onShowToast(t('adm_promo_errSelect'));
      return;
    }

    try {
      await storage.promoteStudents(
        schoolId,
        fromClassId,
        toClassId,
        targetAyObj?.name || '',
        selectedStudentIds,
        targetAyObj?.id
      );

      const targetClassName = classes.find((c) => c.id === toClassId)?.name || t('common_class');
      onShowToast(
        t('adm_promo_successToast', {
          count: selectedStudentIds.length,
          className: targetClassName,
          year: targetAyObj?.name || '',
        })
      );
    } catch (err: any) {
      onShowToast(err?.message ? tServiceMsg(err.message) : t('adm_promo_errUnable'));
    }
  };

  const getClassName = (id: string) => {
    return classes.find((c) => c.id === id)?.name || t('common_class');
  };

  const filteredStudents = studentsInFromClass.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_promo_title')}
        subtitle={t('adm_promo_subtitle')}
        searchPlaceholder={t('adm_promo_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const res = excelService.exportPromotions(schoolId, targetAyObj?.id);
                if (res.success) {
                  onShowToast(t('adm_exportedAllToast', { count: res.count || 0 }));
                } else {
                  onShowToast(res.error ? tServiceMsg(res.error) : t('adm_exportFail'));
                }
              }}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 inline-flex items-center gap-2 border border-[#5458A7] text-[#5458A7] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>{t('common_exportExcel')}</span>
            </button>
            <button
              onClick={handlePromote}
              disabled={selectedStudentIds.length === 0 || isTargetClosed}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-7 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('adm_promo_promoteBtn')}
            </button>
          </div>
        }
      />

      {isTargetClosed && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-2 text-xs font-bold text-amber-800">
          <Lock size={14} className="shrink-0" />
          <span>
            {t('adm_promo_closedBanner', { name: targetAyObj?.name || '' })}
          </span>
        </div>
      )}

      {/* 3 Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-6">
        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs font-bold text-[#6B7280]">{t('adm_promo_fromClass')}</label>
          <div>
            <select
              value={fromClassId}
              onChange={(e) => setFromClassId(e.target.value)}
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
          <label className="text-xs font-bold text-[#6B7280]">{t('adm_promo_toClass')}</label>
          <div>
            <select
              value={toClassId}
              onChange={(e) => setToClassId(e.target.value)}
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
          <label className="text-xs font-bold text-[#6B7280]">
            {t('adm_promo_targetAy')}
          </label>
          <div>
            <select
              value={targetYearId}
              onChange={(e) => setTargetYearId(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} ({tStatus(ay.status)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Promotion Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          <div className="p-3.5 bg-[#FAFAFE] border-b border-[#E4E6F3]">
            <label className="flex items-center gap-2.5 min-h-[36px] text-xs font-bold text-[#5458A7] cursor-pointer">
              <input
                type="checkbox"
                checked={
                  studentsInFromClass.length > 0 &&
                  selectedStudentIds.length === studentsInFromClass.length
                }
                onChange={toggleAll}
                disabled={isTargetClosed}
                className="w-5 h-5 accent-[#5458A7] rounded-sm cursor-pointer"
              />
              <span>{t('adm_promo_select')} ({selectedStudentIds.length}/{studentsInFromClass.length})</span>
            </label>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_promo_noStudents', {
                className: getClassName(fromClassId),
                year: targetAyObj?.name || '',
              })}
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isChecked = selectedStudentIds.includes(student.id);
              return (
                <label
                  key={student.id}
                  className="p-4 flex items-center gap-3.5 hover:bg-[#F9FAFE] transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isTargetClosed}
                    onChange={() => toggleStudent(student.id)}
                    className="w-5 h-5 accent-[#5458A7] rounded-sm cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                      {student.name}
                    </div>
                    <div className="text-xs text-[#555A8A] mt-0.5">
                      {getClassName(student.classId)} → <span className="text-[#5458A7] font-semibold">{getClassName(toClassId)}</span>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 w-16 text-start">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        studentsInFromClass.length > 0 &&
                        selectedStudentIds.length === studentsInFromClass.length
                      }
                      onChange={toggleAll}
                      disabled={isTargetClosed}
                      className="w-4 h-4 accent-[#5458A7] rounded-sm cursor-pointer"
                    />
                    <span>{t('adm_promo_select')}</span>
                  </div>
                </th>
                <th className="py-4 px-6 text-start">{t('common_student')}</th>
                <th className="py-4 px-6 text-start">
                  {t('adm_promo_col_current', { year: targetAyObj?.name || '' })}
                </th>
                <th className="py-4 px-6 text-start">{t('adm_promo_col_next')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#6B7280]">
                    {t('adm_promo_noStudents', {
                      className: getClassName(fromClassId),
                      year: targetAyObj?.name || '',
                    })}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#F9FAFE] transition-colors"
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isTargetClosed}
                          onChange={() => toggleStudent(student.id)}
                          className="w-5 h-5 accent-[#5458A7] rounded-sm cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A]">
                        {student.name}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {getClassName(student.classId)}
                      </td>
                      <td className="py-4 px-6 text-[#5458A7] font-semibold">
                        {getClassName(toClassId)}
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
