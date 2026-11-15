import * as XLSX from 'xlsx';
import { storage } from './storage';
import {
  Student,
  Teacher,
  ClassRoom,
  Subject,
  FeePayment,
  UnpaidStudentItem,
  AcademicYear,
  UserRole,
} from '../types';

export interface ExcelExportResult {
  success: boolean;
  filename?: string;
  count?: number;
  error?: string;
}

interface SheetDefinition {
  name: string;
  headers: string[];
  data: (string | number | boolean | null | undefined)[][];
}

class ExcelExportService {
  /**
   * Retrieve current authenticated role & user safely
   */
  private getSessionUser() {
    return storage.getCurrentUser();
  }

  private assertAuthorized(allowedRoles: UserRole[], schoolId?: string): string | null {
    const currentUser = this.getSessionUser();
    if (!currentUser) {
      return 'Unauthorized: You must be logged in to export data.';
    }
    if (!allowedRoles.includes(currentUser.role)) {
      return 'Access Denied: Your role does not have permission to export this data.';
    }
    if (
      currentUser.role !== 'super_admin' &&
      schoolId &&
      currentUser.schoolId &&
      currentUser.schoolId !== schoolId
    ) {
      return 'Access Denied: You can only export records belonging to your assigned school.';
    }
    return null;
  }

