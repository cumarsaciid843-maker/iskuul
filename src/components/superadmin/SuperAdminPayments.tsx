import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useLanguage } from '../../context/LanguageContext';

export const SuperAdminPayments: React.FC = () => {
  const { t, tMethod, tPlanText } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const subscriptions = storage.getSubscriptions();
  const schools = storage.getSchools();

  const getSchoolName = (schoolId: string) => {
    return schools.find((s) => s.id === schoolId)?.name || t('sa_pay_unknownSchool');
  };

  const filtered = subscriptions.filter((sub) => {
    const sName = getSchoolName(sub.schoolId).toLowerCase();
    const query = searchTerm.toLowerCase();
    return sName.includes(query) || sub.planName.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      <Header
        title={t('sa_pay_title')}
        searchPlaceholder={t('sa_pay_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        subtitle={t('sa_pay_subtitle')}
      />

      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filtered.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-[#6B7280]">
              {t('sa_pay_empty')}
            </div>
          ) : (
            filtered.map((sub) => (
              <div key={sub.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold font-sora text-sm text-[#23265A] wrap-anywhere">
                      {getSchoolName(sub.schoolId)}
                    </div>
                    <div className="text-xs text-[#555A8A] mt-0.5">
                      {tPlanText(sub.planName)} · {tMethod(sub.paymentMethod)}
                    </div>
                  </div>
                  <StatusChip label={sub.status.toUpperCase()} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[#6B7280] block">{t('sa_pay_col_amount')}</span>
                    <span className="font-bold text-[#23265A] ltr-inline">${sub.amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">{t('sa_pay_col_created')}</span>
                    <span className="text-[#6B7280] ltr-inline">{sub.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">{t('sa_pay_col_paidUntil')}</span>
                    <span className="font-medium text-[#23265A] ltr-inline">{sub.paidUntil || '--'}</span>
                  </div>
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
                <th className="py-4 px-6 sticky start-0 bg-[#FAFBFD] z-10">{t('sa_pay_col_school')}</th>
                <th className="py-4 px-6">{t('sa_pay_col_plan')}</th>
                <th className="py-4 px-6">{t('sa_pay_col_amount')}</th>
                <th className="py-4 px-6">{t('sa_pay_col_method')}</th>
                <th className="py-4 px-6">{t('sa_pay_col_created')}</th>
                <th className="py-4 px-6">{t('sa_pay_col_paidUntil')}</th>
                <th className="py-4 px-6">{t('common_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                    {t('sa_pay_empty')}
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#F9FAFE]">
                    <td className="py-4 px-6 font-bold font-sora text-[#23265A] sticky start-0 bg-white">
                      {getSchoolName(sub.schoolId)}
                    </td>
                    <td className="py-4 px-6 font-medium text-[#555A8A]">
                      {tPlanText(sub.planName)}
                    </td>
                    <td className="py-4 px-6 font-bold text-[#23265A]">
                      <span className="ltr-inline">${sub.amount.toFixed(2)}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#5458A7] font-semibold">
                      {tMethod(sub.paymentMethod)}
                    </td>
                    <td className="py-4 px-6 text-xs text-[#6B7280]">
                      <span className="ltr-inline">{sub.createdAt}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#23265A] font-medium">
                      <span className="ltr-inline">{sub.paidUntil || '--'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <StatusChip label={sub.status.toUpperCase()} />
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
