import React from 'react';
import { Header } from '../common/Header';
import { StatCard } from '../common/StatCard';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';
import { Building2, UserCheck, BarChart3, ArrowRight } from 'lucide-react';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateTab }) => {
  const { t, tPlanText } = useLanguage();
  const schools = storage.getSchools();
  const plans = storage.getPlans();

  const activeSchools = schools.filter((s) => s.status === 'active');
  const pendingSchools = schools.filter((s) => s.status === 'pending');
  const suspendedSchools = schools.filter((s) => s.status === 'suspended');

  // Total MRR
  const mrr = activeSchools.reduce((acc, s) => {
    const plan = plans.find((p) => p.id === s.planId);
    return acc + (plan?.price || 0);
  }, 0);

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <Header
        title={t('sa_dash_title')}
        subtitle={t('sa_dash_subtitle')}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 min-[370px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard label={t('sa_dash_totalSchools')} value={schools.length} />
        <StatCard label={t('sa_dash_activeSchools')} value={activeSchools.length} highlight />
        <StatCard label={t('sa_dash_pendingApprovals')} value={pendingSchools.length} />
        <StatCard label={t('sa_dash_estimatedMrr')} value={`$${mrr.toFixed(2)}`} />
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <button
          type="button"
          onClick={() => onNavigateTab('super_approvals')}
          className="border border-[#E4E6F3] rounded-[22px] p-5 sm:p-6 bg-white hover:border-[#5458A7] transition-all text-start shadow-xs flex items-center justify-between gap-3 group cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EEEEF8] text-[#5458A7] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <UserCheck size={22} />
            </div>
            <div className="min-w-0">
              <div className="font-bold font-sora text-sm sm:text-base text-[#23265A] truncate">
                {t('sa_dash_reviewApprovals')}
              </div>
              <div className="text-xs text-[#6B7280] wrap-anywhere">
                {t('sa_dash_pendingReqCount', { count: pendingSchools.length })}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5458A7] shrink-0">
            <span>{t('common_view')}</span>
            <ArrowRight size={13} className="rtl:rotate-180" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('super_schools')}
          className="border border-[#E4E6F3] rounded-[22px] p-5 sm:p-6 bg-white hover:border-[#5458A7] transition-all text-start shadow-xs flex items-center justify-between gap-3 group cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EEEEF8] text-[#5458A7] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Building2 size={22} />
            </div>
            <div className="min-w-0">
              <div className="font-bold font-sora text-sm sm:text-base text-[#23265A] truncate">
                {t('sa_dash_manageSchools')}
              </div>
              <div className="text-xs text-[#6B7280] wrap-anywhere">
                {t('sa_dash_activeSuspended', {
                  active: activeSchools.length,
                  suspended: suspendedSchools.length,
                })}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5458A7] shrink-0">
            <span>{t('common_view')}</span>
            <ArrowRight size={13} className="rtl:rotate-180" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('super_plans')}
          className="border border-[#E4E6F3] rounded-[22px] p-5 sm:p-6 bg-white hover:border-[#5458A7] transition-all text-start shadow-xs flex items-center justify-between gap-3 group cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EEEEF8] text-[#5458A7] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <BarChart3 size={22} />
            </div>
            <div className="min-w-0">
              <div className="font-bold font-sora text-sm sm:text-base text-[#23265A] truncate">
                {t('sa_dash_pricingPlans')}
              </div>
              <div className="text-xs text-[#6B7280] wrap-anywhere">
                {t('sa_dash_configuredPlans', { count: plans.length })}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5458A7] shrink-0">
            <span>{t('common_view')}</span>
            <ArrowRight size={13} className="rtl:rotate-180" />
          </span>
        </button>
      </div>

      {/* Recent Schools Table */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-[#E4E6F3] flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-extrabold font-sora text-[#23265A]">
            {t('sa_dash_recentSchools')}
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab('super_schools')}
            className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-0 text-xs font-bold text-[#5458A7] hover:underline cursor-pointer"
          >
            <span>{t('sa_dash_viewAllSchools')}</span>
            <ArrowRight size={13} className="rtl:rotate-180" />
          </button>
        </div>

        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {schools.slice(0, 5).map((s) => (
            <div key={s.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                    {s.name}
                  </div>
                  <div dir="ltr" className="text-xs text-[#555A8A] wrap-anywhere ltr-inline mt-0.5">
                    {s.email}
                  </div>
                </div>
                <StatusChip label={s.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[#6B7280] block">{t('sa_dash_col_plan')}</span>
                  <span className="font-semibold text-[#23265A]">{tPlanText(s.planName)}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">{t('sa_dash_col_paidUntil')}</span>
                  <span dir="ltr" className="font-semibold text-[#23265A] ltr-inline">{s.paidUntil || '--'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop & Tablet Table (>=640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="bg-[#FAFBFD] text-[#5458A7] font-semibold text-xs border-b border-[#E4E6F3]">
              <tr>
                <th className="py-3 px-6 sticky start-0 bg-[#FAFBFD] z-10">{t('sa_dash_col_schoolName')}</th>
                <th className="py-3 px-6">{t('sa_dash_col_adminEmail')}</th>
                <th className="py-3 px-6">{t('sa_dash_col_plan')}</th>
                <th className="py-3 px-6">{t('sa_dash_col_paidUntil')}</th>
                <th className="py-3 px-6">{t('common_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {schools.slice(0, 5).map((s) => (
                <tr key={s.id} className="hover:bg-[#F9FAFE]">
                  <td className="py-3.5 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                    {s.name}
                  </td>
                  <td className="py-3.5 px-6 text-[#555A8A]">
                    <span dir="ltr" className="ltr-inline">{s.email}</span>
                  </td>
                  <td className="py-3.5 px-6 font-medium">{tPlanText(s.planName)}</td>
                  <td className="py-3.5 px-6 text-xs">
                    <span dir="ltr" className="ltr-inline">{s.paidUntil || '--'}</span>
                  </td>
                  <td className="py-3.5 px-6">
                    <StatusChip label={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
