import React, { useState } from 'react';
import { Header } from '../common/Header';
import {
  Users,
  Clock,
  CircleDollarSign,
  Monitor,
  FileSpreadsheet,
  Database,
  AlertTriangle,
  Receipt,
  Layers,
  History,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { excelService } from '../../services/excelService';

interface ReportsPageProps {
  onShowToast: (msg: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onShowToast }) => {
  const { school, selectedAcademicYear } = useAuth();
  const { t, tStatus, tMethod, tShift, tMonth, tServiceMsg } = useLanguage();
  const schoolId = school?.id || '';
  const ayId = selectedAcademicYear?.id;
  const ayName = selectedAcademicYear?.name || t('adm_currentYearFallback');
  const calYear = storage.getCalendarYearForAcademicYear(selectedAcademicYear || undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAttModal, setShowAttModal] = useState(false);
  const [attClassId, setAttClassId] = useState('all');
  const [attFromDate, setAttFromDate] = useState(`${calYear}-01-01`);
  const [attToDate, setAttToDate] = useState(new Date().toISOString().split('T')[0]);

  const classes = storage.getClasses(schoolId, ayId);
  const students = storage.getStudents(schoolId, ayId);

  // 1. Students Report Download
  const handleDownloadStudentsReport = () => {
    const headers = [
      t('common_year'),
      t('adm_unp_col_id'),
      t('adm_reg_fullName'),
      t('common_class'),
      t('common_shift'),
      `${t('adm_rp_monthlyFee')} ($)`,
      t('adm_reg_guardianName'),
      t('adm_unp_col_phone'),
      t('common_address'),
      t('adm_sp_regDate'),
      t('adm_reg_enrollStatus'),
    ];

    const rows = students.map((s) => {
      const cName = classes.find((c) => c.id === s.classId)?.name || t('common_unassigned');
      return [
        ayName,
        s.studentIdNumber,
        s.name,
        cName,
        tShift(s.shift),
        s.monthlyFee.toFixed(2),
        s.guardianName,
        s.guardianPhone,
        s.guardianAddress || '',
        s.registrationDate,
        tStatus(s.enrollmentStatus),
      ];
    });

    storage.generateCSV(
      `students_report_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 2. Attendance Report Download
  const handleDownloadAttendanceReport = () => {
    const history = storage.getAttendanceHistory(
      schoolId,
      attClassId,
      attFromDate,
      attToDate,
      ayId
    );

    const headers = [
      t('common_year'),
      t('common_date'),
      t('common_class'),
      t('adm_att_present'),
      t('adm_att_absent'),
      t('adm_att_late'),
      t('common_total'),
    ];

    const rows = history.map((h) => {
      const cName = classes.find((c) => c.id === h.classId)?.name || t('common_class');
      return [ayName, h.date, cName, h.present, h.absent, h.late, h.total];
    });

    storage.generateCSV(
      `attendance_report_${ayName.replace(/\s+/g, '')}_${attFromDate}_to_${attToDate}.csv`,
      headers,
      rows
    );
    setShowAttModal(false);
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 3. Fees Report Download
  const handleDownloadFeesReport = () => {
    const headers = [
      t('common_year'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      t('common_class'),
      `${t('adm_rp_monthlyFee')} ($)`,
      `${t('adm_fee_statBilled')} ($)`,
      `${t('adm_fee_statCollected')} ($)`,
      `${t('adm_fee_col_balance')} ($)`,
      `${t('adm_unp_col_priorDebt')} ($)`,
      `${t('adm_unp_col_combinedDue')} ($)`,
      t('common_status'),
    ];

    const rows = students.map((s) => {
      const cName = classes.find((c) => c.id === s.classId)?.name || t('common_unassigned');
      const feeSummary = storage.getStudentFeeSummary(schoolId, s.id, ayId);
      return [
        ayName,
        s.studentIdNumber,
        s.name,
        cName,
        s.monthlyFee.toFixed(2),
        feeSummary.totalBilled.toFixed(2),
        feeSummary.totalPaid.toFixed(2),
        feeSummary.balance.toFixed(2),
        (feeSummary.previousYearsOutstanding || 0).toFixed(2),
        (feeSummary.combinedBalance ?? feeSummary.balance).toFixed(2),
        tStatus(feeSummary.status),
      ];
    });

    storage.generateCSV(
      `fees_report_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 4. Class Report Download
  const handleDownloadClassReport = () => {
    const headers = [
      t('common_year'),
      t('common_class'),
      t('adm_cls_teacherLabel'),
      t('common_email'),
      t('common_students'),
    ];

    const rows = classes.map((c) => {
      const teacher = c.teacherId ? storage.getTeacherById(c.teacherId, ayId) : undefined;
      const studentCount = students.filter((s) => s.classId === c.id).length;
      return [
        ayName,
        c.name,
        teacher?.name || t('common_unassigned'),
        teacher?.email || '--',
        studentCount,
      ];
    });

    storage.generateCSV(
      `class_roster_report_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 5. Previous Year Outstanding Debts CSV
  const handleDownloadPrevDebtsCSV = () => {
    const items = storage.getUnpaidStudentsList(schoolId, {
      academicYearId: ayId,
      debtScope: 'previous_year',
    });
    const headers = [
      t('common_year'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      t('common_class'),
      t('adm_unp_col_phone'),
      `${t('adm_unp_col_priorDebt')} ($)`,
      t('adm_rp_prevYearsDebt'),
    ];
    const rows = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianPhone,
      item.previousYearDebt.toFixed(2),
      item.previousYearBreakdown.map((d) => `${d.academicYearName}: $${d.outstandingBalance.toFixed(2)}`).join(' | '),
    ]);
    storage.generateCSV(`previous_year_debts_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 6. Current Year Outstanding Fees CSV
  const handleDownloadCurrentYearOutstandingCSV = () => {
    const items = storage.getUnpaidStudentsList(schoolId, {
      academicYearId: ayId,
      debtScope: 'current_year',
    });
    const headers = [
      t('common_year'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      t('common_class'),
      `${t('adm_unp_col_currPaid')} ($)`,
      `${t('adm_unp_col_currDue')} ($)`,
      t('adm_unp_col_dueMonths'),
      t('common_status'),
    ];
    const rows = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.amountPaid.toFixed(2),
      item.remainingBalance.toFixed(2),
      item.dueMonthsList.map((m) => tMonth(m)).join('; '),
      tStatus(item.status),
    ]);
    storage.generateCSV(`current_year_outstanding_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 7. Combined Outstanding Debts CSV
  const handleDownloadCombinedDebtsCSV = () => {
    const items = storage.getUnpaidStudentsList(schoolId, {
      academicYearId: ayId,
      debtScope: 'all',
    });
    const headers = [
      t('common_year'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      t('common_class'),
      `${t('adm_unp_col_priorDebt')} ($)`,
      `${t('adm_unp_col_currDue')} ($)`,
      `${t('adm_unp_col_combinedDue')} ($)`,
      t('common_status'),
    ];
    const rows = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.previousYearDebt.toFixed(2),
      item.remainingBalance.toFixed(2),
      item.combinedBalance.toFixed(2),
      tStatus(item.status),
    ]);
    storage.generateCSV(`combined_outstanding_debts_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  // 8. Academic Year Payment History CSV
  const handleDownloadYearPaymentsCSV = () => {
    const payments = storage.getFeePayments(schoolId, ayId);
    const allBase = storage.getAllBaseStudents(schoolId);
    const headers = [
      t('common_year'),
      t('adm_sp_col_receiptId'),
      t('common_date'),
      t('adm_unp_col_id'),
      t('adm_unp_col_name'),
      `${t('adm_ph_col_amount')} ($)`,
      t('adm_ph_col_method'),
      t('adm_sp_col_monthsCovered'),
      t('common_status'),
    ];
    const rows = payments.map((p) => {
      const s = allBase.find((st) => st.id === p.studentId);
      return [
        ayName,
        p.id,
        p.date,
        s?.studentIdNumber || p.studentId,
        s?.name || t('common_student'),
        p.amount.toFixed(2),
        tMethod(p.method),
        p.monthsCovered.map((m) => tMonth(m)).join(', '),
        p.isVoided ? tStatus('VOIDED') : tStatus('VALID'),
      ];
    });
    storage.generateCSV(`payment_history_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    onShowToast(t('adm_rep_csvSuccessToast'));
  };

  const handleExcelAttendance = () => {
    const res = excelService.exportAttendance(
      schoolId,
      attClassId !== 'all' ? attClassId : undefined,
      attFromDate,
      attToDate,
      { academicYearId: ayId }
    );
    setShowAttModal(false);
    onShowToast(
      res.success
        ? t('adm_exportedAllToast', { count: res.count ?? 0 })
        : tServiceMsg(res.error) || t('adm_exportFail')
    );
  };

  const handleExportAll = () => {
    const res = excelService.exportAllSystemData(schoolId, school?.name, ayId);
    onShowToast(
      res.success
        ? t('adm_dash_exportAllSuccess', { filename: res.filename || '' })
        : tServiceMsg(res.error) || t('adm_exportFail')
    );
  };

  const allReports = [
    {
      id: 'students',
      title: t('adm_rep_studentsTitle'),
      description: t('adm_rep_studentsDesc', { year: ayName }),
      icon: Users,
      excelAction: () => {
        const res = excelService.exportStudents(schoolId, undefined, 'All', ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadStudentsReport,
    },
    {
      id: 'attendance',
      title: t('adm_rep_attTitle'),
      description: t('adm_rep_attDesc', { year: ayName }),
      icon: Clock,
      excelAction: () => setShowAttModal(true),
      csvAction: () => setShowAttModal(true),
    },
    {
      id: 'fees',
      title: t('adm_rep_feesTitle'),
      description: t('adm_rep_feesDesc', { year: ayName }),
      icon: CircleDollarSign,
      excelAction: () => {
        const res = excelService.exportFeeManagement(schoolId, undefined, 'All', ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadFeesReport,
    },
    {
      id: 'classes',
      title: t('adm_rep_classesTitle'),
      description: t('adm_rep_classesDesc', { year: ayName }),
      icon: Monitor,
      excelAction: () => {
        const res = excelService.exportClasses(schoolId, undefined, 'All', ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadClassReport,
    },
    {
      id: 'prev_debts',
      title: t('adm_rep_prevDebtsTitle'),
      description: t('adm_rep_prevDebtsDesc', { year: ayName }),
      icon: History,
      excelAction: () => {
        const res = excelService.exportPreviousYearDebtsReport(schoolId, ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadPrevDebtsCSV,
    },
    {
      id: 'current_outstanding',
      title: t('adm_rep_currOutTitle'),
      description: t('adm_rep_currOutDesc', { year: ayName }),
      icon: AlertTriangle,
      excelAction: () => {
        const res = excelService.exportCurrentYearOutstandingReport(schoolId, ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadCurrentYearOutstandingCSV,
    },
    {
      id: 'combined_debts',
      title: t('adm_rep_combinedTitle'),
      description: t('adm_rep_combinedDesc', { year: ayName }),
      icon: Layers,
      excelAction: () => {
        const res = excelService.exportCombinedDebtsReport(schoolId, ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadCombinedDebtsCSV,
    },
    {
      id: 'year_payments',
      title: t('adm_rep_yearPayTitle'),
      description: t('adm_rep_yearPayDesc', { year: ayName }),
      icon: Receipt,
      excelAction: () => {
        const res = excelService.exportAcademicYearPaymentsReport(schoolId, ayId);
        onShowToast(
          res.success
            ? t('adm_exportedAllToast', { count: res.count ?? 0 })
            : tServiceMsg(res.error) || t('adm_exportFail')
        );
      },
      csvAction: handleDownloadYearPaymentsCSV,
    },
  ];

  const filteredReports = allReports.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <Header
        title={t('adm_rep_title')}
        subtitle={t('adm_rep_subAy', { year: ayName })}
        searchPlaceholder={t('adm_rep_searchPh')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <button
            onClick={handleExportAll}
            className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white px-5 py-2.5 rounded-full font-bold text-xs hover:opacity-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            title={t('adm_dash_exportAllTooltip')}
          >
            <FileSpreadsheet size={16} />
            <span>{t('adm_rep_exportAllBtn')}</span>
          </button>
        }
      />

      {/* Featured Global System Export Banner */}
      <div className="border border-[#5458A7]/30 bg-gradient-to-r from-[#EEEEF8] to-[#F5F6FC] rounded-[24px] p-5 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#5458A7] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Database size={26} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                {t('adm_rep_globalTitle')}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5458A7] text-white">
                {t('adm_rep_globalBadge')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#555A8A] font-manrope mt-1 max-w-2xl">
              {t('adm_rep_globalDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportAll}
          className="w-full md:w-auto justify-center min-h-[44px] lg:min-h-0 shrink-0 bg-[#5458A7] text-white px-6 py-3 rounded-full font-bold text-xs hover:opacity-95 shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet size={16} />
          <span>{t('adm_rep_exportAllDataBtn')}</span>
        </button>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {filteredReports.map((report) => {
          const IconComp = report.icon;
          return (
            <div
              key={report.id}
              className="border border-[#E4E6F3] rounded-[24px] p-5 sm:p-7 bg-white shadow-xs flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#5458A7] text-white flex items-center justify-center">
                  <IconComp size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-sora text-[#23265A]">
                    {report.title}
                  </h3>
                  <p className="text-sm text-[#555A8A] mt-1">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  onClick={report.excelAction}
                  className="flex-1 min-h-[44px] lg:min-h-0 bg-[#5458A7] text-white py-2.5 px-4 rounded-full font-bold text-xs hover:opacity-95 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title={t('adm_rep_downloadExcelBtn')}
                >
                  <FileSpreadsheet size={15} />
                  <span>{t('adm_rep_downloadExcelBtn')}</span>
                </button>
                <button
                  onClick={report.csvAction}
                  className="min-h-[44px] lg:min-h-0 px-4 py-2.5 rounded-full border border-[#D5D7EE] font-bold text-xs text-[#555A8A] hover:bg-[#F3F4FB] transition-all cursor-pointer"
                  title={t('adm_rep_downloadCsvBtn')}
                >
                  {t('adm_rep_csvBtn')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Range Filter Modal */}
      {showAttModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-5 sm:p-8 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-xl font-extrabold font-sora text-[#23265A]">
              {t('adm_rep_attModalTitle')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('common_class')}
                </label>
                <select
                  value={attClassId}
                  onChange={(e) => setAttClassId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                >
                  <option value="all">{t('adm_stu_filterClass')}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_ah_fromDate')}
                  </label>
                  <input
                    type="date"
                    value={attFromDate}
                    onChange={(e) => setAttFromDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('adm_ah_toDate')}
                  </label>
                  <input
                    type="date"
                    value={attToDate}
                    onChange={(e) => setAttToDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D5D7EE] text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAttModal(false)}
                className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB]"
              >
                {t('common_cancel')}
              </button>
              <button
                type="button"
                onClick={handleExcelAttendance}
                className="w-full sm:w-auto justify-center min-h-[44px] lg:min-h-0 px-5 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{t('adm_rep_downloadExcelBtn')}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadAttendanceReport}
                className="w-full sm:w-auto min-h-[44px] lg:min-h-0 px-5 py-2 rounded-full border border-[#D5D7EE] text-[#555A8A] text-xs font-bold hover:bg-[#F3F4FB] cursor-pointer"
              >
                {t('adm_rep_downloadCsvBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
