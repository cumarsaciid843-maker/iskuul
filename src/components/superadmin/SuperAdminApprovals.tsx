import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatCard } from '../common/StatCard';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';

interface SuperAdminApprovalsProps {
  onShowToast: (msg: string) => void;
}

export const SuperAdminApprovals: React.FC<SuperAdminApprovalsProps> = ({ onShowToast }) => {
  const { t, tMethod, tPlanText, tStatus } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState<any[]>(() => storage.getSchools());

  React.useEffect(() => {
    const unsub = storage.subscribe(() => {
      setSchools(storage.getSchools());
    });
    return unsub;
  }, []);

  const pendingSchools = schools.filter((s) => s.status === 'pending');
  const activeSchools = schools.filter((s) => s.status === 'active');
  const rejectedSchools = schools.filter((s) => s.status === 'rejected');

  const filtered = pendingSchools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (schoolId: string, schoolName: string) => {
    try {
      await storage.approveSchool(schoolId);
      onShowToast(t('sa_app_approvedToast', { name: schoolName }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to approve school.');
    }
  };

  const handleReject = async (schoolId: string, schoolName: string) => {
    try {
      await storage.rejectSchool(schoolId);
      onShowToast(t('sa_app_rejectedToast', { name: schoolName }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to reject school.');
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <Header
        title={t('sa_app_title')}
        searchPlaceholder={t('sa_app_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 min-[370px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        <StatCard label={t('sa_app_pendingCount')} value={pendingSchools.length} />
        <StatCard label={t('sa_app_activeCount')} value={activeSchools.length} />
        <StatCard label={t('sa_app_rejectedCount')} value={rejectedSchools.length} />
      </div>

      {/* Table / Mobile Card Container */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filtered.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-[#6B7280]">
              {pendingSchools.length === 0 ? t('sa_app_emptyAllDone') : t('sa_app_emptySearch')}
            </div>
          ) : (
            filtered.map((school) => (
              <div key={school.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                      {school.name}
                    </div>
                    <div dir="ltr" className="text-xs text-[#555A8A] wrap-anywhere ltr-inline mt-0.5">
                      {school.email}
                    </div>
                  </div>
                  <span className="font-semibold text-[11px] text-[#5458A7] bg-[#EEEEF8] px-2.5 py-1 rounded-full shrink-0">
                    {school.paymentMethod ? tMethod(school.paymentMethod) : tStatus('Paid')}
                  </span>
                </div>
                <div className="text-xs text-[#6B7280]">
                  {t('gs_planLabel')}: <span className="font-bold text-[#23265A]">{tPlanText(school.planName)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApprove(school.id, school.name)}
                    className="min-h-[44px] bg-[#5458A7] text-white px-4 py-2 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all cursor-pointer"
                  >
                    {t('sa_app_approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(school.id, school.name)}
                    className="min-h-[44px] border border-[#5458A7] text-[#5458A7] px-4 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  >
                    {t('sa_app_reject')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tablet/Desktop Table (>=640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6">{t('common_school')}</th>
                <th className="py-4 px-6">{t('common_email')}</th>
                <th className="py-4 px-6">{t('gs_planLabel')}</th>
                <th className="py-4 px-6">{t('sa_app_col_payment')}</th>
                <th className="py-4 px-6 text-end">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                    {pendingSchools.length === 0
                      ? t('sa_app_emptyAllDone')
                      : t('sa_app_emptySearch')}
                  </td>
                </tr>
              ) : (
                filtered.map((school) => (
                  <tr key={school.id} className="hover:bg-[#F9FAFE] transition-colors">
                    <td className="py-4 px-6 font-bold font-sora text-[#23265A]">
                      {school.name}
                    </td>
                    <td className="py-4 px-6 text-[#555A8A]">
                      <span dir="ltr" className="ltr-inline">{school.email}</span>
                    </td>
                    <td className="py-4 px-6 text-[#23265A] font-medium">
                      {tPlanText(school.planName)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-xs text-[#5458A7] bg-[#EEEEF8] px-2.5 py-1 rounded-full">
                        {school.paymentMethod ? tMethod(school.paymentMethod) : tStatus('Paid')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-end">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleApprove(school.id, school.name)}
                          className="bg-[#5458A7] text-white px-5 py-2 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all cursor-pointer"
                        >
                          {t('sa_app_approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(school.id, school.name)}
                          className="border border-[#5458A7] text-[#5458A7] px-5 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                        >
                          {t('sa_app_reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
