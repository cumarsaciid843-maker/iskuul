import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface TeacherProfileProps {
  onShowToast: (msg: string) => void;
}

export const TeacherProfile: React.FC<TeacherProfileProps> = ({ onShowToast }) => {
  const { school, user, selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;

  const teacher = user?.teacherId ? storage.getTeacherById(user.teacherId, ayId) : undefined;
  const classes = storage.getClasses(schoolId, ayId);
  const subjects = storage.getSubjects(schoolId, ayId);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const teacherName = teacher?.name || user?.name || t('nav_role_teacher');
  const teacherEmail = teacher?.email || user?.email || 'teacher@school.com';

  const initials = teacherName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Map assigned classes and their subjects
  const assignedList: { classId: string; className: string; subjectName: string }[] = [];

  teacher?.assignedClassIds.forEach((clsId) => {
    const cls = classes.find((c) => c.id === clsId);
    const subjs = subjects.filter((s) => s.classId === clsId && s.teacherId === teacher.id);
    const subNames = subjs.length > 0 ? subjs.map((s) => s.name).join(', ') : t('tch_prof_allSubjects');

    assignedList.push({
      classId: clsId,
      className: cls?.name || t('common_class'),
      subjectName: subNames,
    });
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword) {
      setError(t('tch_prof_errCurrent'));
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError(t('tch_prof_errLen'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('tch_prof_errMatch'));
      return;
    }

    try {
      await storage.changeOwnPassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onShowToast(t('tch_prof_pwSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tch_prof_errCurrent'));
    }
  };

  const filteredList = assignedList.filter(
    (item) =>
      item.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <Header
        title={t('tch_prof_title')}
        searchPlaceholder={t('common_search')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full sm:w-auto min-h-[44px] border border-[#5458A7] text-[#5458A7] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#F3F4FB] transition-all cursor-pointer"
          >
            {t('tch_prof_changePwBtn')}
          </button>
        }
      />

      {/* Top Profile Card */}
      <div className="border border-[#E4E6F3] rounded-[24px] p-6 sm:p-10 lg:p-12 bg-white shadow-xs text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#5458A7] text-white flex items-center justify-center font-sora text-xl sm:text-2xl font-extrabold mx-auto mb-4 shadow-sm">
          {initials}
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold font-sora text-[#23265A] wrap-anywhere">
          {teacherName}
        </h2>
        <div dir="ltr" className="text-sm font-semibold text-[#555A8A] mt-1 ltr-inline wrap-anywhere">
          {teacherEmail}
        </div>
      </div>

      {/* Bottom Assigned Classes Card */}
      <div className="border border-[#E4E6F3] rounded-[24px] p-4 sm:p-6 lg:p-8 bg-white shadow-xs space-y-4">
        <h3 className="text-base sm:text-lg font-extrabold font-sora text-[#23265A]">
          {t('tch_prof_assignedClasses')}
        </h3>

        <div className="border border-[#E4E6F3] rounded-2xl overflow-hidden">
          {/* Mobile Stacked Cards (<640px) */}
          <div className="sm:hidden divide-y divide-[#E4E6F3]">
            {filteredList.length === 0 ? (
              <div className="py-8 px-4 text-center text-sm text-[#6B7280]">
                {t('tch_prof_noClasses')}
              </div>
            ) : (
              filteredList.map((item, idx) => (
                <div key={idx} className="p-4 space-y-1">
                  <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                    {item.className}
                  </div>
                  <div className="text-xs text-[#555A8A] wrap-anywhere">
                    {t('tch_prof_col_subject')}: {item.subjectName}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tablet/Desktop Table (>=640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-start text-sm text-[#23265A]">
              <thead className="bg-[#FAFBFD] text-[#5458A7] font-semibold text-xs border-b border-[#E4E6F3]">
                <tr>
                  <th className="py-3.5 px-6">{t('tch_prof_col_class')}</th>
                  <th className="py-3.5 px-6">{t('tch_prof_col_subject')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6F3]">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-[#6B7280]">
                      {t('tch_prof_noClasses')}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F9FAFE]">
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A]">
                        {item.className}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {item.subjectName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A] mb-4">
              {t('tch_prof_modalTitle')}
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold wrap-anywhere">
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('tch_prof_currentPw')}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm text-start"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('tch_prof_newPw')}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm text-start"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('tch_prof_confirmPw')}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm text-start"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 cursor-pointer"
                >
                  {t('tch_prof_updatePw')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
