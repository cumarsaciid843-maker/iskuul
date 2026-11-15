export type UserRole = 'super_admin' | 'school_admin' | 'teacher';

export type SchoolStatus = 'active' | 'suspended' | 'pending' | 'rejected';

export type EnrollmentStatus = 'Active' | 'Inactive';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type FeePaymentStatus = 'Paid' | 'Partial Payment' | 'Unpaid' | 'Overdue';

export type ShiftType = 'Morning' | 'Afternoon' | 'Evening';

export type PaymentMethod = 'Cash' | 'Mobile money' | 'Bank transfer' | 'Cheque';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Plain/hashed comparison supported
  role: UserRole;
  schoolId?: string; // null/undefined for super_admin
  teacherId?: string; // links to Teacher record if role is teacher
  avatarInitials?: string;
}

export interface SchoolPlan {
  id: string;
  name: string; // 'Basic' | 'Standard' | 'Premium'
  price: number; // in USD per month
  studentLimit: number;
  features: string[];
  popular?: boolean;
  hidden?: boolean;
}

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: 'Mobile money' | 'Bank transfer';
  status: 'pending' | 'active' | 'expired' | 'rejected';
  paidAt?: string;
  paidUntil?: string; // Date string (YYYY-MM-DD)
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: SchoolStatus;
  planId: string;
  planName: string;
  paidUntil: string; // YYYY-MM-DD
  registeredAt: string;
  adminUserId?: string;
  paymentMethod?: 'Mobile money' | 'Bank transfer';
  paymentReference?: string;
  allowAdvancePayments?: boolean;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string; // e.g. "2025 - 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'Active' | 'Closed';
}

export interface StudentYearEnrollment {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  shift: ShiftType;
  monthlyFee: number;
  feeStartDate?: string;
  feeBillingType?: FeeBillingType;
  enrollmentStatus: EnrollmentStatus;
}

export interface TeacherYearAssignment {
  id: string;
  schoolId: string;
  teacherId: string;
  academicYearId: string;
  assignedClassIds: string[];
  subjects: string[];
}

export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string; // e.g. "Grade 7 · A"
  teacherId?: string; // Primary class teacher (current/default)
  teacherByYear?: Record<string, string>; // academicYearId -> teacherId
  academicYearId?: string; // Origin academic year
  availableInYearIds?: string[]; // Academic years where this class is active
  createdAt: string;
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  assignedClassIds: string[]; // Class IDs (active year)
  subjects: string[]; // Subject names
  academicYearId?: string; // Origin academic year
  availableInYearIds?: string[]; // Academic years where teacher is active
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string; // e.g. "Mathematics", "English", "Islamic Studies"
  classId: string;
  teacherId: string;
  academicYearId?: string;
  availableInYearIds?: string[];
}

export type FeeBillingType = 'monthly_from_joining_month' | 'exact_date';

export interface Student {
  id: string;
  schoolId: string;
  studentIdNumber: string; // Unique school ID, e.g. "STD-001"
  name: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
  guardianAddress?: string;
  shift: ShiftType;
  monthlyFee: number;
  registrationDate: string; // YYYY-MM-DD
  feeStartDate?: string; // YYYY-MM-DD (defaults to registrationDate)
  feeBillingType?: FeeBillingType; // defaults to 'monthly_from_joining_month'
  enrollmentStatus: EnrollmentStatus;
  notes?: string;
  registeredAcademicYearId?: string;
}

export interface StudentMonthlyFeeRecord {
  monthKey: string; // e.g. "2026-01"
  monthName: string; // e.g. "January 2026"
  shortMonth: string; // e.g. "Jan 2026"
  year: number;
  monthIndex: number; // 1-12
  dueDate: string; // e.g. "2026-01-25"
  expectedFee: number;
  paidAmount: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
  isOverdue: boolean;
  isAdvance?: boolean;
  isBilled?: boolean;
  academicYearId?: string;
}

export interface PreviousYearDebtSummary {
  academicYearId: string;
  academicYearName: string;
  totalFeesExpected: number;
  totalAmountPaid: number;
  outstandingBalance: number;
  unpaidMonths: string[];
}

export interface StudentFeeHistoryDetails {
  student: Student;
  academicYearId: string;
  academicYearName: string;
  monthlyFee: number;
  registrationDate: string;
  feeStartDate: string;
  feeBillingType: FeeBillingType;
  monthsBreakdown: StudentMonthlyFeeRecord[];
  totalMonthsExpected: number;
  totalMonthsPaid: number;
  totalMonthsUnpaid: number;
  totalMonthsPartial: number;
  totalFeesExpected: number;
  totalAmountPaid: number;
  remainingBalance: number; // Current/selected year remaining balance
  previousYearDebts: PreviousYearDebtSummary[];
  previousYearsOutstanding: number; // Sum of all prior years' outstanding debts
  combinedOutstandingBalance: number; // previousYearsOutstanding + remainingBalance
  lastMonthPaid: string;
  overallStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
  payments: FeePayment[];
}

export interface UnpaidStudentItem {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  classId: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  monthlyFee: number;
  amountPaid: number;
  remainingBalance: number; // Current/selected year balance
  previousYearDebt: number; // Prior academic years carry-forward balance
  combinedBalance: number; // previousYearDebt + remainingBalance
  previousYearBreakdown: PreviousYearDebtSummary[];
  dueMonth: string;
  dueMonthsList: string[];
  status: 'Unpaid' | 'Partial' | 'Overdue';
  academicYearId?: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  academicYearId?: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface FeeBill {
  id: string;
  schoolId: string;
  academicYearId?: string;
  studentId: string;
  classId: string;
  month: string; // e.g. "January 2026", "February 2027"
  monthIndex: number; // 1-12
  year: number;
  amount: number;
  dueDate: string;
  createdAt: string;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  academicYearId?: string; // The academic year whose fee/debt this payment settles
  recordedDuringAcademicYearId?: string; // Audit: active year when payment was recorded
  studentId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  monthsCovered: string[]; // e.g. ["Jan", "Feb"]
  note?: string;
  isVoided: boolean;
  createdAt: string;
}

export interface BillingRun {
  id: string;
  schoolId: string;
  academicYearId?: string;
  month: string; // e.g. "January 2026"
  classes: string; // "All classes" or specific
  studentsBilledCount: number;
  totalBilledAmount: number;
  dueDate: string;
  status: 'Billed';
  createdAt: string;
}

export interface PromotionRecord {
  id: string;
  schoolId: string;
  academicYearId?: string;
  studentId: string;
  fromClassId: string;
  toClassId: string;
  academicYear: string;
  promotedAt: string;
}

export interface PlatformSettings {
  mobileMoneyNumber: string;
  mobileMoneyProvider: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankBranch: string;
  contactEmail: string;
  currency: string;
}
