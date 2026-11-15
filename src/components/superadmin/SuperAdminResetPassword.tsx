import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { School } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface SuperAdminResetPasswordProps {
  initialSchool?: School | null;
  onCancel: () => void;
  onShowToast: (msg: string) => void;
}

export const SuperAdminResetPassword: React.FC<SuperAdminResetPasswordProps> = ({
  initialSchool,
  onCancel,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const schools = storage.getSchools();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    initialSchool?.id || schools[0]?.id || ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const currentSchool = schools.find((s) => s.id === selectedSchoolId) || schools[0];
  const adminUser = currentSchool?.adminUserId
    ? storage.getUserById(currentSchool.adminUserId)
    : undefined;

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError(t('sa_rp_errLen'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('sa_rp_errMismatch'));
      return;
    }
    if (!currentSchool) {
      setError(t('sa_rp_errNoAdmin'));
      return;
    }

    try {
      await storage.updateSchoolAdminPassword(currentSchool.id, adminUser?.id, newPassword);
      onShowToast(t('sa_rp_success', { name: currentSchool.name }));
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sa_rp_errNoAdmin'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('sa_rp_title')}
        searchPlaceholder={t('sa_sch_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Helper Pill Badge */}
      <div>
        <div className="inline-block max-w-full bg-[#EEEEF8] text-[#5458A7] text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-2xl sm:rounded-full shadow-xs wrap-anywhere">
          {t('sa_rp_badge')}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-8 max-w-xl bg-white shadow-xs">
        <h2 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A] mb-5 sm:mb-6">
          {t('sa_rp_cardTitle')}
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium wrap-anywhere">
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-5 sm:space-y-6">
          {/* School Name */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[#F0F2FA]">
            <span className="text-sm font-medium text-[#6B7280]">{t('sa_rp_selectSchool')}</span>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] px-3 py-1.5 rounded-lg border border-[#D5D7EE] font-bold text-sm text-[#23265A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Email */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[#F0F2FA]">
            <span className="text-sm font-medium text-[#6B7280]">{t('sa_rp_adminEmail')}</span>
            <span className="text-sm font-bold text-[#23265A] ltr-inline wrap-anywhere">
              {adminUser?.email || currentSchool?.email || 'admin@school.com'}
            </span>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-bold text-[#23265A] mb-2">
              {t('sa_rp_newPassword')}
            </label>
            <input
              type="password"
              required
              dir="ltr"
              placeholder={t('sa_rp_newPwPh')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
            />
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-bold text-[#23265A] mb-2">
              {t('sa_rp_confirmPassword')}
            </label>
            <input
              type="password"
              required
              dir="ltr"
              placeholder={t('sa_rp_confirmPwPh')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl border border-[#D5D7EE] bg-white text-[#23265A] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20 focus:border-[#5458A7]"
            />
          </div>

          <p className="text-xs text-[#555A8A] leading-relaxed pt-1">
            {t('sa_rp_note')}
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
              {t('sa_rp_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
