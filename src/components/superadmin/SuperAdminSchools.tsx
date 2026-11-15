import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';
import { School } from '../../types';

interface SuperAdminSchoolsProps {
  onResetPasswordClick: (school: School) => void;
  onShowToast: (msg: string) => void;
}

export const SuperAdminSchools: React.FC<SuperAdminSchoolsProps> = ({
  onResetPasswordClick,
  onShowToast,
}) => {
  const { t, tMethod, tPlanText } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedSchoolModal, setSelectedSchoolModal] = useState<School | null>(null);

  const [schools, setSchools] = useState<School[]>(() => storage.getSchools());
  const [plans, setPlans] = useState(() => storage.getPlans());

  React.useEffect(() => {
    const unsub = storage.subscribe(() => {
      setSchools(storage.getSchools());
      setPlans(storage.getPlans());
    });
    return unsub;
  }, []);

  const activeCount = schools.filter((s) => s.status === 'active').length;
  const suspendedCount = schools.filter((s) => s.status === 'suspended').length;
  const pendingCount = schools.filter((s) => s.status === 'pending').length;

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : s.status === statusFilter;
    const matchesPlan =
      planFilter === 'all' ? true : s.planName.toLowerCase() === planFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleToggleSuspend = async (school: School) => {
    try {
      if (school.status === 'active') {
        await storage.setSchoolStatus(school.id, 'suspended');
        onShowToast(t('sa_sch_pausedToast', { name: school.name }));
      } else {
        await storage.setSchoolStatus(school.id, 'active');
        onShowToast(t('sa_sch_activatedToast', { name: school.name }));
      }
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to update school status.');
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <Header
        title={t('sa_sch_title')}
        searchPlaceholder={t('sa_sch_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Notice Pill Banner */}
      <div>
        <div className="inline-block max-w-full bg-[#EEEEF8] text-[#5458A7] text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-2xl sm:rounded-full shadow-xs wrap-anywhere">
          {t('sa_sch_notice')}
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 min-[370px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        <StatCard label={t('sa_dash_activeSchools')} value={activeCount} />
        <StatCard label={t('sa_sch_suspendedCount')} value={suspendedCount} />
        <StatCard label={t('sa_sch_pendingCount')} value={pendingCount} />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('sa_sch_allStatus')}</option>
          <option value="active">{t('status_active')}</option>
          <option value="suspended">{t('status_suspended')}</option>
          <option value="pending">{t('status_pending')}</option>
          <option value="rejected">{t('status_rejected')}</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[#D5D7EE] bg-white text-xs font-semibold text-[#23265A] focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
        >
          <option value="all">{t('sa_sch_allPlans')}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.name}>
              {tPlanText(p.name)}
            </option>
          ))}
        </select>
      </div>

      {/* Schools Cards / Table */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredSchools.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-[#6B7280]">
              {t('sa_sch_empty')}
            </div>
          ) : (
            filteredSchools.map((school) => {
              const isSuspended = school.status === 'suspended';
              const statusLabel =
                school.status === 'active'
                  ? 'Active'
                  : isSuspended
                  ? 'Suspended · data kept'
                  : school.status === 'pending'
                  ? 'Pending'
                  : 'Rejected';
              return (
                <div key={school.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                      {school.name}
                    </div>
                    <StatusChip label={statusLabel} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#6B7280] block">{t('gs_planLabel')}</span>
                      <span className="font-semibold text-[#23265A]">{tPlanText(school.planName)}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">{t('sa_sch_col_paidUntil')}</span>
                      <span dir="ltr" className="font-semibold text-[#23265A] ltr-inline">
                        {school.paidUntil || '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolModal(school)}
                      className="flex-1 min-h-[44px] border border-[#5458A7] text-[#5458A7] px-3 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                    >
                      {t('common_view')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetPasswordClick(school)}
                      className="flex-1 min-h-[44px] border border-[#5458A7] text-[#5458A7] px-3 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                    >
                      {t('sa_sch_resetPw')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSuspend(school)}
                      className={`w-full min-h-[44px] px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer ${
                        isSuspended
                          ? 'bg-[#5458A7] text-white hover:opacity-95 shadow-xs'
                          : 'border border-[#5458A7] text-[#5458A7] hover:bg-[#F3F4FB]'
                      }`}
                    >
                      {isSuspended ? t('sa_sch_activate') : t('sa_sch_suspend')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tablet/Desktop Table (>=640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 sticky start-0 bg-white z-10">{t('common_school')}</th>
                <th className="py-4 px-6">{t('gs_planLabel')}</th>
                <th className="py-4 px-6">{t('sa_sch_col_paidUntil')}</th>
                <th className="py-4 px-6">{t('common_status')}</th>
                <th className="py-4 px-6 text-end">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                    {t('sa_sch_empty')}
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => {
                  const isSuspended = school.status === 'suspended';
                  const statusLabel =
                    school.status === 'active'
                      ? 'Active'
                      : isSuspended
                      ? 'Suspended · data kept'
                      : school.status === 'pending'
                      ? 'Pending'
                      : 'Rejected';

                  return (
                    <tr
                      key={school.id}
                      className="hover:bg-[#F9FAFE] transition-colors"
                    >
                      <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                        {school.name}
                      </td>
                      <td className="py-4 px-6 text-[#555A8A] font-medium">
                        {tPlanText(school.planName)}
                      </td>
                      <td className="py-4 px-6 text-[#23265A]">
                        <span dir="ltr" className="ltr-inline">{school.paidUntil || '--'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusChip label={statusLabel} />
                      </td>
                      <td className="py-4 px-6 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSchoolModal(school)}
                            className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                          >
                            {t('common_view')}
                          </button>

                          <button
                            type="button"
                            onClick={() => onResetPasswordClick(school)}
                            className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                          >
                            {t('sa_sch_resetPw')}
                          </button>

                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(school)}
                              className="bg-[#5458A7] text-white px-4 py-1.5 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all cursor-pointer"
                            >
                              {t('sa_sch_activate')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(school)}
                              className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                            >
                              {t('sa_sch_suspend')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View School Details Modal */}
      {selectedSchoolModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-lg w-full p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E6F3] pb-4">
              <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A] wrap-anywhere">
                {selectedSchoolModal.name}
              </h3>
              <StatusChip label={selectedSchoolModal.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('sa_sch_modal_adminEmail')}</span>
                <span dir="ltr" className="font-semibold text-[#23265A] ltr-inline wrap-anywhere">
                  {selectedSchoolModal.email}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('gs_planLabel')}</span>
                <span className="font-semibold text-[#23265A]">
                  {tPlanText(selectedSchoolModal.planName)}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('sa_sch_modal_paidUntil')}</span>
                <span dir="ltr" className="font-semibold text-[#23265A] ltr-inline">
                  {selectedSchoolModal.paidUntil}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('sa_sch_modal_method')}</span>
                <span className="font-semibold text-[#23265A]">
                  {tMethod(selectedSchoolModal.paymentMethod || 'Mobile money')}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('sa_sch_modal_ref')}</span>
                <span dir="ltr" className="font-semibold text-[#23265A] ltr-inline wrap-anywhere">
                  {selectedSchoolModal.paymentReference || 'N/A'}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1 border-b border-[#F0F2FA]">
                <span className="text-[#6B7280]">{t('sa_sch_modal_regOn')}</span>
                <span dir="ltr" className="font-semibold text-[#23265A] ltr-inline">
                  {selectedSchoolModal.registeredAt}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSchoolModal(null)}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full border border-[#D5D7EE] font-bold text-xs text-[#23265A] hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('common_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
