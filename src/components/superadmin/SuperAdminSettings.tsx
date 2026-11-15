import React, { useState } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';

interface SuperAdminSettingsProps {
  onShowToast: (msg: string) => void;
}

export const SuperAdminSettings: React.FC<SuperAdminSettingsProps> = ({ onShowToast }) => {
  const { t } = useLanguage();
  const currentSettings = storage.getSettings();

  const [mobileMoneyNumber, setMobileMoneyNumber] = useState(currentSettings.mobileMoneyNumber);
  const [mobileMoneyProvider] = useState(currentSettings.mobileMoneyProvider);
  const [bankName, setBankName] = useState(currentSettings.bankName);
  const [accountName, setAccountName] = useState(currentSettings.accountName);
  const [accountNumber, setAccountNumber] = useState(currentSettings.accountNumber);
  const [bankBranch, setBankBranch] = useState(currentSettings.bankBranch);
  const [contactEmail, setContactEmail] = useState(currentSettings.contactEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storage.updateSettings({
        mobileMoneyNumber,
        mobileMoneyProvider,
        bankName,
        accountName,
        accountNumber,
        bankBranch,
        contactEmail,
      });
      onShowToast(t('sa_set_savedToast'));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to save platform settings.');
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title={t('sa_set_title')}
        subtitle={t('sa_set_subtitle')}
      />

      <div className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-8 max-w-2xl bg-white shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mobile Money Details */}
          <div>
            <h3 className="text-base font-extrabold font-sora text-[#23265A] mb-3">
              {t('sa_set_mobileTitle')}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_set_mobileLabel')}
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={mobileMoneyNumber}
                  onChange={(e) => setMobileMoneyNumber(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>
            </div>
          </div>

          {/* Bank Transfer Details */}
          <div className="pt-4 border-t border-[#F0F2FA]">
            <h3 className="text-base font-extrabold font-sora text-[#23265A] mb-3">
              {t('sa_set_bankTitle')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_set_bankName')}
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_set_accountName')}
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_set_accountNumber')}
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_set_branch')}
                </label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Support Email */}
          <div className="pt-4 border-t border-[#F0F2FA]">
            <div>
              <label className="block text-xs font-bold text-[#23265A] mb-1">
                {t('sa_set_contactEmail')}
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] bg-[#5458A7] text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer"
            >
              {t('sa_set_saveBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
