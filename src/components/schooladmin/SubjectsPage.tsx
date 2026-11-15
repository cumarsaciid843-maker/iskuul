import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Subject } from '../../types';
import { FileSpreadsheet, Lock } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface SubjectsPageProps {
  onShowToast: (msg: string) => void;
}

export const SubjectsPage: React.FC<SubjectsPageProps> = ({ onShowToast }) => {
  const { school, selectedAcademicYear, isHistoricalReadOnly } = useAuth();
  const { t, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const subjects = storage.getSubjects(schoolId, ayId);
  const classes = storage.getClasses(schoolId, ayId);
  const teachers = storage.getTeachers(schoolId, ayId);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');

  const getClassName = (cId: string) => {
    return classes.find((c) => c.id === cId)?.name || t('common_class');
  };

  const getTeacherName = (tId: string) => {
    return teachers.find((tc) => tc.id === tId)?.name || t('common_teacher');
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClassName(s.classId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTeacherName(s.teacherId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    if (isHistoricalReadOnly) {
      onShowToast(t('srv_historicalReadOnly'));
      return;
    }
    setName('');
    setClassId(classes[0]?.id || '');
    setTeacherId(teachers[0]?.id || '');
    setShowAddModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistoricalReadOnly) return;
    if (!name.trim()) return;
    try {
      await storage.addSubject(schoolId, name.trim(), classId, teacherId, ayId);
      setShowAddModal(false);
      onShowToast(t('adm_sub_addedToast', { name: name.trim() }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to add subject.');
    }
  };

  const handleOpenEdit = (s: Subject) => {
    if (isHistoricalReadOnly) {
      onShowToast(t('srv_historicalReadOnly'));
      return;
    }
    setEditingSubject(s);
    setName(s.name);
    setClassId(s.classId);
    setTeacherId(s.teacherId);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || isHistoricalReadOnly) return;
    try {
      await storage.updateSubject(editingSubject.id, schoolId, {
        name: name.trim(),
        classId,
        teacherId,
      });
      setEditingSubject(null);
      onShowToast(t('adm_sub_updatedToast', { name: name.trim() }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to update subject.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_sub_title')}
        subtitle={
          selectedAcademicYear
            ? isHistoricalReadOnly
              ? t('adm_aySubtitleHist', { name: selectedAcademicYear.name })
              : t('adm_aySubtitle', { name: selectedAcademicYear.name })
            : undefined
        }
        searchPlaceholder={t('adm_sub_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {filteredSubjects.length !== subjects.length && (
              <button
                onClick={() => {
                  const res = excelService.exportSubjects(schoolId, filteredSubjects, 'Filtered', ayId);
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: filteredSubjects.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportSubjects(schoolId, undefined, 'All', ayId);
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
              onClick={handleOpenAdd}
              disabled={isHistoricalReadOnly}
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isHistoricalReadOnly && <Lock size={13} />}
              <span>{t('adm_sub_addBtn')}</span>
            </button>
          </div>
        }
      />

      {/* Subjects Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredSubjects.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_sub_empty')}
            </div>
          ) : (
            filteredSubjects.map((s) => (
              <div key={s.id} className="p-4 space-y-2.5">
                <div className="font-bold font-sora text-sm text-[#23265A]">{s.name}</div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8F9FE] rounded-xl p-2.5">
                  <div>
                    <span className="text-[#6B7280] block">{t('common_class')}</span>
                    <span className="font-medium text-[#555A8A]">{getClassName(s.classId)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">{t('common_teacher')}</span>
                    <span className="font-medium text-[#23265A]">{getTeacherName(s.teacherId)}</span>
                  </div>
                </div>
                {!isHistoricalReadOnly ? (
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="w-full min-h-[44px] border border-[#5458A7] text-[#5458A7] px-6 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  >
                    {t('common_edit')}
                  </button>
                ) : (
                  <div className="text-[11px] font-semibold text-[#6B7280]">{t('common_readOnly')}</div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 text-start sticky start-0 bg-white z-10">{t('adm_sub_col_subject')}</th>
                <th className="py-4 px-6 text-start">{t('common_class')}</th>
                <th className="py-4 px-6 text-start">{t('common_teacher')}</th>
                <th className="py-4 px-6 text-end"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#6B7280]">
                    {t('adm_sub_empty')}
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F9FAFE] transition-colors">
                    <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                      {s.name}
                    </td>
                    <td className="py-4 px-6 text-[#555A8A] font-medium">
                      {getClassName(s.classId)}
                    </td>
                    <td className="py-4 px-6 text-[#23265A] font-medium">
                      {getTeacherName(s.teacherId)}
                    </td>
                    <td className="py-4 px-6 text-end">
                      {!isHistoricalReadOnly ? (
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="border border-[#5458A7] text-[#5458A7] px-6 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                        >
                          {t('common_edit')}
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#6B7280]">{t('common_readOnly')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {(showAddModal || editingSubject) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="text-xl font-extrabold font-sora text-[#23265A] mb-4">
              {editingSubject ? t('adm_sub_editTitle') : t('adm_sub_addTitle')}
            </h3>

            <form
              onSubmit={editingSubject ? handleSaveEdit : handleSaveAdd}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_sub_nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adm_sub_namePh')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('common_class')}
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('common_teacher')}
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                >
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
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubject(null);
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB]"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95"
                >
                  {t('adm_sub_saveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
