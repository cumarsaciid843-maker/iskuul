import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Teacher } from '../../types';

import { FileSpreadsheet, Lock } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface TeachersPageProps {
  onOpenResetPassword: (teacher: Teacher) => void;
  onShowToast: (msg: string) => void;
}

export const TeachersPage: React.FC<TeachersPageProps> = ({
  onOpenResetPassword,
  onShowToast,
}) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const teachers = storage.getTeachers(schoolId, ayId);
  const classes = storage.getClasses(schoolId, ayId);

  const [searchTerm, setSearchTerm] = useState('');

  // Add teacher form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignedClassId, setAssignedClassId] = useState('');
  const [error, setError] = useState('');

  const getAssignedClassNames = (classIds: string[]) => {
    if (!classIds || classIds.length === 0) return t('common_none');
    return classIds
      .map((id) => classes.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistoricalReadOnly) {
      setError(t('adm_tch_errHist'));
      return;
    }
    if (!fullName.trim()) {
      setError(t('adm_tch_errName'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError(t('adm_tch_errEmail'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('adm_tch_errPw'));
      return;
    }

    try {
      await storage.addTeacher(
        schoolId,
        fullName.trim(),
        email.trim(),
        password,
        assignedClassId || undefined,
        ayId
      );

      const createdName = fullName.trim();
      setFullName('');
      setEmail('');
      setPassword('');
      setAssignedClassId('');
      setError('');
      onShowToast(t('adm_tch_savedToast', { name: createdName }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create teacher.');
    }
  };

  const filteredTeachers = teachers.filter(
    (tc) =>
      tc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_tch_title')}
        subtitle={
          selectedAcademicYear
            ? isHistoricalReadOnly
              ? t('adm_aySubtitleHist', { name: selectedAcademicYear.name })
              : t('adm_aySubtitle', { name: selectedAcademicYear.name })
            : undefined
        }
        searchPlaceholder={t('adm_tch_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {filteredTeachers.length !== teachers.length && (
              <button
                onClick={() => {
                  const res = excelService.exportTeachers(schoolId, filteredTeachers, 'Filtered', ayId);
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                  );
                }}
                className="border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: filteredTeachers.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportTeachers(schoolId, undefined, 'All', ayId);
                onShowToast(
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

      {/* Grid: Left Table & Right Add Teacher Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Table / Mobile Cards */}
        <div className="lg:col-span-7 min-w-0 border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
          {/* Mobile Stacked Cards (<640px) */}
          <div className="sm:hidden divide-y divide-[#E4E6F3]">
            {filteredTeachers.length === 0 ? (
              <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
                {t('adm_tch_empty')}
              </div>
            ) : (
              filteredTeachers.map((teacher) => (
                <div key={teacher.id} className="p-4 space-y-2.5">
                  <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                    {teacher.name}
                  </div>
                  <div className="text-xs text-[#555A8A] wrap-anywhere">{teacher.email}</div>
                  <div className="text-xs text-[#23265A] bg-[#F8F9FE] rounded-xl p-2.5">
                    <span className="text-[#6B7280] font-semibold me-1">{t('adm_tch_col_classes')}:</span>
                    <span className="font-medium">{getAssignedClassNames(teacher.assignedClassIds)}</span>
                  </div>
                  <button
                    onClick={() => onOpenResetPassword(teacher)}
                    className="w-full min-h-[44px] border border-[#5458A7] text-[#5458A7] px-4 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  >
                    {t('adm_tch_resetPwBtn')}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-start text-sm text-[#23265A]">
              <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
                <tr>
                  <th className="py-4 px-6 text-start sticky start-0 bg-white z-10">{t('common_teacher')}</th>
                  <th className="py-4 px-6 text-start">{t('adm_tch_col_email')}</th>
                  <th className="py-4 px-6 text-start">{t('adm_tch_col_classes')}</th>
                  <th className="py-4 px-6 text-end"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6F3]">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[#6B7280]">
                      {t('adm_tch_empty')}
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-[#F9FAFE] transition-colors"
                    >
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                        {teacher.name}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] wrap-anywhere">
                        {teacher.email}
                      </td>
                      <td className="py-4 px-6 text-[#23265A] font-medium text-xs">
                        {getAssignedClassNames(teacher.assignedClassIds)}
                      </td>
                      <td className="py-4 px-6 text-end">
                        <button
                          onClick={() => onOpenResetPassword(teacher)}
                          className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer whitespace-nowrap"
                        >
                          {t('adm_tch_resetPwBtn')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Add Teacher Card */}
        <div className="lg:col-span-5 min-w-0 border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold font-sora text-[#23265A]">
              {t('adm_tch_addBtn')}
            </h2>
            {isHistoricalReadOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700">
                <Lock size={11} />
                {t('common_readOnly')}
              </span>
            )}
          </div>

          {isHistoricalReadOnly && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
              {t('adm_tch_histNote', { year: selectedAcademicYear?.name || '' })}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateTeacher} className="space-y-4">
            <fieldset disabled={isHistoricalReadOnly} className="space-y-4 disabled:opacity-60">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_tch_nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adm_tch_namePh')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_tch_emailLabel')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="teacher@yourschool.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_tch_passwordLabel')}
                </label>
                <input
                  type="password"
                  required
                  placeholder={t('adm_tch_passwordPh')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1.5">
                  {t('adm_tch_assignClass')}
                </label>
                <select
                  value={assignedClassId}
                  onChange={(e) => setAssignedClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5D7EE] bg-white text-sm text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                >
                  <option value="">{t('common_unassigned')}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-[#6B7280] leading-relaxed pt-1">
                {t('adm_tch_help')}
              </p>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isHistoricalReadOnly}
                  className="w-full bg-[#5458A7] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-95 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('adm_tch_createBtn')}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
};
