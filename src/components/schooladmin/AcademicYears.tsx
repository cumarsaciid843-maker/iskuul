import React, { useState } from 'react';
import { Header } from '../common/Header';
import { StatusChip } from '../common/StatusChip';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AcademicYear } from '../../types';
import { FileSpreadsheet, CheckCircle2, Eye } from 'lucide-react';
import { excelService } from '../../services/excelService';

interface AcademicYearsProps {
  onShowToast: (msg: string) => void;
}

export const AcademicYears: React.FC<AcademicYearsProps> = ({ onShowToast }) => {
  const { school, selectedAcademicYear, setSelectedAcademicYearId } = useAuth();
  const { t, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';

  const academicYears = storage.getAcademicYearsChronological(schoolId);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Closed'>('Active');

  const filteredYears = academicYears.filter((ay) =>
    ay.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setName('2026 - 2027');
    setStartDate('2026-09-01');
    setEndDate('2027-06-30');
    setStatus('Active');
    setShowAddModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await storage.addAcademicYear(schoolId, name.trim(), startDate, endDate, status);
      setShowAddModal(false);
      onShowToast(t('adm_ay_createdToast', { name: created.name }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to create academic year.');
    }
  };

  const handleOpenEdit = (ay: AcademicYear) => {
    setEditingYear(ay);
    setName(ay.name);
    setStartDate(ay.startDate);
    setEndDate(ay.endDate);
    setStatus(ay.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    try {
      await storage.updateAcademicYear(editingYear.id, schoolId, {
        name: name.trim(),
        startDate,
        endDate,
        status,
      });
      setEditingYear(null);
      onShowToast(t('adm_ay_updatedToast', { name }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to update academic year.');
    }
  };

  const handleActivate = async (ay: AcademicYear) => {
    try {
      await storage.activateAcademicYear(schoolId, ay.id);
      onShowToast(t('adm_ay_activatedToast', { name: ay.name }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to activate academic year.');
    }
  };

  const handleSwitchView = (ay: AcademicYear) => {
    setSelectedAcademicYearId(ay.id);
    onShowToast(
      ay.status === 'Active'
        ? t('adm_ay_viewActiveToast', { name: ay.name })
        : t('adm_ay_viewHistToast', { name: ay.name })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title={t('adm_ay_title')}
        subtitle={t('adm_ay_subtitle')}
        searchPlaceholder={t('adm_ay_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {filteredYears.length !== academicYears.length && (
              <button
                onClick={() => {
                  const res = excelService.exportAcademicYears(schoolId, filteredYears, 'Filtered');
                  onShowToast(
                    res.success
                      ? t('adm_exportedFilteredToast', { count: res.count ?? 0 })
                      : (res.error ? tServiceMsg(res.error) : t('adm_exportFail'))
                  );
                }}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 border border-[#5458A7]/40 bg-[#EEEEF8] text-[#5458A7] px-4 py-2.5 rounded-full font-bold text-xs hover:bg-[#E2E4F4] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_exportFiltered', { count: filteredYears.length })}</span>
              </button>
            )}
            <button
              onClick={() => {
                const res = excelService.exportAcademicYears(schoolId, undefined, 'All');
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
              className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer inline-flex items-center"
            >
              {t('adm_ay_createBtn')}
            </button>
          </div>
        }
      />

      {/* Academic Years Table / Mobile Cards */}
      <div className="border border-[#E4E6F3] rounded-[24px] bg-white overflow-hidden shadow-xs">
        {/* Mobile Stacked Cards (<640px) */}
        <div className="sm:hidden divide-y divide-[#E4E6F3]">
          {filteredYears.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-[#6B7280]">
              {t('adm_ay_empty')}
            </div>
          ) : (
            filteredYears.map((ay) => {
              const isViewing = selectedAcademicYear?.id === ay.id;
              const yearStudents = storage.getStudents(schoolId, ay.id).length;
              const yearFeeStats = storage.getSchoolFeeStats(schoolId, ay.id);
              const yearAttendance = storage.getSchoolAttendanceSummary(schoolId, ay.id);
              return (
                <div key={ay.id} className={`p-4 space-y-3 ${isViewing ? 'bg-[#F6F7FD]' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold font-sora text-sm text-[#23265A]">{ay.name}</span>
                        {isViewing && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5458A7] text-white">
                            {t('adm_ay_viewingNow')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#555A8A] mt-0.5">{ay.startDate} → {ay.endDate}</div>
                    </div>
                    <StatusChip label={ay.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#F8F9FE] rounded-xl p-2.5 text-center">
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_ay_col_students')}</span>
                      <span className="font-bold text-[#23265A]">{yearStudents}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_ay_col_collected')}</span>
                      <span className="font-bold text-emerald-700">${yearFeeStats.collected.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6B7280]">{t('adm_ay_col_attendance')}</span>
                      <span className="font-semibold text-[#555A8A]">{yearAttendance.percentage}%</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isViewing && (
                      <button
                        onClick={() => handleSwitchView(ay)}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1 border border-[#D5D7EE] text-[#23265A] px-3.5 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>{ay.status === 'Active' ? t('common_view') : t('adm_ay_viewHistory')}</span>
                      </button>
                    )}
                    {ay.status !== 'Active' && (
                      <button
                        onClick={() => handleActivate(ay)}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-full font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={12} />
                        <span>{t('adm_ay_activate')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(ay)}
                      className="flex-1 min-h-[44px] border border-[#5458A7] text-[#5458A7] px-4 py-2 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                    >
                      {t('common_edit')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-start text-sm text-[#23265A]">
            <thead className="border-b border-[#E4E6F3] bg-white text-[#5458A7] font-semibold text-xs font-manrope">
              <tr>
                <th className="py-4 px-6 text-start sticky start-0 bg-white z-10">{t('adm_ay_col_name')}</th>
                <th className="py-4 px-6 text-start">{t('adm_ay_col_dates')}</th>
                <th className="py-4 px-6 text-start">{t('adm_ay_col_students')}</th>
                <th className="py-4 px-6 text-start">{t('adm_ay_col_collected')}</th>
                <th className="py-4 px-6 text-start">{t('adm_ay_col_attendance')}</th>
                <th className="py-4 px-6 text-start">{t('common_status')}</th>
                <th className="py-4 px-6 text-end">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6F3]">
              {filteredYears.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                    {t('adm_ay_empty')}
                  </td>
                </tr>
              ) : (
                filteredYears.map((ay) => {
                  const isViewing = selectedAcademicYear?.id === ay.id;
                  const yearStudents = storage.getStudents(schoolId, ay.id).length;
                  const yearFeeStats = storage.getSchoolFeeStats(schoolId, ay.id);
                  const yearAttendance = storage.getSchoolAttendanceSummary(schoolId, ay.id);

                  return (
                    <tr
                      key={ay.id}
                      className={`hover:bg-[#F9FAFE] transition-colors ${isViewing ? 'bg-[#F6F7FD]' : ''}`}
                    >
                      <td className={`py-4 px-6 sticky start-0 ${isViewing ? 'bg-[#F6F7FD]' : 'bg-white'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-sora text-[#23265A]">{ay.name}</span>
                          {isViewing && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5458A7] text-white">
                              {t('adm_ay_viewingNow')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#555A8A] font-medium whitespace-nowrap">
                        {ay.startDate} → {ay.endDate}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#23265A]">{yearStudents}</td>
                      <td className="py-4 px-6 font-bold text-emerald-700">
                        ${yearFeeStats.collected.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-[#555A8A]">
                        {t('adm_ay_attSummary', {
                          total: yearAttendance.total,
                          pct: yearAttendance.percentage,
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <StatusChip label={ay.status} />
                      </td>
                      <td className="py-4 px-6 text-end">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {!isViewing && (
                            <button
                              onClick={() => handleSwitchView(ay)}
                              className="inline-flex items-center gap-1 border border-[#D5D7EE] text-[#23265A] px-3.5 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                            >
                              <Eye size={12} />
                              <span>{ay.status === 'Active' ? t('common_view') : t('adm_ay_viewHistory')}</span>
                            </button>
                          )}
                          {ay.status !== 'Active' && (
                            <button
                              onClick={() => handleActivate(ay)}
                              className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer"
                            >
                              <CheckCircle2 size={12} />
                              <span>{t('adm_ay_activate')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(ay)}
                            className="border border-[#5458A7] text-[#5458A7] px-4 py-1.5 rounded-full font-bold text-xs hover:bg-[#F3F4FB] transition-all cursor-pointer"
                          >
                            {t('common_edit')}
                          </button>
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

      {/* Add / Edit Academic Year Modal */}
      {(showAddModal || editingYear) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 className="text-xl font-extrabold font-sora text-[#23265A] mb-2">
              {editingYear ? t('adm_ay_modalEditTitle') : t('adm_ay_modalCreateTitle')}
            </h3>
            {!editingYear && (
              <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">
                {t('adm_ay_resetFinanceNote')}
              </p>
            )}

            <form
              onSubmit={editingYear ? handleSaveEdit : handleSaveAdd}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('adm_ay_nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('adm_ay_namePh')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_ay_startLabel')}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_ay_endLabel')}
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('common_status')}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Closed')}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                >
                  <option value="Active">{t('adm_ay_activeOpt')}</option>
                  <option value="Closed">{t('common_closed')}</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingYear(null);
                  }}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB]"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95"
                >
                  {t('common_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