  /**
   * Write a genuine .xlsx workbook with multiple sheets and auto-fitted column widths
   */
  public generateWorkbook(filename: string, sheets: SheetDefinition[]): ExcelExportResult {
    try {
      const wb = XLSX.utils.book_new();

      sheets.forEach((sheetDef) => {
        // Excel worksheet names must be <= 31 chars and omit \ / * ? [ ] :
        const cleanName = sheetDef.name.substring(0, 31).replace(/[\\/*?[\]:]/g, '_');
        const aoa = [sheetDef.headers, ...sheetDef.data];
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Auto-calculate readable column widths
        const colWidths = sheetDef.headers.map((h, colIdx) => {
          let maxLen = String(h || '').length;
          sheetDef.data.forEach((row) => {
            const val = row[colIdx];
            const len = val !== null && val !== undefined ? String(val).length : 0;
            if (len > maxLen) {
              maxLen = len;
            }
          });
          return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
        });

        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, cleanName);
      });

      const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      XLSX.writeFile(wb, safeFilename);
      const totalRows = sheets.reduce((sum, s) => sum + s.data.length, 0);
      return { success: true, filename: safeFilename, count: totalRows };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to generate Excel workbook.',
      };
    }
  }

  private resolveAcademicYearLabel(schoolId: string, academicYearId?: string): { ayId: string; ayName: string } {
    const ayId = academicYearId || storage.getSelectedAcademicYearId(schoolId);
    const years = storage.getAcademicYears(schoolId);
    const ayName = years.find((y) => y.id === ayId)?.name || 'Current Year';
    return { ayId, ayName };
  }

  /**
   * Export Students Roster (supports full database or filtered selection)
   */
  public exportStudents(
    schoolId: string,
    customStudents?: Student[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const students = customStudents || storage.getStudents(schoolId, ayId);
    const classes = storage.getClasses(schoolId, ayId);
    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Unassigned';

    const headers = [
      'Academic Year',
      'Student ID',
      'Full Name',
      'Class',
      'Shift',
      'Monthly Fee ($)',
      'Fee Starting Date',
      'Registration Date',
      'Guardian Name',
      'Guardian Phone',
      'Guardian Address',
      'Enrollment Status',
      'Fee Payment Status',
      'Current Year Billed ($)',
      'Current Year Paid ($)',
      'Current Year Balance ($)',
      'Previous Year Debt ($)',
      'Total Combined Balance ($)',
    ];

    const data = students.map((s) => {
      const fee = storage.getStudentFeeSummary(schoolId, s.id, ayId);
      return [
        ayName,
        s.studentIdNumber,
        s.name,
        getClassName(s.classId),
        s.shift,
        Number(s.monthlyFee),
        s.feeStartDate || s.registrationDate,
        s.registrationDate,
        s.guardianName,
        s.guardianPhone,
        s.guardianAddress || '',
        s.enrollmentStatus,
        fee.status,
        Number(fee.totalBilled),
        Number(fee.totalPaid),
        Number(fee.balance),
        Number(fee.previousYearsOutstanding || 0),
        Number(fee.combinedBalance ?? fee.balance),
      ];
    });

    const filename = `Students_${ayName.replace(/\s+/g, '')}_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Students', headers, data }]);
    return { ...res, count: students.length };
  }

  /**
   * Export Teachers Directory
   * Strict Security: Never exports passwordHash, tokens, or private credentials
   */
  public exportTeachers(
    schoolId: string,
    customTeachers?: Teacher[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const teachers = customTeachers || storage.getTeachers(schoolId, ayId);
    const classes = storage.getClasses(schoolId, ayId);
    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Class';

    const headers = [
      'Academic Year',
      'Teacher ID',
      'Teacher Full Name',
      'Email Address',
      'Phone Number',
      'Assigned Classes',
      'Subjects Taught',
    ];

    const data = teachers.map((t) => [
      ayName,
      t.id,
      t.name,
      t.email,
      t.phone || '',
      t.assignedClassIds.map(getClassName).join(', '),
      t.subjects.join(', '),
    ]);

    const filename = `Teachers_${ayName.replace(/\s+/g, '')}_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Teachers', headers, data }]);
    return { ...res, count: teachers.length };
  }

  /**
   * Export Classes List
   */
  public exportClasses(
    schoolId: string,
    customClasses?: ClassRoom[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const classes = customClasses || storage.getClasses(schoolId, ayId);
    const teachers = storage.getTeachers(schoolId, ayId);
    const students = storage.getStudents(schoolId, ayId);

    const headers = [
      'Academic Year',
      'Class ID',
      'Class Name',
      'Assigned Class Teacher',
      'Total Enrolled Students',
      'Active Students',
      'Created Date',
    ];

    const data = classes.map((c) => {
      const teacher = teachers.find((t) => t.id === c.teacherId)?.name || 'Unassigned';
      const classStudents = students.filter((s) => s.classId === c.id);
      const activeCount = classStudents.filter((s) => s.enrollmentStatus === 'Active').length;

      return [
        ayName,
        c.id,
        c.name,
        teacher,
        classStudents.length,
        activeCount,
        c.createdAt || '',
      ];
    });

    const filename = `Classes_${ayName.replace(/\s+/g, '')}_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Classes', headers, data }]);
    return { ...res, count: classes.length };
  }

  /**
   * Export Subjects
   */
  public exportSubjects(
    schoolId: string,
    customSubjects?: Subject[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const subjects = customSubjects || storage.getSubjects(schoolId, ayId);
    const classes = storage.getClasses(schoolId, ayId);
    const teachers = storage.getTeachers(schoolId, ayId);

    const headers = ['Academic Year', 'Subject ID', 'Subject Name', 'Class', 'Teacher'];

    const data = subjects.map((sub) => {
      const cls = classes.find((c) => c.id === sub.classId)?.name || 'Unassigned';
      const tch = teachers.find((t) => t.id === sub.teacherId)?.name || 'Unassigned';
      return [ayName, sub.id, sub.name, cls, tch];
    });

    const filename = `Subjects_${ayName.replace(/\s+/g, '')}_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Subjects', headers, data }]);
    return { ...res, count: subjects.length };
  }

  /**
   * Export Attendance History & Records
   * Supports date range filtering and strict Teacher role scoping (assigned classes only, no private guardian contacts)
   */
  public exportAttendance(
    schoolId: string,
    classId?: string,
    fromDate?: string,
    toDate?: string,
    options?: { allowedClassIds?: string[]; isTeacherMode?: boolean; academicYearId?: string }
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'teacher', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, options?.academicYearId);
    const currentUser = this.getSessionUser();
    const isTeacher = options?.isTeacherMode || currentUser?.role === 'teacher';

    let allowedClassIds = options?.allowedClassIds;
    if (isTeacher && !allowedClassIds && currentUser?.teacherId) {
      allowedClassIds = storage.getTeacherById(currentUser.teacherId, ayId)?.assignedClassIds || [];
    }

    if (isTeacher && classId && classId !== 'all' && !(allowedClassIds || []).includes(classId)) {
      return {
        success: false,
        error: 'Access Denied: You can only export attendance for classes assigned to you.',
      };
    }

    const students = storage.getStudents(schoolId, ayId);
    const classes = storage.getClasses(schoolId, ayId);
    const attendance = storage.getAttendance(schoolId, ayId);

    const getStudent = (sid: string) => students.find((s) => s.id === sid) || storage.getStudentById(sid, ayId);
    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Class';

    const filtered = attendance.filter((a) => {
      if (isTeacher && allowedClassIds && !allowedClassIds.includes(a.classId)) return false;
      if (classId && classId !== 'all' && a.classId !== classId) return false;
      if (fromDate && a.date < fromDate) return false;
      if (toDate && a.date > toDate) return false;
      return true;
    });

    const headers = isTeacher
      ? ['Academic Year', 'Date', 'Class', 'Student ID', 'Student Full Name', 'Attendance Status']
      : ['Academic Year', 'Date', 'Class', 'Student ID', 'Student Full Name', 'Guardian Phone', 'Attendance Status'];

    const data = filtered.map((a) => {
      const s = getStudent(a.studentId);
      if (isTeacher) {
        return [
          ayName,
          a.date,
          getClassName(a.classId),
          s?.studentIdNumber || a.studentId,
          s?.name || 'Student',
          a.status.toUpperCase(),
        ];
      }
      return [
        ayName,
        a.date,
        getClassName(a.classId),
        s?.studentIdNumber || a.studentId,
        s?.name || 'Student',
        s?.guardianPhone || '',
        a.status.toUpperCase(),
      ];
    });

    const dateTag = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate || toDate || 'All';
    const filename = `Attendance_${ayName.replace(/\s+/g, '')}_${dateTag}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Attendance Records', headers, data }]);
    return { ...res, count: filtered.length };
  }

  /**
   * Export Fee Management & Student Billing Summary (Admin only)
   */
  public exportFeeManagement(
    schoolId: string,
    customStudents?: Student[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const students = customStudents || storage.getStudents(schoolId, ayId);
    const classes = storage.getClasses(schoolId, ayId);
    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Class';

    const headers = [
      'Academic Year',
      'Student ID',
      'Student Full Name',
      'Class',
      'Shift',
      'Monthly Fee ($)',
      'Current Year Expected ($)',
      'Current Year Paid ($)',
      'Current Year Balance ($)',
      'Previous Year Outstanding ($)',
      'Total Combined Balance ($)',
      'Months Paid',
      'Unpaid Months',
      'Last Month Paid',
      'Payment Status',
      'Fee Start Date',
    ];

    const data = students.map((s) => {
      const details = storage.getStudentFeeHistoryDetails(schoolId, s.id, ayId);
      return [
        ayName,
        s.studentIdNumber,
        s.name,
        getClassName(s.classId),
        s.shift,
        Number(s.monthlyFee),
        Number(details?.totalFeesExpected || 0),
        Number(details?.totalAmountPaid || 0),
        Number(details?.remainingBalance || 0),
        Number(details?.previousYearsOutstanding || 0),
        Number(details?.combinedOutstandingBalance || 0),
        details?.totalMonthsPaid || 0,
        details?.totalMonthsUnpaid || 0,
        details?.lastMonthPaid || 'None',
        details?.overallStatus || 'Paid',
        details?.feeStartDate || s.feeStartDate || s.registrationDate,
      ];
    });

    const filename = `Fee_Management_${ayName.replace(/\s+/g, '')}_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Fee Management', headers, data }]);
    return { ...res, count: students.length };
  }

  /**
   * Export Payment History (Transactions Ledger - Admin only)
   */
  public exportPaymentHistory(
    schoolId: string,
    customPayments?: FeePayment[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const payments = customPayments || storage.getFeePayments(schoolId, academicYearId || ayId);
    const years = storage.getAcademicYears(schoolId);
    const students = storage.getAllBaseStudents(schoolId);
    const classes = storage.getClasses(schoolId);

    const getStudent = (sid: string) => students.find((s) => s.id === sid);
    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Class';
    const getAyName = (id?: string) => years.find((y) => y.id === id)?.name || ayName;

    const headers = [
      'Receipt ID',
      'Target Academic Year',
      'Payment Date',
      'Student ID',
      'Student Full Name',
      'Class',
      'Amount Received ($)',
      'Payment Method',
      'Months Covered',
      'Note / Reference',
      'Status',
    ];

    const data = payments.map((p) => {
      const s = getStudent(p.studentId);
      return [
        p.id,
        getAyName(p.academicYearId),
        p.date,
        s?.studentIdNumber || p.studentId,
        s?.name || 'Student',
        s ? getClassName(s.classId) : '',
        Number(p.amount),
        p.method,
        p.monthsCovered.join(', '),
        p.note || '',
        p.isVoided ? 'VOIDED' : 'VALID',
      ];
    });

    const filename = `Payment_History_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Payments Ledger', headers, data }]);
    return { ...res, count: payments.length };
  }

  /**
   * Export Unpaid & Outstanding Students List (Admin only)
   */
  public exportUnpaidStudents(
    schoolId: string,
    customItems?: UnpaidStudentItem[],
    filenameSuffix = 'All',
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const items = customItems || storage.getUnpaidStudentsList(schoolId, { academicYearId: ayId });

    const headers = [
      'Academic Year',
      'Student ID',
      'Student Full Name',
      'Class',
      'Guardian Name',
      'Guardian Phone',
      'Monthly Fee ($)',
      'Current Year Paid ($)',
      'Current Year Balance ($)',
      'Previous Year Debt ($)',
      'Total Combined Balance ($)',
      'Due Month(s)',
      'Status',
    ];

    const data = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianName,
      item.guardianPhone,
      Number(item.monthlyFee),
      Number(item.amountPaid),
      Number(item.remainingBalance),
      Number(item.previousYearDebt || 0),
      Number(item.combinedBalance ?? item.remainingBalance),
      item.dueMonthsList.join('; '),
      item.status,
    ]);

    const filename = `Unpaid_Students_${ayName.replace(/\s+/g, '')}_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Unpaid Students', headers, data }]);
    return { ...res, count: items.length };
  }

  /**
   * Report 1: Previous Year Outstanding Debts Report (Admin only)
   */
  public exportPreviousYearDebtsReport(schoolId: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const items = storage.getUnpaidStudentsList(schoolId, {
      academicYearId: ayId,
      debtScope: 'previous_year',
    });

    const headers = [
      'Viewing Year',
      'Student ID',
      'Student Full Name',
      'Class',
      'Guardian Name',
      'Guardian Phone',
      'Source Previous Years',
      'Previous Year Outstanding ($)',
      'Unpaid Prior Months',
    ];

    const data = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianName,
      item.guardianPhone,
      item.previousYearBreakdown.map((d) => `${d.academicYearName}: $${d.outstandingBalance}`).join(' | '),
      Number(item.previousYearDebt),
      item.previousYearBreakdown.flatMap((d) => d.unpaidMonths).join('; '),
    ]);

    const filename = `Previous_Year_Outstanding_Debts_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Previous Year Debts', headers, data }]);
    return { ...res, count: items.length };
  }

  /**
   * Report 2: Current Year Outstanding Fees Report (Admin only)
   */
  public exportCurrentYearOutstandingReport(schoolId: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const items = storage.getUnpaidStudentsList(schoolId, {
      academicYearId: ayId,
      debtScope: 'current_year',
    });

    const headers = [
      'Academic Year',
      'Student ID',
      'Student Full Name',
      'Class',
      'Guardian Name',
      'Guardian Phone',
      'Monthly Fee ($)',
      'Current Year Paid ($)',
      'Current Year Outstanding ($)',
      'Unpaid Months',
      'Status',
    ];

    const data = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianName,
      item.guardianPhone,
      Number(item.monthlyFee),
      Number(item.amountPaid),
      Number(item.remainingBalance),
      item.dueMonthsList.join('; '),
      item.status,
    ]);

    const filename = `Current_Year_Outstanding_Fees_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Current Year Outstanding', headers, data }]);
    return { ...res, count: items.length };
  }

  /**
   * Report 3: Combined Outstanding Student Debts Report (Admin only)
   */
  public exportCombinedDebtsReport(schoolId: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const items = storage.getUnpaidStudentsList(schoolId, {
      academicYearId: ayId,
      debtScope: 'all',
    });

    const headers = [
      'Academic Year',
      'Student ID',
      'Student Full Name',
      'Class',
      'Guardian Phone',
      'Previous Year Debt ($)',
      'Current Year Balance ($)',
      'Total Combined Outstanding ($)',
      'Prior Year Breakdown',
      'Status',
    ];

    const data = items.map((item) => [
      ayName,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianPhone,
      Number(item.previousYearDebt),
      Number(item.remainingBalance),
      Number(item.combinedBalance),
      item.previousYearBreakdown.map((d) => `${d.academicYearName}: $${d.outstandingBalance}`).join(' | ') || 'None',
      item.status,
    ]);

    const filename = `Combined_Outstanding_Debts_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Combined Outstanding Debts', headers, data }]);
    return { ...res, count: items.length };
  }

  /**
   * Report 4: Academic Year Payment History Report (Admin only)
   */
  public exportAcademicYearPaymentsReport(schoolId: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const payments = storage.getFeePayments(schoolId, ayId);
    return this.exportPaymentHistory(schoolId, payments, ayName.replace(/\s+/g, ''), ayId);
  }

  /**
   * Export Monthly Billing Runs (Admin only)
   */
  public exportBillingRuns(schoolId: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const runs = storage.getBillingRuns(schoolId, ayId);
    const headers = [
      'Academic Year',
      'Billing ID',
      'Billing Month',
      'Target Classes',
      'Students Billed',
      'Total Billed ($)',
      'Due Date',
      'Status',
      'Created Date',
    ];
    const data = runs.map((r) => [
      ayName,
      r.id,
      r.month,
      r.classes,
      r.studentsBilledCount,
      Number(r.totalBilledAmount),
      r.dueDate,
      r.status,
      r.createdAt,
    ]);

    const filename = `Monthly_Billing_Runs_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Billing Runs', headers, data }]);
    return { ...res, count: runs.length };
  }

  /**
   * Export Promotion History (Admin only)
   */
  public exportPromotions(schoolId: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const promotions = storage.getPromotions(schoolId, ayId);
    const students = storage.getAllBaseStudents(schoolId);
    const classes = storage.getClasses(schoolId);
    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Class';

    const headers = [
      'Promotion ID',
      'Student ID',
      'Student Name',
      'From Class',
      'To Class',
      'Academic Year',
      'Promoted Date',
    ];
    const data = promotions.map((p) => {
      const s = students.find((st) => st.id === p.studentId);
      return [
        p.id,
        s?.studentIdNumber || p.studentId,
        s?.name || 'Student',
        getClassName(p.fromClassId),
        getClassName(p.toClassId),
        p.academicYear,
        p.promotedAt,
      ];
    });

    const filename = `Student_Promotions_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Promotions', headers, data }]);
    return { ...res, count: promotions.length };
  }

  /**
   * Export Individual Student Complete Fee Statement (Admin only)
   */
  public exportStudentFeeStatement(
    schoolId: string,
    studentId: string,
    academicYearId?: string
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const { ayId } = this.resolveAcademicYearLabel(schoolId, academicYearId);
    const details = storage.getStudentFeeHistoryDetails(schoolId, studentId, ayId);
    if (!details) {
      return { success: false, error: 'Student fee statement not found.' };
    }

    const summaryHeaders = ['Summary Metric', 'Value'];
    const summaryData = [
      ['Student Name', details.student.name],
      ['Student ID', details.student.studentIdNumber],
      ['Academic Year', details.academicYearName],
      ['Monthly Fee ($)', Number(details.monthlyFee)],
      ['Current Year Expected ($)', Number(details.totalFeesExpected)],
      ['Current Year Paid ($)', Number(details.totalAmountPaid)],
      ['Current Year Remaining ($)', Number(details.remainingBalance)],
      ['Previous Years Outstanding ($)', Number(details.previousYearsOutstanding)],
      ['Combined Total Outstanding ($)', Number(details.combinedOutstandingBalance)],
    ];

    const breakdownHeaders = [
      'Academic Year',
      'Month',
      'Expected Monthly Fee ($)',
      'Amount Paid ($)',
      'Remaining Balance ($)',
      'Due Date',
      'Cycle Type',
      'Payment Status',
    ];
    const breakdownData = details.monthsBreakdown.map((m) => [
      details.academicYearName,
      m.monthName,
      Number(m.expectedFee),
      Number(m.paidAmount),
      Number(m.balance),
      m.dueDate,
      m.isAdvance ? 'Advance / Future' : 'Billed Cycle',
      m.status,
    ]);

    const paymentsHeaders = [
      'Receipt ID',
      'Target Academic Year',
      'Payment Date',
      'Amount Paid ($)',
      'Payment Method',
      'Months Covered',
      'Note / Reference',
      'Status',
    ];
    const paymentsData = details.payments.map((p) => [
      p.id,
      details.academicYearName,
      p.date,
      Number(p.amount),
      p.method,
      p.monthsCovered.join(', '),
      p.note || '',
      p.isVoided ? 'VOIDED' : 'VALID',
    ]);

    const prevDebtsHeaders = [
      'Previous Academic Year',
      'Expected Fees ($)',
      'Amount Paid ($)',
      'Remaining Debt ($)',
      'Unpaid Months',
    ];
    const prevDebtsData = details.previousYearDebts.map((d) => [
      d.academicYearName,
      Number(d.totalFeesExpected),
      Number(d.totalAmountPaid),
      Number(d.outstandingBalance),
      d.unpaidMonths.join('; '),
    ]);

    const filename = `Student_Fee_Statement_${details.student.studentIdNumber}_${details.academicYearName.replace(/\s+/g, '')}_${details.student.name.replace(/\s+/g, '_')}.xlsx`;
    const res = this.generateWorkbook(filename, [
      { name: 'Summary & Combined Debt', headers: summaryHeaders, data: summaryData },
      { name: 'Monthly Fee Breakdown', headers: breakdownHeaders, data: breakdownData },
      { name: 'Payment Transactions', headers: paymentsHeaders, data: paymentsData },
      { name: 'Previous Year Debts', headers: prevDebtsHeaders, data: prevDebtsData },
    ]);
    return { ...res, count: breakdownData.length + paymentsData.length };
  }

  /**
   * Export Academic Years
   */
  public exportAcademicYears(
    schoolId: string,
    customYears?: AcademicYear[],
    filenameSuffix = 'All'
  ): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const years = customYears || storage.getAcademicYears(schoolId);
    const headers = ['Academic Year', 'Start Date', 'End Date', 'Status'];
    const data = years.map((y) => [y.name, y.startDate, y.endDate, y.status]);
    const filename = `Academic_Years_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const res = this.generateWorkbook(filename, [{ name: 'Academic Years', headers, data }]);
    return { ...res, count: years.length };
  }

  /**
   * EXPORT ALL SYSTEM DATA (Admin only)
   * Generates ONE comprehensive multi-worksheet Excel (.xlsx) workbook with complete relational IDs.
   * Never exports passwords, password hashes, tokens, or credentials.
   */
  public exportAllSystemData(schoolId: string, schoolName?: string, academicYearId?: string): ExcelExportResult {
    const authErr = this.assertAuthorized(['school_admin', 'super_admin'], schoolId);
    if (authErr) return { success: false, error: authErr };

    const schoolObj = storage.getSchoolById(schoolId);
    const resolvedName = schoolName || schoolObj?.name || 'School Manager';
    const { ayId, ayName } = this.resolveAcademicYearLabel(schoolId, academicYearId);

    const students = storage.getStudents(schoolId, ayId);
    const teachers = storage.getTeachers(schoolId, ayId);
    const classes = storage.getClasses(schoolId, ayId);
    const subjects = storage.getSubjects(schoolId, ayId);
    const payments = storage.getFeePayments(schoolId, 'all');
    const unpaidItems = storage.getUnpaidStudentsList(schoolId, { academicYearId: ayId });
    const attendance = storage.getAttendance(schoolId, ayId);
    const academicYears = storage.getAcademicYears(schoolId);
    const billingRuns = storage.getBillingRuns(schoolId, ayId);
    const promotions = storage.getPromotions(schoolId, 'all');
    const comprehensiveStats = storage.getComprehensiveFeeStats(schoolId, ayId);
    const baseStudents = storage.getAllBaseStudents(schoolId);

    const getClassName = (cid: string) => classes.find((c) => c.id === cid)?.name || 'Class';
    const getStudent = (sid: string) => students.find((s) => s.id === sid) || baseStudents.find((s) => s.id === sid);
    const getAyName = (id?: string) => academicYears.find((y) => y.id === id)?.name || ayName;

    // 1. Summary & Overview
    const summaryHeaders = ['Metric / Property', 'Value', 'Notes / Context'];
    const summaryData = [
      ['School ID', schoolId, 'Unique School Identifier'],
      ['School Name', resolvedName, 'Primary Institution'],
      ['Selected Academic Year', ayName, 'Current report academic year'],
      ['Export Date', new Date().toISOString().split('T')[0], 'Generated System Workbook'],
      ['Total Students Enrolled', students.length, `Enrolled in ${ayName}`],
      ['Active Students Count', students.filter((s) => s.enrollmentStatus === 'Active').length, 'Currently attending'],
      ['Total Teachers', teachers.length, 'Faculty headcount'],
      ['Total Classes', classes.length, 'Instructional groups'],
      ['Total Subjects', subjects.length, 'Curricular subjects'],
      ['Fully Paid Students (Year)', comprehensiveStats.fullyPaidStudents, 'Current year cleared'],
      ['Students with Outstanding Debt', comprehensiveStats.outstandingStudentsCount, 'Pending current year fees'],
      ['Current Year Expected ($)', Number(comprehensiveStats.totalFeesExpected), `Billings in ${ayName}`],
      ['Current Year Collected ($)', Number(comprehensiveStats.totalFeesCollected), `Payments in ${ayName}`],
      ['Current Year Outstanding ($)', Number(comprehensiveStats.totalOutstandingFees), `Uncollected in ${ayName}`],
      ['Previous Years Outstanding ($)', Number(comprehensiveStats.previousYearsOutstanding), 'Carry-forward prior year balances'],
      ['Total Combined Outstanding ($)', Number(comprehensiveStats.combinedOutstanding), 'Prior years + current year'],
    ];

    // 2. Students Roster
    const studentsHeaders = [
      'Academic Year',
      'Record ID',
      'Student ID',
      'Full Name',
      'Class ID',
      'Class',
      'Shift',
      'Monthly Fee ($)',
      'Fee Start Date',
      'Registration Date',
      'Guardian Name',
      'Guardian Phone',
      'Guardian Address',
      'Enrollment Status',
      'Payment Status',
      'Current Year Billed ($)',
      'Current Year Paid ($)',
      'Current Year Balance ($)',
      'Previous Year Debt ($)',
      'Combined Balance ($)',
    ];
    const studentsData = students.map((s) => {
      const fee = storage.getStudentFeeSummary(schoolId, s.id, ayId);
      return [
        ayName,
        s.id,
        s.studentIdNumber,
        s.name,
        s.classId,
        getClassName(s.classId),
        s.shift,
        Number(s.monthlyFee),
        s.feeStartDate || s.registrationDate,
        s.registrationDate,
        s.guardianName,
        s.guardianPhone,
        s.guardianAddress || '',
        s.enrollmentStatus,
        fee.status,
        Number(fee.totalBilled),
        Number(fee.totalPaid),
        Number(fee.balance),
        Number(fee.previousYearsOutstanding || 0),
        Number(fee.combinedBalance ?? fee.balance),
      ];
    });

    // 3. Complete Student Fee Histories (Per-student summary)
    const feeHistoriesHeaders = [
      'Academic Year',
      'Student Record ID',
      'Student ID',
      'Student Name',
      'Class',
      'Monthly Fee ($)',
      'Fee Start Date',
      'Billing Type',
      'Months Expected',
      'Months Paid',
      'Months Unpaid',
      'Last Month Paid',
      'Current Year Expected ($)',
      'Current Year Paid ($)',
      'Current Year Balance ($)',
      'Previous Year Debt ($)',
      'Combined Outstanding ($)',
      'Overall Status',
    ];
    const feeHistoriesData: (string | number)[][] = [];
    const monthlyFeeRecordsData: (string | number)[][] = [];

    students.forEach((s) => {
      const details = storage.getStudentFeeHistoryDetails(schoolId, s.id, ayId);
      if (!details) return;
      const clsName = getClassName(s.classId);
      feeHistoriesData.push([
        ayName,
        s.id,
        s.studentIdNumber,
        s.name,
        clsName,
        Number(details.monthlyFee),
        details.feeStartDate,
        details.feeBillingType,
        details.totalMonthsExpected,
        details.totalMonthsPaid,
        details.totalMonthsUnpaid,
        details.lastMonthPaid,
        Number(details.totalFeesExpected),
        Number(details.totalAmountPaid),
        Number(details.remainingBalance),
        Number(details.previousYearsOutstanding),
        Number(details.combinedOutstandingBalance),
        details.overallStatus,
      ]);

      details.monthsBreakdown.forEach((m) => {
        monthlyFeeRecordsData.push([
          ayName,
          s.studentIdNumber,
          s.name,
          clsName,
          m.monthKey,
          m.monthName,
          Number(m.expectedFee),
          Number(m.paidAmount),
          Number(m.balance),
          m.dueDate,
          m.isAdvance ? 'Advance / Future' : 'Billed Cycle',
          m.status,
        ]);
      });
    });

    // 4. Monthly Fee Records (Student x 12-Month Breakdown)
    const monthlyFeeHeaders = [
      'Academic Year',
      'Student ID',
      'Student Name',
      'Class',
      'Month Key',
      'Month Name',
      'Expected Fee ($)',
      'Amount Paid ($)',
      'Remaining Balance ($)',
      'Due Date',
      'Cycle Type',
      'Payment Status',
    ];

    // 5. Payments Ledger (All Academic Years with Target Year label)
    const paymentsHeaders = [
      'Receipt ID',
      'Target Academic Year',
      'Date',
      'Student Record ID',
      'Student ID',
      'Student Name',
      'Class',
      'Amount ($)',
      'Method',
      'Months Covered',
      'Note / Reference',
      'Status',
    ];
    const paymentsData = payments.map((p) => {
      const s = getStudent(p.studentId);
      return [
        p.id,
        getAyName(p.academicYearId),
        p.date,
        p.studentId,
        s?.studentIdNumber || p.studentId,
        s?.name || 'Student',
        s ? getClassName(s.classId) : '',
        Number(p.amount),
        p.method,
        p.monthsCovered.join(', '),
        p.note || '',
        p.isVoided ? 'VOIDED' : 'VALID',
      ];
    });

    // 6. Unpaid Debts (Previous + Current + Combined)
    const unpaidHeaders = [
      'Academic Year',
      'Student Record ID',
      'Student ID',
      'Student Name',
      'Class',
      'Guardian Name',
      'Guardian Phone',
      'Monthly Fee ($)',
      'Current Year Paid ($)',
      'Current Year Balance ($)',
      'Previous Year Debt ($)',
      'Combined Balance ($)',
      'Due Month(s)',
      'Status',
    ];
    const unpaidData = unpaidItems.map((item) => [
      ayName,
      item.studentId,
      item.studentIdNumber,
      item.studentName,
      item.className,
      item.guardianName,
      item.guardianPhone,
      Number(item.monthlyFee),
      Number(item.amountPaid),
      Number(item.remainingBalance),
      Number(item.previousYearDebt),
      Number(item.combinedBalance),
      item.dueMonthsList.join('; '),
      item.status,
    ]);

    // 7. Billing Runs
    const billingHeaders = [
      'Academic Year',
      'Billing ID',
      'Month',
      'Classes',
      'Students Billed',
      'Total Billed ($)',
      'Due Date',
      'Status',
      'Created At',
    ];
    const billingData = billingRuns.map((b) => [
      getAyName(b.academicYearId),
      b.id,
      b.month,
      b.classes,
      b.studentsBilledCount,
      Number(b.totalBilledAmount),
      b.dueDate,
      b.status,
      b.createdAt,
    ]);

    // 8. Classes
    const classesHeaders = ['Academic Year', 'Class ID', 'Class Name', 'Teacher ID', 'Teacher Name', 'Enrolled Students', 'Active Count'];
    const classesData = classes.map((c) => {
      const tch = teachers.find((t) => t.id === c.teacherId)?.name || 'Unassigned';
      const enrolled = students.filter((s) => s.classId === c.id);
      const active = enrolled.filter((s) => s.enrollmentStatus === 'Active').length;
      return [ayName, c.id, c.name, c.teacherId || '', tch, enrolled.length, active];
    });

    // 9. Teachers Directory (Strict Security: No passwords or auth secrets!)
    const teachersHeaders = ['Academic Year', 'Teacher ID', 'Full Name', 'Email', 'Phone', 'Assigned Classes', 'Subjects'];
    const teachersData = teachers.map((t) => [
      ayName,
      t.id,
      t.name,
      t.email,
      t.phone || '',
      t.assignedClassIds.map(getClassName).join(', '),
      t.subjects.join(', '),
    ]);

    // 10. Subjects
    const subjectsHeaders = ['Academic Year', 'Subject ID', 'Subject Name', 'Class ID', 'Class', 'Teacher ID', 'Teacher'];
    const subjectsData = subjects.map((sub) => [
      ayName,
      sub.id,
      sub.name,
      sub.classId,
      getClassName(sub.classId),
      sub.teacherId,
      teachers.find((t) => t.id === sub.teacherId)?.name || 'Unassigned',
    ]);

    // 11. Attendance Records
    const attHeaders = ['Academic Year', 'Record ID', 'Date', 'Class ID', 'Class', 'Student ID', 'Student Name', 'Status'];
    const attData = attendance.map((a) => {
      const s = getStudent(a.studentId);
      return [
        getAyName(a.academicYearId),
        a.id,
        a.date,
        a.classId,
        getClassName(a.classId),
        s?.studentIdNumber || a.studentId,
        s?.name || 'Student',
        a.status.toUpperCase(),
      ];
    });

    // 12. Academic Years & Promotions
    const ayHeaders = ['Academic Year ID', 'Academic Year', 'Start Date', 'End Date', 'Status'];
    const ayData = academicYears.map((y) => [y.id, y.name, y.startDate, y.endDate, y.status]);

    const promoHeaders = ['Promotion ID', 'Student ID', 'Student Name', 'From Class', 'To Class', 'Academic Year', 'Promoted At'];
    const promoData = promotions.map((p) => {
      const s = getStudent(p.studentId);
      return [
        p.id,
        s?.studentIdNumber || p.studentId,
        s?.name || 'Student',
        getClassName(p.fromClassId),
        getClassName(p.toClassId),
        p.academicYear,
        p.promotedAt,
      ];
    });

    const filename = `${resolvedName.replace(/\s+/g, '_')}_COMPLETE_SYSTEM_DATA_${ayName.replace(/\s+/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return this.generateWorkbook(filename, [
      { name: 'Summary & Overview', headers: summaryHeaders, data: summaryData },
      { name: 'Students Roster', headers: studentsHeaders, data: studentsData },
      { name: 'Student Fee Histories', headers: feeHistoriesHeaders, data: feeHistoriesData },
      { name: 'Monthly Fee Records', headers: monthlyFeeHeaders, data: monthlyFeeRecordsData },
      { name: 'Payments Ledger', headers: paymentsHeaders, data: paymentsData },
      { name: 'Unpaid Debts', headers: unpaidHeaders, data: unpaidData },
      { name: 'Monthly Billing Runs', headers: billingHeaders, data: billingData },
      { name: 'Classes', headers: classesHeaders, data: classesData },
      { name: 'Teachers Directory', headers: teachersHeaders, data: teachersData },
      { name: 'Subjects', headers: subjectsHeaders, data: subjectsData },
      { name: 'Attendance Records', headers: attHeaders, data: attData },
      { name: 'Academic Years', headers: ayHeaders, data: ayData },
      { name: 'Promotions', headers: promoHeaders, data: promoData },
    ]);
  }
}

export const excelService = new ExcelExportService();
