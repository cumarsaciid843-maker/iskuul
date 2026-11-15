import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Teacher } from '../../types';

interface ResetTeacherPasswordProps {
  initialTeacher?: Teacher | null;
  onCancel: () => void;
  onShowToast: (msg: string) => void;
}

export const ResetTeacherPassword: React.FC<ResetTeacherPasswordProps> = ({
  initialTeacher,
  onCancel,
  onShowToast,
}) => {
  const { school } = useAuth();
  const { t } = useLanguage();
  const schoolId = school?.id || '';

  const teachers = storage.getTeachers(schoolId);
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    initialTeacher?.id || teachers[0]?.id || ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const currentTeacher = teachers.find((tc) => tc.id === selectedTeacherId) || teachers[0];

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError(t('adm_rtp_errLen'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('adm_rtp_errMismatch'));
      return;
    }

    if (currentTeacher) {
      try {
        await storage.resetTeacherPassword(currentTeacher.id, newPassword);
        onShowToast(t('adm_rtp_successToast', { name: currentTeacher.name }));
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        onCancel();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reset teacher password.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_rtp_title')}
        searchPlaceholder={t('adm_rtp_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Notice Pill Badge */}
      <div>
        <div className="inline-block max-w-full bg-[#EEEEF8] text-[#5458A7] text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-2xl sm:rounded-full shadow-xs leading-relaxed">
          {t('adm_rtp_badge')}
        </div>
      </div>

      {/* Main Card */}
      <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-8 max-w-xl bg-white shadow-xs">
        <h2 className="text-xl font-extrabold font-sora text-[#23265A] mb-6">
          {t('common_teacher')}
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-6">
          {/* Name Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[#F0F2FA]">
            <span className="text-sm font-medium text-[#6B7280]">{t('adm_rtp_nameLabel')}</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-3 py-1.5 rounded-lg border border-[#D5D7EE] font-bold text-sm text-[#23265A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            >
              {teachers.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[#F0F2FA]">
            <span className="text-sm font-medium text-[#6B7280]">{t('common_email')}</span>
            <span className="text-sm font-bold text-[#23265A] wrap-anywhere">
              {currentTeacher?.email || '--'}
            </span>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-bold text-[#23265A] mb-2">
              {t('adm_rtp_newPw')}
            </label>
            <input
              type="password"
              required
              placeholder={t('adm_rtp_newPwPh')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
            />
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-sm font-bold text-[#23265A] mb-2">
              {t('adm_rtp_confirmPw')}
            </label>
            <input
              type="password"
              required
              placeholder={t('adm_rtp_confirmPwPh')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
            />
          </div>

          <p className="text-xs text-[#555A8A] leading-relaxed pt-1">
            {t('adm_rtp_note')}
          </p>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto min-h-[44px] border border-[#5458A7] text-[#5458A7] font-bold text-sm px-6 py-2.5 rounded-full hover:bg-[#F3F4FB] transition-all cursor-pointer"
            >
              {t('common_cancel')}
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] bg-[#5458A7] text-white font-bold text-sm px-6 py-2.5 rounded-full hover:opacity-95 shadow-sm transition-all cursor-pointer"
            >
              {t('adm_rtp_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
