import {
  User,
  School,
  SchoolPlan,
  SchoolSubscription,
  SchoolStatus,
  ClassRoom,
  Teacher,
  Subject,
  Student,
  AttendanceRecord,
  FeeBill,
  FeePayment,
  BillingRun,
  PromotionRecord,
  PlatformSettings,
  AttendanceStatus,
  PaymentMethod,
  ShiftType,
  EnrollmentStatus,
  FeeBillingType,
  StudentMonthlyFeeRecord,
  StudentFeeHistoryDetails,
  PreviousYearDebtSummary,
  UnpaidStudentItem,
  AcademicYear,
  StudentYearEnrollment,
  TeacherYearAssignment,
} from '../types';
import { getSupabase, isSupabaseConfigured, supabase } from './supabaseClient';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const EMPTY_SETTINGS: PlatformSettings = {
  mobileMoneyNumber: '',
  mobileMoneyProvider: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  bankBranch: '',
  contactEmail: '',
  currency: 'USD',
};

interface DatabaseCache {
  settingsRowId: string | number | null;
  settings: PlatformSettings;
  plans: SchoolPlan[];
  schools: School[];
  users: User[];
  subscriptions: SchoolSubscription[];
  academicYears: AcademicYear[];
  classes: ClassRoom[];
  teachers: Teacher[];
  subjects: Subject[];
  students: Student[];
  attendance: AttendanceRecord[];
  feeBills: FeeBill[];
  feePayments: FeePayment[];
  billingRuns: BillingRun[];
  promotions: PromotionRecord[];
  studentYearEnrollments: StudentYearEnrollment[];
  teacherYearAssignments: TeacherYearAssignment[];
  selectedAcademicYears: Record<string, string>;
}

class StorageService {
  private data: DatabaseCache = {
    settingsRowId: null,
    settings: { ...EMPTY_SETTINGS },
    plans: [],
    schools: [],
    users: [],
    subscriptions: [],
    academicYears: [],
    classes: [],
    teachers: [],
    subjects: [],
    students: [],
    attendance: [],
    feeBills: [],
    feePayments: [],
    billingRuns: [],
    promotions: [],
    studentYearEnrollments: [],
    teacherYearAssignments: [],
    selectedAcademicYears: {},
  };

  private currentUser: User | null = null;
  private listeners: Set<() => void> = new Set();
  private suppressAuthEvents = false;
  private lastPublicError: string | null = null;
  private lastSessionError: string | null = null;
  private lastSessionLoadedAt = 0;
  private loadSessionInFlight: Promise<{
    user: User | null;
    school: School | null;
    status?: SchoolStatus;
    error?: string;
  }> | null = null;

  public isAuthEventSuppressed(): boolean {
    return this.suppressAuthEvents;
  }

  public getLastPublicError(): string | null {
    return this.lastPublicError;
  }

  public getLastSessionError(): string | null {
    return this.lastSessionError;
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public clearSessionCache() {
    this.currentUser = null;
    this.data.schools = [];
    this.data.users = [];
    this.data.subscriptions = [];
    this.data.academicYears = [];
    this.data.classes = [];
    this.data.teachers = [];
    this.data.subjects = [];
    this.data.students = [];
    this.data.attendance = [];
    this.data.feeBills = [];
    this.data.feePayments = [];
    this.data.billingRuns = [];
    this.data.promotions = [];
    this.data.studentYearEnrollments = [];
    this.data.teacherYearAssignments = [];
    this.notify();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPlanRow(row: any): SchoolPlan {
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price) || 0,
      studentLimit: Number(row.student_limit) || 0,
      features: Array.isArray(row.features) ? row.features.map(String) : [],
      popular: Boolean(row.is_highlighted),
      hidden: row.is_visible === false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSettingsRow(row: any): PlatformSettings {
    if (!row) return { ...EMPTY_SETTINGS };
    return {
      mobileMoneyNumber: row.mobile_money_number || '',
      mobileMoneyProvider: row.mobile_money_provider || '',
      bankName: row.bank_name || '',
      accountName: row.account_name || '',
      accountNumber: row.account_number || '',
      bankBranch: row.bank_branch || '',
      contactEmail: row.contact_email || '',
      currency: row.currency || 'USD',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSchoolRow(row: any, plans: SchoolPlan[], profiles: any[]): School {
    const plan = plans.find((p) => p.id === row.plan_id);
    const adminProfile = profiles.find((p) => p.school_id === row.id && p.role === 'school_admin');
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      address: row.address || undefined,
      status: String(row.status || 'pending').toLowerCase() as SchoolStatus,
      planId: row.plan_id,
      planName: plan?.name || '',
      paidUntil: row.paid_until || '',
      registeredAt: row.created_at ? String(row.created_at).split('T')[0] : '',
      adminUserId: adminProfile?.id,
      paymentMethod: row.payment_method || undefined,
      paymentReference: row.payment_reference || undefined,
      allowAdvancePayments: Boolean(row.allow_advance_payments),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSubscriptionRow(row: any, plans: SchoolPlan[]): SchoolSubscription {
    const plan = plans.find((p) => p.id === row.plan_id);
    return {
      id: row.id,
      schoolId: row.school_id,
      planId: row.plan_id,
      planName: plan?.name || '',
      amount: Number(row.amount) || 0,
      paymentMethod: row.method,
      status: row.status,
      paidAt: row.approved_at ? String(row.approved_at).split('T')[0] : undefined,
      paidUntil: row.paid_until || undefined,
      createdAt: row.created_at ? String(row.created_at).split('T')[0] : '',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProfileRow(row: any, teachers: Teacher[] = []): User {
    const teacher = teachers.find((t) => t.userId === row.id);
    return {
      id: row.id,
      name: row.full_name || row.email,
      email: row.email,
      passwordHash: '',
      role: row.role,
      schoolId: row.school_id || undefined,
      teacherId: teacher?.id,
      avatarInitials:
        row.avatar_initials ||
        String(row.full_name || row.email || 'U')
          .split(/\s+/)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
    };
  }

  public async loadPublicData(): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    const [plansRes, settingsRes] = await Promise.all([
      supabase.from('plans').select('*').order('sort_order', { ascending: true }),
      supabase.from('platform_settings').select('*').limit(1).maybeSingle(),
    ]);

    if (plansRes.error) {
      const isMissingTable = plansRes.error.code === 'PGRST205';
      console.warn('Plans unavailable:', plansRes.error.message);
      this.lastPublicError = isMissingTable
        ? 'Database tables are not initialized yet in your Supabase project (missing public.plans). Please run the SQL setup migration in the Supabase SQL Editor.'
        : plansRes.error.message;
    } else if (plansRes.data) {
      this.lastPublicError = null;
      this.data.plans = plansRes.data.map((r) => this.mapPlanRow(r));
    }

    if (settingsRes.error) {
      const isMissingTable = settingsRes.error.code === 'PGRST205';
      console.warn('Platform settings unavailable:', settingsRes.error.message);
      if (!this.lastPublicError) {
        this.lastPublicError = isMissingTable
          ? 'Database tables are not initialized yet in your Supabase project (missing public.platform_settings). Please run the SQL setup migration in the Supabase SQL Editor.'
          : settingsRes.error.message;
      }
    } else if (settingsRes.data) {
      this.data.settingsRowId = settingsRes.data.id ?? 1;
      this.data.settings = this.mapSettingsRow(settingsRes.data);
    }

    this.notify();
  }

  public async refreshIfStale(minIntervalMs: number = 4000): Promise<void> {
    if (!supabase || !isSupabaseConfigured || !this.currentUser) return;
    if (Date.now() - this.lastSessionLoadedAt < minIntervalMs) return;
    await this.loadSessionData();
  }

  public async loadSessionData(): Promise<{
    user: User | null;
    school: School | null;
    status?: SchoolStatus;
    error?: string;
  }> {
    if (this.loadSessionInFlight) {
      return this.loadSessionInFlight;
    }
    this.loadSessionInFlight = this.executeLoadSessionData().finally(() => {
      this.loadSessionInFlight = null;
    });
    return this.loadSessionInFlight;
  }

  private async executeLoadSessionData(): Promise<{
    user: User | null;
    school: School | null;
    status?: SchoolStatus;
    error?: string;
  }> {
    if (!supabase || !isSupabaseConfigured) {
      return { user: null, school: null };
    }

    this.lastSessionError = null;

    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      this.clearSessionCache();
      await this.loadPublicData();
      return { user: null, school: null };
    }

    let { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // Auto-complete deferred school registration if email confirmation interrupted step 2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingReg = (authUser.user_metadata as any)?.pending_school_registration;
    if (!profileRow && !profileErr && pendingReg && pendingReg.school_name && pendingReg.plan_id) {
      const { error: recoverRpcErr } = await supabase.rpc('register_school', {
        p_school_name: String(pendingReg.school_name).trim(),
        p_plan_id: pendingReg.plan_id,
        p_payment_method: pendingReg.payment_method || 'Mobile money',
        p_payment_reference: pendingReg.payment_reference || null,
      });
      if (!recoverRpcErr) {
        const retryProfile = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        profileRow = retryProfile.data;
        profileErr = retryProfile.error;
      } else {
        console.error('Auto-complete pending school registration failed:', recoverRpcErr);
      }
    }

    if (profileErr || !profileRow) {
      if (profileErr) {
        console.error('Failed to load profile:', profileErr);
        this.lastSessionError = profileErr.message;
      }
      this.clearSessionCache();
      await this.loadPublicData();
      return {
        user: null,
        school: null,
        error: profileErr?.message || 'User profile not found in database.',
      };
    }

    // Fetch public catalog first (plans & platform settings)
    await this.loadPublicData();
    this.lastSessionLoadedAt = Date.now();

    if (profileRow.role === 'super_admin') {
      const [schoolsRes, paymentsRes, adminProfilesRes] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('school_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'school_admin'),
      ]);

      const queryErrors: string[] = [];
      if (schoolsRes.error) {
        console.error('Super Admin failed to load schools:', schoolsRes.error);
        queryErrors.push(`schools: ${schoolsRes.error.message}`);
      }
      if (paymentsRes.error) {
        console.error('Super Admin failed to load school_payments:', paymentsRes.error);
        queryErrors.push(`payments: ${paymentsRes.error.message}`);
      }
      if (adminProfilesRes.error) {
        console.error('Super Admin failed to load school_admin profiles:', adminProfilesRes.error);
        queryErrors.push(`profiles: ${adminProfilesRes.error.message}`);
      }

      if (queryErrors.length > 0) {
        this.lastSessionError = queryErrors.join(' | ');
      }

      const adminProfiles = adminProfilesRes.data || [];
      if (!schoolsRes.error) {
        this.data.schools = (schoolsRes.data || []).map((r) =>
          this.mapSchoolRow(r, this.data.plans, adminProfiles)
        );
      }
      if (!paymentsRes.error) {
        this.data.subscriptions = (paymentsRes.data || []).map((r) =>
          this.mapSubscriptionRow(r, this.data.plans)
        );
      }
      this.data.users = [
        this.mapProfileRow(profileRow),
        ...adminProfiles.map((p) => this.mapProfileRow(p)),
      ];
      this.currentUser = this.mapProfileRow(profileRow);

      this.notify();
      return {
        user: this.currentUser,
        school: null,
        status: 'active',
        error: this.lastSessionError || undefined,
      };
    }

    // School Admin or Teacher
    const schoolId: string | null = profileRow.school_id;
    if (!schoolId) {
      this.clearSessionCache();
      return { user: null, school: null, error: 'Account is not linked to a school.' };
    }

    const { data: schoolRow, error: schoolErr } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .maybeSingle();

    if (schoolErr || !schoolRow) {
      this.clearSessionCache();
      return { user: null, school: null, error: 'School record not found.' };
    }

    const school = this.mapSchoolRow(schoolRow, this.data.plans, [profileRow]);
    this.data.schools = [school];

    if (school.status === 'rejected') {
      const mappedUser = this.mapProfileRow(profileRow);
      this.currentUser = mappedUser;
      this.notify();
      return {
        user: mappedUser,
        school,
        status: 'rejected',
        error: 'Your school registration has been rejected. Please contact support.',
      };
    }

    if (school.status === 'pending' || school.status === 'suspended') {
      const mappedUser = this.mapProfileRow(profileRow);
      this.currentUser = mappedUser;
      this.data.users = [mappedUser];
      this.notify();
      return {
        user: mappedUser,
        school,
        status: school.status,
      };
    }

    // Active school: load all tenant tables cleanly in parallel (RLS filters to school_id)
    const [
      ayRes,
      classesRes,
      teachersRes,
      tyaRes,
      subjectsRes,
      studentsRes,
      syeRes,
      attRes,
      billsRes,
      paymentsRes,
      runsRes,
      promosRes,
      profilesRes,
    ] = await Promise.all([
      supabase.from('academic_years').select('*').eq('school_id', schoolId).order('start_date', { ascending: false }),
      supabase.from('classes').select('*').eq('school_id', schoolId).order('created_at', { ascending: true }),
      supabase.from('teachers').select('*').eq('school_id', schoolId).order('created_at', { ascending: true }),
      supabase.from('teacher_year_assignments').select('*').eq('school_id', schoolId),
      supabase.from('subjects').select('*').eq('school_id', schoolId).order('created_at', { ascending: true }),
      supabase.from('students').select('*').eq('school_id', schoolId).order('created_at', { ascending: true }),
      supabase.from('student_year_enrollments').select('*').eq('school_id', schoolId),
      supabase.from('attendance').select('*').eq('school_id', schoolId),
      supabase.from('fee_bills').select('*').eq('school_id', schoolId),
      supabase.from('fee_payments').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('billing_runs').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('promotions').select('*').eq('school_id', schoolId).order('promoted_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('school_id', schoolId),
    ]);

    const academicYears: AcademicYear[] = (ayRes.data || []).map((r) => ({
      id: r.id,
      schoolId: r.school_id,
      name: r.name,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status as 'Active' | 'Closed',
    }));

    const activeAy = academicYears.find((y) => y.status === 'Active') || academicYears[0];

    // Group teacher_year_assignments rows (1 row per class/teacher/year) into TeacherYearAssignment per (teacher, year)
    const tyaGroupMap = new Map<string, TeacherYearAssignment>();
    const rawTeachers = teachersRes.data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherSubjectsLookup = new Map<string, string[]>(rawTeachers.map((t: any) => [t.id, Array.isArray(t.subjects) ? t.subjects : []]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tyaRes.data || []).forEach((row: any) => {
      const key = `${row.teacher_id}__${row.academic_year_id}`;
      let entry = tyaGroupMap.get(key);
      if (!entry) {
        entry = {
          id: row.id,
          schoolId: row.school_id,
          teacherId: row.teacher_id,
          academicYearId: row.academic_year_id,
          assignedClassIds: [],
          subjects: teacherSubjectsLookup.get(row.teacher_id) || [],
        };
        tyaGroupMap.set(key, entry);
      }
      if (row.class_id && !entry.assignedClassIds.includes(row.class_id)) {
        entry.assignedClassIds.push(row.class_id);
      }
    });
    const teacherYearAssignments = Array.from(tyaGroupMap.values());

    // Build classes with teacherByYear map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classes: ClassRoom[] = (classesRes.data || []).map((r: any) => {
      const teacherByYear: Record<string, string> = {};
      if (r.academic_year_id && r.teacher_id) {
        teacherByYear[r.academic_year_id] = r.teacher_id;
      }
      // Overlay per-year assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tyaRes.data || []).forEach((tya: any) => {
        if (tya.class_id === r.id && tya.teacher_id && tya.academic_year_id) {
          teacherByYear[tya.academic_year_id] = tya.teacher_id;
        }
      });
      if (activeAy && r.teacher_id && !teacherByYear[activeAy.id]) {
        teacherByYear[activeAy.id] = r.teacher_id;
      }
      return {
        id: r.id,
        schoolId: r.school_id,
        name: r.name,
        teacherId: r.teacher_id || undefined,
        teacherByYear,
        academicYearId: r.academic_year_id || undefined,
        availableInYearIds: Array.isArray(r.available_in_year_ids) ? r.available_in_year_ids : undefined,
        createdAt: r.created_at ? String(r.created_at).split('T')[0] : '',
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teachers: Teacher[] = rawTeachers.map((r: any) => {
      const activeAssign = activeAy
        ? teacherYearAssignments.find((a) => a.teacherId === r.id && a.academicYearId === activeAy.id)
        : undefined;
      const fallbackClassIds = classes.filter((c) => c.teacherId === r.id).map((c) => c.id);
      return {
        id: r.id,
        schoolId: r.school_id,
        userId: r.user_id,
        name: r.name,
        email: r.email,
        phone: r.phone || undefined,
        assignedClassIds: activeAssign ? activeAssign.assignedClassIds : fallbackClassIds,
        subjects: Array.isArray(r.subjects) ? r.subjects : [],
        academicYearId: r.academic_year_id || undefined,
        availableInYearIds: Array.isArray(r.available_in_year_ids) ? r.available_in_year_ids : undefined,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subjects: Subject[] = (subjectsRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      name: r.name,
      classId: r.class_id,
      teacherId: r.teacher_id || '',
      academicYearId: r.academic_year_id || undefined,
      availableInYearIds: Array.isArray(r.available_in_year_ids) ? r.available_in_year_ids : undefined,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const students: Student[] = (studentsRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      studentIdNumber: r.student_id_number,
      name: r.name,
      classId: r.class_id || '',
      guardianName: r.guardian_name || '',
      guardianPhone: r.guardian_phone || '',
      guardianAddress: r.guardian_address || undefined,
      shift: (r.shift || 'Morning') as ShiftType,
      monthlyFee: Number(r.monthly_fee) || 0,
      registrationDate: r.registration_date || getTodayStr(),
      feeStartDate: r.fee_start_date || r.registration_date || undefined,
      feeBillingType: (r.fee_billing_type || 'monthly_from_joining_month') as FeeBillingType,
      enrollmentStatus: (r.enrollment_status || 'Active') as EnrollmentStatus,
      notes: r.notes || undefined,
      registeredAcademicYearId: r.registered_academic_year_id || undefined,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentYearEnrollments: StudentYearEnrollment[] = (syeRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      studentId: r.student_id,
      academicYearId: r.academic_year_id,
      classId: r.class_id || '',
      shift: (r.shift || 'Morning') as ShiftType,
      monthlyFee: Number(r.monthly_fee) || 0,
      feeStartDate: r.fee_start_date || undefined,
      feeBillingType: (r.fee_billing_type || 'monthly_from_joining_month') as FeeBillingType,
      enrollmentStatus: (r.enrollment_status || 'Active') as EnrollmentStatus,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attendance: AttendanceRecord[] = (attRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      academicYearId: r.academic_year_id || undefined,
      classId: r.class_id,
      studentId: r.student_id,
      date: r.date,
      status: r.status as AttendanceStatus,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feeBills: FeeBill[] = (billsRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      academicYearId: r.academic_year_id || undefined,
      studentId: r.student_id,
      classId: r.class_id || '',
      month: r.month,
      monthIndex: Number(r.month_index) || 1,
      year: Number(r.year) || new Date().getFullYear(),
      amount: Number(r.amount) || 0,
      dueDate: r.due_date || '',
      createdAt: r.created_at ? String(r.created_at).split('T')[0] : '',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feePayments: FeePayment[] = (paymentsRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      academicYearId: r.academic_year_id || undefined,
      recordedDuringAcademicYearId: r.recorded_during_academic_year_id || undefined,
      studentId: r.student_id,
      amount: Number(r.amount) || 0,
      date: r.date_received || (r.created_at ? String(r.created_at).split('T')[0] : getTodayStr()),
      method: r.method as PaymentMethod,
      monthsCovered: Array.isArray(r.months_covered) ? r.months_covered : [],
      note: r.note || undefined,
      isVoided: Boolean(r.voided),
      createdAt: r.created_at ? String(r.created_at).split('T')[0] : '',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billingRuns: BillingRun[] = (runsRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      academicYearId: r.academic_year_id || undefined,
      month: r.month,
      classes: r.class_scope || 'All classes',
      studentsBilledCount: Number(r.students_billed_count) || 0,
      totalBilledAmount: Number(r.total_billed_amount) || 0,
      dueDate: r.due_date || '',
      status: 'Billed',
      createdAt: r.created_at ? String(r.created_at).split('T')[0] : '',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promotions: PromotionRecord[] = (promosRes.data || []).map((r: any) => ({
      id: r.id,
      schoolId: r.school_id,
      academicYearId: r.academic_year_id || undefined,
      studentId: r.student_id,
      fromClassId: r.from_class_id || '',
      toClassId: r.to_class_id || '',
      academicYear: r.academic_year_name || '',
      promotedAt: r.promoted_at ? String(r.promoted_at).split('T')[0] : '',
    }));

    const users: User[] = (profilesRes.data || []).map((p) => this.mapProfileRow(p, teachers));

    this.data.academicYears = academicYears;
    this.data.classes = classes;
    this.data.teachers = teachers;
    this.data.teacherYearAssignments = teacherYearAssignments;
    this.data.subjects = subjects;
    this.data.students = students;
    this.data.studentYearEnrollments = studentYearEnrollments;
    this.data.attendance = attendance;
    this.data.feeBills = feeBills;
    this.data.feePayments = feePayments;
    this.data.billingRuns = billingRuns;
    this.data.promotions = promotions;
    this.data.users = users;

    this.currentUser = this.mapProfileRow(profileRow, teachers);

    // Ensure selected academic year falls back to active year if unset or invalid
    if (activeAy) {
      const savedAyId = this.data.selectedAcademicYears[schoolId];
      if (!savedAyId || !academicYears.some((y) => y.id === savedAyId)) {
        this.data.selectedAcademicYears[schoolId] = activeAy.id;
      }
    }

    this.notify();
    return { user: this.currentUser, school, status: 'active' };
  }

  public async signIn(
    email: string,
    passwordAttempt: string
  ): Promise<{
    user: User | null;
    school: School | null;
    status?: SchoolStatus;
    error?: string;
  }> {
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: passwordAttempt,
    });

    if (error) {
      return { user: null, school: null, error: error.message || 'Invalid email or password.' };
    }

    const sessionRes = await this.loadSessionData();
    if (sessionRes.status === 'rejected') {
      await sb.auth.signOut();
      this.clearSessionCache();
      return {
        user: null,
        school: null,
        status: 'rejected',
        error: sessionRes.error || 'Your school registration has been rejected. Please contact support.',
      };
    }

    return sessionRes;
  }

  public async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
    this.clearSessionCache();
  }

  public getUserById(id: string): User | undefined {
    if (this.currentUser?.id === id) return this.currentUser;
    return this.data.users.find((u) => u.id === id);
  }

  // Platform Settings
  public getSettings(): PlatformSettings {
    return { ...this.data.settings };
  }

  public async updateSettings(settings: Partial<PlatformSettings>): Promise<void> {
    const sb = getSupabase();
    const payload = {
      mobile_money_number: settings.mobileMoneyNumber ?? this.data.settings.mobileMoneyNumber,
      mobile_money_provider: settings.mobileMoneyProvider ?? this.data.settings.mobileMoneyProvider,
      bank_name: settings.bankName ?? this.data.settings.bankName,
      account_name: settings.accountName ?? this.data.settings.accountName,
      account_number: settings.accountNumber ?? this.data.settings.accountNumber,
      bank_branch: settings.bankBranch ?? this.data.settings.bankBranch,
      contact_email: settings.contactEmail ?? this.data.settings.contactEmail,
      currency: settings.currency ?? this.data.settings.currency,
    };

    if (this.data.settingsRowId !== null) {
      const { error } = await sb
        .from('platform_settings')
        .update(payload)
        .eq('id', this.data.settingsRowId);
      if (error) throw new Error(error.message);
    } else {
      const { data: existing } = await sb.from('platform_settings').select('id').limit(1).maybeSingle();
      if (existing) {
        const { error } = await sb.from('platform_settings').update(payload).eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sb.from('platform_settings').insert(payload);
        if (error) throw new Error(error.message);
      }
    }

    await this.loadPublicData();
  }

  // Plans
  public getPlans(includeHidden: boolean = false): SchoolPlan[] {
    if (includeHidden) {
      return [...this.data.plans];
    }
    return this.data.plans.filter((p) => !p.hidden);
  }

  public getAllPlans(): SchoolPlan[] {
    return [...this.data.plans];
  }

  public getPlanById(id: string): SchoolPlan | undefined {
    return this.data.plans.find((p) => p.id === id);
  }

  public async savePlan(plan: SchoolPlan): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('plans')
      .update({
        name: plan.name,
        price: plan.price,
        student_limit: plan.studentLimit,
        features: plan.features,
        is_highlighted: Boolean(plan.popular),
        is_visible: !plan.hidden,
      })
      .eq('id', plan.id);
    if (error) throw new Error(error.message);
    await this.loadPublicData();
  }

  public async addPlan(plan: Omit<SchoolPlan, 'id'>): Promise<SchoolPlan> {
    const sb = getSupabase();
    const slug = `${plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan'}-${Date.now().toString(36)}`;
    const { data, error } = await sb
      .from('plans')
      .insert({
        slug,
        name: plan.name,
        price: plan.price,
        student_limit: plan.studentLimit,
        features: plan.features,
        is_highlighted: Boolean(plan.popular),
        is_visible: !plan.hidden,
        sort_order: this.data.plans.length + 1,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to add plan');
    await this.loadPublicData();
    return this.mapPlanRow(data);
  }

  public async deletePlan(planId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('plans').delete().eq('id', planId);
    if (error) throw new Error(error.message);
    await this.loadPublicData();
  }

  public async togglePlanHidden(planId: string): Promise<void> {
    const plan = this.data.plans.find((p) => p.id === planId);
    if (!plan) return;
    const sb = getSupabase();
    const { error } = await sb
      .from('plans')
      .update({ is_visible: Boolean(plan.hidden) })
      .eq('id', planId);
    if (error) throw new Error(error.message);
    await this.loadPublicData();
  }

  public async setPopularPlan(planId: string): Promise<void> {
    const sb = getSupabase();
    const { error: clearErr } = await sb
      .from('plans')
      .update({ is_highlighted: false })
      .neq('id', planId);
    if (clearErr) throw new Error(clearErr.message);

    const { error: setErr } = await sb
      .from('plans')
      .update({ is_highlighted: true })
      .eq('id', planId);
    if (setErr) throw new Error(setErr.message);
    await this.loadPublicData();
  }

  // Subscriptions & Payments across platform
  public getSubscriptions(): SchoolSubscription[] {
    return [...this.data.subscriptions];
  }

  // Schools (Super Admin)
  public getSchools(): School[] {
    return [...this.data.schools];
  }

  public getSchoolById(id: string): School | undefined {
    return this.data.schools.find((s) => s.id === id);
  }

  public async registerNewSchool(
    schoolName: string,
    email: string,
    passwordPlain: string,
    planId: string,
    paymentMethod: 'Mobile money' | 'Bank transfer'
  ): Promise<School> {
    const sb = getSupabase();
    if (this.data.plans.length === 0) {
      await this.loadPublicData();
    }
    const resolvedPlan = this.getPlanById(planId) || this.data.plans[1] || this.data.plans[0];
    if (!resolvedPlan) {
      throw new Error(
        this.lastPublicError || 'No subscription plans found. Please contact platform administrator.'
      );
    }

    const cleanSchoolName = schoolName.trim();
    const cleanEmail = email.trim();
    const paymentReference = `${paymentMethod === 'Mobile money' ? 'MM' : 'WIRE'}-${Math.floor(100000 + Math.random() * 900000)}`;

    this.suppressAuthEvents = true;
    try {
      const { data: signUpData, error: signUpErr } = await sb.auth.signUp({
        email: cleanEmail,
        password: passwordPlain,
        options: {
          data: {
            full_name: `${cleanSchoolName} Admin`,
            pending_school_registration: {
              school_name: cleanSchoolName,
              plan_id: resolvedPlan.id,
              payment_method: paymentMethod,
              payment_reference: paymentReference,
            },
          },
        },
      });

      if (signUpErr) {
        const isAlreadyRegistered = /already registered|already exists/i.test(signUpErr.message);
        if (isAlreadyRegistered) {
          // If an earlier signup created auth.users without completing register_school, allow finishing it cleanly.
          const { data: existingSignIn, error: existingSignInErr } = await sb.auth.signInWithPassword({
            email: cleanEmail,
            password: passwordPlain,
          });
          if (!existingSignInErr && existingSignIn.session && existingSignIn.user) {
            const { data: existingProfile } = await sb
              .from('profiles')
              .select('id')
              .eq('id', existingSignIn.user.id)
              .maybeSingle();

            if (!existingProfile) {
              const { data: recoverData, error: recoverErr } = await sb.rpc('register_school', {
                p_school_name: cleanSchoolName,
                p_plan_id: resolvedPlan.id,
                p_payment_method: paymentMethod,
                p_payment_reference: paymentReference,
              });
              await sb.auth.signOut();
              if (recoverErr) {
                throw new Error(recoverErr.message);
              }
              const recoveredId =
                typeof recoverData === 'string'
                  ? recoverData
                  : recoverData?.school_id || recoverData?.id || '';
              return {
                id: recoveredId,
                name: cleanSchoolName,
                email: cleanEmail,
                status: 'pending',
                planId: resolvedPlan.id,
                planName: resolvedPlan.name,
                paidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                registeredAt: getTodayStr(),
                paymentMethod,
                paymentReference,
              };
            }
            await sb.auth.signOut();
          }
        }
        throw new Error(signUpErr.message);
      }

      if (!signUpData.session) {
        const { data: signInFallback } = await sb.auth.signInWithPassword({
          email: cleanEmail,
          password: passwordPlain,
        });
        if (!signInFallback.session) {
          throw new Error(
            'Account created. Please confirm your email address, then log in to finish submitting your school registration (or disable Confirm email in Supabase Auth settings).'
          );
        }
      }

      const { data: rpcData, error: rpcErr } = await sb.rpc('register_school', {
        p_school_name: cleanSchoolName,
        p_plan_id: resolvedPlan.id,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
      });

      if (rpcErr) {
        throw new Error(rpcErr.message);
      }

      await sb.auth.signOut();

      const schoolId = typeof rpcData === 'string' ? rpcData : rpcData?.school_id || rpcData?.id || '';
      return {
        id: schoolId,
        name: cleanSchoolName,
        email: cleanEmail,
        status: 'pending',
        planId: resolvedPlan.id,
        planName: resolvedPlan.name,
        paidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        registeredAt: getTodayStr(),
        paymentMethod,
        paymentReference,
      };
    } finally {
      this.suppressAuthEvents = false;
    }
  }

  public async approveSchool(schoolId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.rpc('approve_school', { p_school_id: schoolId });
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async rejectSchool(schoolId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.rpc('reject_school', { p_school_id: schoolId });
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async setSchoolStatus(schoolId: string, status: 'active' | 'suspended'): Promise<void> {
    const sb = getSupabase();
    const fn = status === 'suspended' ? 'suspend_school' : 'activate_school';
    const { error } = await sb.rpc(fn, { p_school_id: schoolId });
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async renewSchoolSubscription(
    _schoolId: string,
    planId: string,
    paymentMethod: 'Mobile money' | 'Bank transfer',
    reference?: string
  ): Promise<void> {
    const sb = getSupabase();
    const paymentReference =
      reference || `${paymentMethod === 'Mobile money' ? 'MM' : 'WIRE'}-${Math.floor(100000 + Math.random() * 900000)}`;
    const { error } = await sb.rpc('request_subscription_renewal', {
      p_plan_id: planId,
      p_payment_method: paymentMethod,
      p_reference: paymentReference,
    });
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async updateSchoolAdminPassword(
    schoolId: string,
    userId: string | undefined,
    newPassword: string
  ): Promise<void> {
    const sb = getSupabase();
    const { data, error } = await sb.functions.invoke('reset-school-admin-password', {
      body: { schoolId, userId, newPassword },
    });
    if (error) throw new Error(error.message || 'Failed to reset school admin password');
    if (data?.error) throw new Error(data.error);
  }

  public async resetTeacherPassword(teacherId: string, newPassword: string): Promise<void> {
    const sb = getSupabase();
    const { data, error } = await sb.functions.invoke('reset-teacher-password', {
      body: { teacherId, newPassword },
    });
    if (error) throw new Error(error.message || 'Failed to reset teacher password');
    if (data?.error) throw new Error(data.error);
  }

  public async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    const sb = getSupabase();
    if (!this.currentUser?.email) {
      throw new Error('No authenticated user session.');
    }
    const { error: verifyErr } = await sb.auth.signInWithPassword({
      email: this.currentUser.email,
      password: currentPassword,
    });
    if (verifyErr) {
      throw new Error(verifyErr.message);
    }
    const { error: updateErr } = await sb.auth.updateUser({ password: newPassword });
    if (updateErr) {
      throw new Error(updateErr.message);
    }
  }

  // Academic Years (School Admin)
  public getAcademicYears(schoolId: string): AcademicYear[] {
    return this.data.academicYears.filter((ay) => ay.schoolId === schoolId);
  }

  public getAcademicYearsChronological(schoolId: string): AcademicYear[] {
    return [...this.getAcademicYears(schoolId)].sort(
      (a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name)
    );
  }

  public getActiveAcademicYear(schoolId: string): AcademicYear | undefined {
    const years = this.getAcademicYears(schoolId);
    return years.find((ay) => ay.status === 'Active') || years[0];
  }

  public getSelectedAcademicYearId(schoolId: string): string {
    const years = this.getAcademicYears(schoolId);
    const saved = this.data.selectedAcademicYears?.[schoolId];
    if (saved && years.some((y) => y.id === saved)) {
      return saved;
    }
    return this.getActiveAcademicYear(schoolId)?.id || '';
  }

  public getSelectedAcademicYear(schoolId: string): AcademicYear | undefined {
    const id = this.getSelectedAcademicYearId(schoolId);
    return this.data.academicYears.find((ay) => ay.schoolId === schoolId && ay.id === id);
  }

  public setSelectedAcademicYearId(schoolId: string, academicYearId: string) {
    const exists = this.data.academicYears.some(
      (ay) => ay.schoolId === schoolId && ay.id === academicYearId
    );
    if (!exists) return;
    this.data.selectedAcademicYears[schoolId] = academicYearId;
    this.notify();
  }

  public isAcademicYearReadOnly(schoolId: string, academicYearId?: string): boolean {
    const targetId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    const target = this.data.academicYears.find(
      (ay) => ay.schoolId === schoolId && ay.id === targetId
    );
    if (!target) return false;
    return target.status !== 'Active';
  }

  public getCalendarYearForAcademicYear(ay?: AcademicYear): number {
    if (!ay) return new Date().getFullYear();
    if (ay.endDate) {
      const parsedEnd = parseInt(ay.endDate.split('-')[0], 10);
      if (!isNaN(parsedEnd) && parsedEnd >= 2000) return parsedEnd;
    }
    const yearMatches = ay.name.match(/\b(20\d{2})\b/g);
    if (yearMatches && yearMatches.length > 0) {
      return parseInt(yearMatches[yearMatches.length - 1], 10);
    }
    if (ay.startDate) {
      const parsedStart = parseInt(ay.startDate.split('-')[0], 10);
      if (!isNaN(parsedStart)) return parsedStart;
    }
    return new Date().getFullYear();
  }

  private async carryForwardToYearInDb(
    schoolId: string,
    targetAy: AcademicYear,
    sourceYearId?: string
  ): Promise<void> {
    const sb = getSupabase();
    const targetYearId = targetAy.id;

    // 1. Carry forward Classes
    for (const c of this.data.classes.filter((cls) => cls.schoolId === schoolId)) {
      const inSource = !sourceYearId || !c.availableInYearIds || c.availableInYearIds.includes(sourceYearId);
      if (inSource) {
        const existingYears = c.availableInYearIds || [];
        if (!existingYears.includes(targetYearId)) {
          await sb
            .from('classes')
            .update({ available_in_year_ids: [...existingYears, targetYearId] })
            .eq('id', c.id)
            .eq('school_id', schoolId);
        }
      }
    }

    // 2. Carry forward Teachers + teacher_year_assignments
    for (const t of this.data.teachers.filter((tch) => tch.schoolId === schoolId)) {
      const inSource = !sourceYearId || !t.availableInYearIds || t.availableInYearIds.includes(sourceYearId);
      if (!inSource) continue;

      const existingYears = t.availableInYearIds || [];
      if (!existingYears.includes(targetYearId)) {
        await sb
          .from('teachers')
          .update({ available_in_year_ids: [...existingYears, targetYearId] })
          .eq('id', t.id)
          .eq('school_id', schoolId);
      }

      const hasAssign = this.data.teacherYearAssignments.some(
        (a) => a.schoolId === schoolId && a.teacherId === t.id && a.academicYearId === targetYearId
      );
      if (!hasAssign) {
        const sourceAssign = sourceYearId
          ? this.data.teacherYearAssignments.find(
              (a) => a.schoolId === schoolId && a.teacherId === t.id && a.academicYearId === sourceYearId
            )
          : undefined;
        const classIdsToAssign = sourceAssign?.assignedClassIds || t.assignedClassIds || [];
        for (const clsId of classIdsToAssign) {
          await sb.from('teacher_year_assignments').insert({
            school_id: schoolId,
            teacher_id: t.id,
            class_id: clsId,
            academic_year_id: targetYearId,
          });
        }
      }
    }

    // 3. Carry forward Subjects
    for (const s of this.data.subjects.filter((sbj) => sbj.schoolId === schoolId)) {
      const inSource = !sourceYearId || !s.availableInYearIds || s.availableInYearIds.includes(sourceYearId);
      if (inSource) {
        const existingYears = s.availableInYearIds || [];
        if (!existingYears.includes(targetYearId)) {
          await sb
            .from('subjects')
            .update({ available_in_year_ids: [...existingYears, targetYearId] })
            .eq('id', s.id)
            .eq('school_id', schoolId);
        }
      }
    }

    // 4. Carry forward active Students via student_year_enrollments
    const sourceEnrollments = sourceYearId
      ? this.data.studentYearEnrollments.filter(
          (e) => e.schoolId === schoolId && e.academicYearId === sourceYearId
        )
      : [];
    const targetCalYear = this.getCalendarYearForAcademicYear(targetAy);
    const yearStartFloor = `${targetCalYear}-01-01`;

    const enrollmentRows: Record<string, unknown>[] = [];
    for (const st of this.data.students.filter((s) => s.schoolId === schoolId)) {
      const alreadyEnrolled = this.data.studentYearEnrollments.some(
        (e) => e.schoolId === schoolId && e.studentId === st.id && e.academicYearId === targetYearId
      );
      if (alreadyEnrolled) continue;

      const prevEnr = sourceEnrollments.find((e) => e.studentId === st.id);
      const statusToUse = prevEnr ? prevEnr.enrollmentStatus : st.enrollmentStatus;
      if (statusToUse !== 'Active') continue;

      const origStart = prevEnr?.feeStartDate || st.feeStartDate || st.registrationDate;
      const effectiveFeeStart = origStart && origStart > yearStartFloor ? origStart : yearStartFloor;

      enrollmentRows.push({
        school_id: schoolId,
        student_id: st.id,
        academic_year_id: targetYearId,
        class_id: (prevEnr ? prevEnr.classId : st.classId) || null,
        shift: prevEnr ? prevEnr.shift : st.shift,
        monthly_fee: prevEnr ? prevEnr.monthlyFee : st.monthlyFee,
        fee_start_date: effectiveFeeStart,
        fee_billing_type: prevEnr?.feeBillingType || st.feeBillingType || 'monthly_from_joining_month',
        enrollment_status: 'Active',
      });
    }

    if (enrollmentRows.length > 0) {
      const { error: enrErr } = await sb.from('student_year_enrollments').insert(enrollmentRows);
      if (enrErr) throw new Error(enrErr.message);
    }
  }

  public async addAcademicYear(
    schoolId: string,
    name: string,
    startDate: string,
    endDate: string,
    status: 'Active' | 'Closed'
  ): Promise<AcademicYear> {
    const sb = getSupabase();
    const prevActive = this.getActiveAcademicYear(schoolId);

    if (status === 'Active') {
      await sb
        .from('academic_years')
        .update({ status: 'Closed' })
        .eq('school_id', schoolId);
    }

    const { data, error } = await sb
      .from('academic_years')
      .insert({
        school_id: schoolId,
        name,
        start_date: startDate,
        end_date: endDate,
        status,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add academic year');

    const newAy: AcademicYear = {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status as 'Active' | 'Closed',
    };

    await this.carryForwardToYearInDb(schoolId, newAy, prevActive?.id);

    if (status === 'Active') {
      this.data.selectedAcademicYears[schoolId] = newAy.id;
    }

    await this.loadSessionData();
    return newAy;
  }

  public async activateAcademicYear(schoolId: string, academicYearId: string): Promise<void> {
    const sb = getSupabase();
    const target = this.data.academicYears.find(
      (a) => a.id === academicYearId && a.schoolId === schoolId
    );
    if (!target) return;
    const prevActive = this.getActiveAcademicYear(schoolId);

    await sb
      .from('academic_years')
      .update({ status: 'Closed' })
      .eq('school_id', schoolId)
      .neq('id', academicYearId);

    const { error } = await sb
      .from('academic_years')
      .update({ status: 'Active' })
      .eq('id', academicYearId)
      .eq('school_id', schoolId);
    if (error) throw new Error(error.message);

    await this.carryForwardToYearInDb(
      schoolId,
      target,
      prevActive && prevActive.id !== academicYearId ? prevActive.id : undefined
    );

    this.data.selectedAcademicYears[schoolId] = academicYearId;
    await this.loadSessionData();
  }

  public async updateAcademicYear(
    id: string,
    schoolId: string,
    updates: Partial<AcademicYear>
  ): Promise<void> {
    const sb = getSupabase();
    const ay = this.data.academicYears.find((a) => a.id === id && a.schoolId === schoolId);
    if (!ay) return;
    const prevActive = this.getActiveAcademicYear(schoolId);

    if (updates.status === 'Active') {
      await sb
        .from('academic_years')
        .update({ status: 'Closed' })
        .eq('school_id', schoolId)
        .neq('id', id);
    }

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await sb
      .from('academic_years')
      .update(dbUpdates)
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw new Error(error.message);

    if (updates.status === 'Active') {
      await this.carryForwardToYearInDb(
        schoolId,
        { ...ay, ...updates },
        prevActive && prevActive.id !== id ? prevActive.id : undefined
      );
      this.data.selectedAcademicYears[schoolId] = id;
    }

    await this.loadSessionData();
  }

  // Classes (School Admin / Teacher)
  public getClasses(schoolId: string, academicYearId?: string): ClassRoom[] {
    if (!academicYearId) {
      return this.data.classes.filter((c) => c.schoolId === schoolId);
    }
    return this.data.classes
      .filter(
        (c) =>
          c.schoolId === schoolId &&
          (!c.availableInYearIds ||
            c.availableInYearIds.length === 0 ||
            c.availableInYearIds.includes(academicYearId))
      )
      .map((c) => ({
        ...c,
        teacherId: c.teacherByYear?.[academicYearId] ?? c.teacherId,
      }));
  }

  public getClassById(id: string): ClassRoom | undefined {
    return this.data.classes.find((c) => c.id === id);
  }

  public async addClass(
    schoolId: string,
    name: string,
    teacherId?: string,
    academicYearId?: string
  ): Promise<ClassRoom> {
    const activeAy = this.getActiveAcademicYear(schoolId);
    const ayId = academicYearId || activeAy?.id;
    if (ayId && this.isAcademicYearReadOnly(schoolId, ayId)) {
      throw new Error('Historical academic year is read-only.');
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('classes')
      .insert({
        school_id: schoolId,
        name,
        teacher_id: teacherId || null,
        academic_year_id: ayId || null,
        available_in_year_ids: ayId ? [ayId] : [],
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add class');

    if (teacherId && ayId) {
      await sb.from('teacher_year_assignments').insert({
        school_id: schoolId,
        teacher_id: teacherId,
        class_id: data.id,
        academic_year_id: ayId,
      });
    }

    await this.loadSessionData();
    return this.data.classes.find((c) => c.id === data.id) || {
      id: data.id,
      schoolId,
      name,
      teacherId,
      academicYearId: ayId,
      availableInYearIds: ayId ? [ayId] : [],
      createdAt: getTodayStr(),
    };
  }

  // Teachers (School Admin)
  public getTeachers(schoolId: string, academicYearId?: string): Teacher[] {
    if (!academicYearId) {
      return this.data.teachers.filter((t) => t.schoolId === schoolId);
    }
    return this.data.teachers
      .filter(
        (t) =>
          t.schoolId === schoolId &&
          (!t.availableInYearIds ||
            t.availableInYearIds.length === 0 ||
            t.availableInYearIds.includes(academicYearId))
      )
      .map((t) => {
        const assign = this.data.teacherYearAssignments?.find(
          (a) => a.schoolId === schoolId && a.teacherId === t.id && a.academicYearId === academicYearId
        );
        return assign
          ? { ...t, assignedClassIds: assign.assignedClassIds, subjects: assign.subjects }
          : t;
      });
  }

  public getTeacherById(id: string, academicYearId?: string): Teacher | undefined {
    const t = this.data.teachers.find((tch) => tch.id === id);
    if (!t || !academicYearId) return t;
    const assign = this.data.teacherYearAssignments?.find(
      (a) => a.schoolId === t.schoolId && a.teacherId === t.id && a.academicYearId === academicYearId
    );
    return assign
      ? { ...t, assignedClassIds: assign.assignedClassIds, subjects: assign.subjects }
      : t;
  }

  public async addTeacher(
    schoolId: string,
    name: string,
    email: string,
    passwordPlain: string,
    classId?: string,
    academicYearId?: string
  ): Promise<Teacher> {
    const activeAy = this.getActiveAcademicYear(schoolId);
    const ayId = academicYearId || activeAy?.id;
    if (ayId && this.isAcademicYearReadOnly(schoolId, ayId)) {
      throw new Error('Historical academic year is read-only.');
    }

    const sb = getSupabase();
    const { data, error } = await sb.functions.invoke('create-teacher', {
      body: {
        fullName: name,
        email,
        password: passwordPlain,
        classId: classId || null,
        academicYearId: ayId || null,
      },
    });

    if (error) throw new Error(error.message || 'Failed to create teacher');
    if (data?.error) throw new Error(data.error);

    await this.loadSessionData();
    const createdId = data?.teacher?.id;
    const created = this.data.teachers.find((t) => t.id === createdId);
    if (created) return created;

    return {
      id: createdId || '',
      schoolId,
      userId: data?.teacher?.user_id || '',
      name,
      email,
      assignedClassIds: classId ? [classId] : [],
      subjects: [],
      academicYearId: ayId,
      availableInYearIds: ayId ? [ayId] : [],
    };
  }

  // Subjects
  public getSubjects(schoolId: string, academicYearId?: string): Subject[] {
    if (!academicYearId) {
      return this.data.subjects.filter((s) => s.schoolId === schoolId);
    }
    return this.data.subjects.filter(
      (s) =>
        s.schoolId === schoolId &&
        (!s.availableInYearIds ||
          s.availableInYearIds.length === 0 ||
          s.availableInYearIds.includes(academicYearId))
    );
  }

  public async addSubject(
    schoolId: string,
    name: string,
    classId: string,
    teacherId: string,
    academicYearId?: string
  ): Promise<Subject> {
    const activeAy = this.getActiveAcademicYear(schoolId);
    const ayId = academicYearId || activeAy?.id;
    if (ayId && this.isAcademicYearReadOnly(schoolId, ayId)) {
      throw new Error('Historical academic year is read-only.');
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('subjects')
      .insert({
        school_id: schoolId,
        name,
        class_id: classId,
        teacher_id: teacherId || null,
        academic_year_id: ayId || null,
        available_in_year_ids: ayId ? [ayId] : [],
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add subject');
    await this.loadSessionData();
    return this.data.subjects.find((s) => s.id === data.id) || {
      id: data.id,
      schoolId,
      name,
      classId,
      teacherId,
      academicYearId: ayId,
      availableInYearIds: ayId ? [ayId] : [],
    };
  }

  public async updateSubject(
    id: string,
    schoolId: string,
    updates: Partial<Subject>
  ): Promise<void> {
    const sb = getSupabase();
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.classId !== undefined) dbUpdates.class_id = updates.classId;
    if (updates.teacherId !== undefined) dbUpdates.teacher_id = updates.teacherId || null;

    const { error } = await sb
      .from('subjects')
      .update(dbUpdates)
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async deleteSubject(id: string, schoolId: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async updateClassTeacherForYear(
    schoolId: string,
    classId: string,
    teacherId: string | undefined,
    academicYearId?: string
  ): Promise<void> {
    const targetAyId =
      academicYearId || this.getSelectedAcademicYearId(schoolId) || this.getActiveAcademicYear(schoolId)?.id;
    if (targetAyId && this.isAcademicYearReadOnly(schoolId, targetAyId)) {
      throw new Error('Historical academic year is read-only.');
    }

    const sb = getSupabase();
    const activeAy = this.getActiveAcademicYear(schoolId);

    if (targetAyId) {
      const { error: delErr } = await sb
        .from('teacher_year_assignments')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('academic_year_id', targetAyId);
      if (delErr) throw new Error(delErr.message);

      if (teacherId) {
        const { error: insErr } = await sb.from('teacher_year_assignments').insert({
          school_id: schoolId,
          teacher_id: teacherId,
          class_id: classId,
          academic_year_id: targetAyId,
        });
        if (insErr) throw new Error(insErr.message);
      }
    }

    if (!targetAyId || targetAyId === activeAy?.id) {
      const { error: clsErr } = await sb
        .from('classes')
        .update({ teacher_id: teacherId || null })
        .eq('id', classId)
        .eq('school_id', schoolId);
      if (clsErr) throw new Error(clsErr.message);
    }

    await this.loadSessionData();
  }

  // Students (School Admin) — NEVER delete students; only update enrollmentStatus to 'Inactive'
  public getStudentEnrollmentForYear(
    schoolId: string,
    studentId: string,
    academicYearId: string
  ): StudentYearEnrollment | undefined {
    return this.data.studentYearEnrollments?.find(
      (e) => e.schoolId === schoolId && e.studentId === studentId && e.academicYearId === academicYearId
    );
  }

  public getAllBaseStudents(schoolId: string): Student[] {
    return this.data.students.filter((s) => s.schoolId === schoolId);
  }

  public getStudents(schoolId: string, academicYearId?: string): Student[] {
    const resolvedAyId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    const baseStudents = this.data.students.filter((s) => s.schoolId === schoolId);
    if (!resolvedAyId) return baseStudents;

    const enrollments = (this.data.studentYearEnrollments || []).filter(
      (e) => e.schoolId === schoolId && e.academicYearId === resolvedAyId
    );
    if (enrollments.length === 0 && this.data.academicYears.length === 0) {
      return baseStudents;
    }
    const enrollmentMap = new Map<string, StudentYearEnrollment>();
    enrollments.forEach((e) => enrollmentMap.set(e.studentId, e));

    return baseStudents
      .filter((s) => enrollmentMap.has(s.id) || s.registeredAcademicYearId === resolvedAyId)
      .map((s) => {
        const enr = enrollmentMap.get(s.id);
        if (!enr) return s;
        return {
          ...s,
          classId: enr.classId,
          shift: enr.shift,
          monthlyFee: enr.monthlyFee,
          feeStartDate: enr.feeStartDate || s.feeStartDate || s.registrationDate,
          feeBillingType: enr.feeBillingType || s.feeBillingType || 'monthly_from_joining_month',
          enrollmentStatus: enr.enrollmentStatus,
        };
      });
  }

  public getStudentById(id: string, academicYearId?: string): Student | undefined {
    const s = this.data.students.find((st) => st.id === id);
    if (!s) return undefined;
    const resolvedAyId = academicYearId || this.getSelectedAcademicYearId(s.schoolId);
    if (!resolvedAyId) return s;

    const enr = this.getStudentEnrollmentForYear(s.schoolId, s.id, resolvedAyId);
    if (!enr) return s;

    return {
      ...s,
      classId: enr.classId,
      shift: enr.shift,
      monthlyFee: enr.monthlyFee,
      feeStartDate: enr.feeStartDate || s.feeStartDate || s.registrationDate,
      feeBillingType: enr.feeBillingType || s.feeBillingType || 'monthly_from_joining_month',
      enrollmentStatus: enr.enrollmentStatus,
    };
  }

  public async addStudent(
    schoolId: string,
    data: {
      name: string;
      studentIdNumber: string;
      classId: string;
      guardianName: string;
      guardianPhone: string;
      guardianAddress?: string;
      shift: ShiftType;
      monthlyFee: number;
      registrationDate: string;
      feeStartDate?: string;
      feeBillingType?: FeeBillingType;
      enrollmentStatus: EnrollmentStatus;
      notes?: string;
    },
    academicYearId?: string
  ): Promise<Student> {
    const activeAy = this.getActiveAcademicYear(schoolId);
    const targetAyId = academicYearId || activeAy?.id;
    if (targetAyId && this.isAcademicYearReadOnly(schoolId, targetAyId)) {
      throw new Error(
        'Historical academic year is read-only. Switch to an Active academic year to register students.'
      );
    }

    const feeStartDate =
      data.feeStartDate && data.feeStartDate.trim() !== '' ? data.feeStartDate : data.registrationDate;
    const feeBillingType = data.feeBillingType || 'monthly_from_joining_month';

    const sb = getSupabase();
    const { data: inserted, error } = await sb
      .from('students')
      .insert({
        school_id: schoolId,
        student_id_number: data.studentIdNumber,
        name: data.name,
        class_id: data.classId || null,
        guardian_name: data.guardianName,
        guardian_phone: data.guardianPhone,
        guardian_address: data.guardianAddress || null,
        shift: data.shift,
        monthly_fee: data.monthlyFee,
        registration_date: data.registrationDate,
        fee_start_date: feeStartDate,
        fee_billing_type: feeBillingType,
        enrollment_status: data.enrollmentStatus,
        notes: data.notes || null,
        registered_academic_year_id: targetAyId || null,
      })
      .select()
      .single();

    if (error || !inserted) throw new Error(error?.message || 'Failed to register student');

    if (targetAyId) {
      const { error: enrErr } = await sb.from('student_year_enrollments').insert({
        school_id: schoolId,
        student_id: inserted.id,
        academic_year_id: targetAyId,
        class_id: data.classId || null,
        shift: data.shift,
        monthly_fee: data.monthlyFee,
        fee_start_date: feeStartDate,
        fee_billing_type: feeBillingType,
        enrollment_status: data.enrollmentStatus,
      });
      if (enrErr) throw new Error(enrErr.message);
    }

    await this.loadSessionData();
    return this.getStudentById(inserted.id, targetAyId) || {
      id: inserted.id,
      schoolId,
      ...data,
      feeStartDate,
      feeBillingType,
      registeredAcademicYearId: targetAyId,
    };
  }

  public async updateStudent(
    id: string,
    schoolId: string,
    updates: Partial<Student>,
    academicYearId?: string
  ): Promise<void> {
    const targetAyId =
      academicYearId || this.getSelectedAcademicYearId(schoolId) || this.getActiveAcademicYear(schoolId)?.id;
    if (targetAyId && this.isAcademicYearReadOnly(schoolId, targetAyId)) {
      throw new Error('Historical academic year is read-only.');
    }

    const student = this.data.students.find((s) => s.id === id && s.schoolId === schoolId);
    if (!student) return;

    const sb = getSupabase();
    const activeAy = this.getActiveAcademicYear(schoolId);
    const dbBaseUpdates: Record<string, unknown> = {};

    if (!targetAyId || targetAyId === activeAy?.id) {
      if (updates.name !== undefined) dbBaseUpdates.name = updates.name;
      if (updates.studentIdNumber !== undefined) dbBaseUpdates.student_id_number = updates.studentIdNumber;
      if (updates.classId !== undefined) dbBaseUpdates.class_id = updates.classId || null;
      if (updates.guardianName !== undefined) dbBaseUpdates.guardian_name = updates.guardianName;
      if (updates.guardianPhone !== undefined) dbBaseUpdates.guardian_phone = updates.guardianPhone;
      if (updates.guardianAddress !== undefined) dbBaseUpdates.guardian_address = updates.guardianAddress || null;
      if (updates.shift !== undefined) dbBaseUpdates.shift = updates.shift;
      if (updates.monthlyFee !== undefined) dbBaseUpdates.monthly_fee = updates.monthlyFee;
      if (updates.registrationDate !== undefined) dbBaseUpdates.registration_date = updates.registrationDate;
      if (updates.feeStartDate !== undefined) dbBaseUpdates.fee_start_date = updates.feeStartDate || null;
      if (updates.feeBillingType !== undefined) dbBaseUpdates.fee_billing_type = updates.feeBillingType;
      if (updates.enrollmentStatus !== undefined) dbBaseUpdates.enrollment_status = updates.enrollmentStatus;
      if (updates.notes !== undefined) dbBaseUpdates.notes = updates.notes || null;
    } else {
      if (updates.name !== undefined) dbBaseUpdates.name = updates.name;
      if (updates.studentIdNumber !== undefined) dbBaseUpdates.student_id_number = updates.studentIdNumber;
      if (updates.guardianName !== undefined) dbBaseUpdates.guardian_name = updates.guardianName;
      if (updates.guardianPhone !== undefined) dbBaseUpdates.guardian_phone = updates.guardianPhone;
      if (updates.guardianAddress !== undefined) dbBaseUpdates.guardian_address = updates.guardianAddress || null;
      if (updates.notes !== undefined) dbBaseUpdates.notes = updates.notes || null;
      if (updates.registrationDate !== undefined) dbBaseUpdates.registration_date = updates.registrationDate;
    }

    if (Object.keys(dbBaseUpdates).length > 0) {
      const { error } = await sb
        .from('students')
        .update(dbBaseUpdates)
        .eq('id', id)
        .eq('school_id', schoolId);
      if (error) throw new Error(error.message);
    }

    if (targetAyId) {
      const existingEnr = this.getStudentEnrollmentForYear(schoolId, id, targetAyId);
      const enrPayload = {
        school_id: schoolId,
        student_id: id,
        academic_year_id: targetAyId,
        class_id: (updates.classId !== undefined ? updates.classId : existingEnr?.classId ?? student.classId) || null,
        shift: updates.shift ?? existingEnr?.shift ?? student.shift,
        monthly_fee: updates.monthlyFee ?? existingEnr?.monthlyFee ?? student.monthlyFee,
        fee_start_date:
          updates.feeStartDate ?? existingEnr?.feeStartDate ?? student.feeStartDate ?? student.registrationDate,
        fee_billing_type:
          updates.feeBillingType ??
          existingEnr?.feeBillingType ??
          student.feeBillingType ??
          'monthly_from_joining_month',
        enrollment_status: updates.enrollmentStatus ?? existingEnr?.enrollmentStatus ?? student.enrollmentStatus,
      };

      if (existingEnr) {
        const { error } = await sb
          .from('student_year_enrollments')
          .update(enrPayload)
          .eq('id', existingEnr.id)
          .eq('school_id', schoolId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sb.from('student_year_enrollments').insert(enrPayload);
        if (error) throw new Error(error.message);
      }
    }

    await this.loadSessionData();
  }

  // Attendance (Academic Year-Isolated, written strictly via take_attendance RPC)
  public getAttendance(schoolId: string, academicYearId?: string): AttendanceRecord[] {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    return this.data.attendance.filter(
      (a) => a.schoolId === schoolId && (!ayId || a.academicYearId === ayId)
    );
  }

  public getAttendanceForClassAndDate(
    schoolId: string,
    classId: string,
    date: string,
    academicYearId?: string
  ): AttendanceRecord[] {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    return this.data.attendance.filter(
      (a) =>
        a.schoolId === schoolId &&
        a.classId === classId &&
        a.date === date &&
        (!ayId || a.academicYearId === ayId)
    );
  }

  public async saveAttendance(
    schoolId: string,
    classId: string,
    date: string,
    records: { studentId: string; status: AttendanceStatus }[],
    academicYearId?: string
  ): Promise<void> {
    const ayId =
      academicYearId || this.getSelectedAcademicYearId(schoolId) || this.getActiveAcademicYear(schoolId)?.id;
    if (ayId && this.isAcademicYearReadOnly(schoolId, ayId)) {
      throw new Error('Historical academic year is read-only. Attendance cannot be modified.');
    }

    const sb = getSupabase();
    const { error } = await sb.rpc('take_attendance', {
      p_class_id: classId,
      p_date: date,
      p_records: records.map((r) => ({ student_id: r.studentId, status: r.status })),
      p_academic_year_id: ayId || null,
    });
    if (error) throw new Error(error.message);

    await this.loadSessionData();
  }

  public getAttendanceHistory(
    schoolId: string,
    classIdFilter?: string,
    fromDate?: string,
    toDate?: string,
    academicYearId?: string
  ) {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    let list = this.data.attendance.filter(
      (a) => a.schoolId === schoolId && (!ayId || a.academicYearId === ayId)
    );

    if (classIdFilter && classIdFilter !== 'all') {
      list = list.filter((a) => a.classId === classIdFilter);
    }
    if (fromDate) {
      list = list.filter((a) => a.date >= fromDate);
    }
    if (toDate) {
      list = list.filter((a) => a.date <= toDate);
    }

    const groups: {
      [key: string]: { date: string; classId: string; present: number; absent: number; late: number; total: number };
    } = {};

    list.forEach((rec) => {
      const key = `${rec.date}_${rec.classId}`;
      if (!groups[key]) {
        groups[key] = { date: rec.date, classId: rec.classId, present: 0, absent: 0, late: 0, total: 0 };
      }
      groups[key].total += 1;
      if (rec.status === 'present') groups[key].present += 1;
      else if (rec.status === 'absent') groups[key].absent += 1;
      else if (rec.status === 'late') groups[key].late += 1;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }

  public getStudentAttendanceStats(schoolId: string, studentId: string, academicYearId?: string) {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    const records = this.data.attendance.filter(
      (a) => a.schoolId === schoolId && a.studentId === studentId && (!ayId || a.academicYearId === ayId)
    );
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    return { present, absent, late, total, percentage };
  }

  public getSchoolAttendanceSummary(
    schoolId: string,
    academicYearId?: string,
    dateStr: string = getTodayStr()
  ) {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    const records = this.data.attendance.filter(
      (a) => a.schoolId === schoolId && (!ayId || a.academicYearId === ayId)
    );
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    const todayRecords = records.filter((r) => r.date === dateStr);
    const todayPresent = todayRecords.filter((r) => r.status === 'present').length;
    const todayAbsent = todayRecords.filter((r) => r.status === 'absent').length;
    const todayLate = todayRecords.filter((r) => r.status === 'late').length;
    const todayTotal = todayRecords.length;
    const todayPercentage =
      todayTotal > 0 ? Math.round(((todayPresent + todayLate * 0.5) / todayTotal) * 100) : 0;

    return {
      total,
      present,
      absent,
      late,
      percentage,
      todayTotal,
      todayPresent,
      todayAbsent,
      todayLate,
      todayPercentage,
    };
  }

  // Fees & Billing (Reads from hydrated cache; ALL writes strictly through RPCs)
  public getFeeBills(schoolId: string, academicYearId?: string): FeeBill[] {
    if (academicYearId === 'all') {
      return this.data.feeBills.filter((b) => b.schoolId === schoolId);
    }
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    return this.data.feeBills.filter(
      (b) => b.schoolId === schoolId && (!ayId || b.academicYearId === ayId)
    );
  }

  public getFeePayments(schoolId: string, academicYearId?: string): FeePayment[] {
    if (academicYearId === 'all') {
      return this.data.feePayments.filter((p) => p.schoolId === schoolId);
    }
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    return this.data.feePayments.filter(
      (p) => p.schoolId === schoolId && (!ayId || p.academicYearId === ayId)
    );
  }

  public getBillingRuns(schoolId: string, academicYearId?: string): BillingRun[] {
    if (academicYearId === 'all') {
      return this.data.billingRuns.filter((r) => r.schoolId === schoolId);
    }
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    return this.data.billingRuns.filter(
      (r) => r.schoolId === schoolId && (!ayId || r.academicYearId === ayId)
    );
  }

  public async createMonthlyBillingRun(
    schoolId: string,
    month: string,
    classId: string, // 'all' or specific classId
    feeType: 'student_fee' | 'custom',
    customFeeAmount: number,
    dueDate: string,
    academicYearId?: string
  ): Promise<{ success: boolean; studentsBilled: number; totalBilled: number; message?: string }> {
    const ayId =
      academicYearId || this.getSelectedAcademicYearId(schoolId) || this.getActiveAcademicYear(schoolId)?.id;
    if (ayId && this.isAcademicYearReadOnly(schoolId, ayId)) {
      return {
        success: false,
        studentsBilled: 0,
        totalBilled: 0,
        message: 'Cannot run monthly billing inside a closed historical academic year.',
      };
    }

    const prevRunIds = new Set(this.data.billingRuns.map((r) => r.id));
    const sb = getSupabase();
    const { data, error } = await sb.rpc('bill_students', {
      p_month: month,
      p_class_id: classId === 'all' ? null : classId,
      p_fee_mode: feeType,
      p_custom_amount: feeType === 'custom' ? customFeeAmount : null,
      p_due_date: dueDate,
      p_academic_year_id: ayId || null,
    });

    if (error) {
      return {
        success: false,
        studentsBilled: 0,
        totalBilled: 0,
        message: error.message,
      };
    }

    await this.loadSessionData();

    if (data && typeof data === 'object') {
      const billed = Number(data.students_billed ?? data.studentsBilled ?? 0);
      const total = Number(data.total_billed ?? data.totalBilled ?? 0);
      if (billed > 0 || data.success === false) {
        return {
          success: data.success !== false && billed > 0,
          studentsBilled: billed,
          totalBilled: total,
          message: data.message,
        };
      }
    }

    const newRun = this.data.billingRuns.find((r) => !prevRunIds.has(r.id) && r.month === month);
    if (newRun) {
      return {
        success: true,
        studentsBilled: newRun.studentsBilledCount,
        totalBilled: newRun.totalBilledAmount,
      };
    }

    return {
      success: false,
      studentsBilled: 0,
      totalBilled: 0,
      message: 'All eligible students in this academic year have already been billed for this month.',
    };
  }

  public async recordPayment(
    schoolId: string,
    studentId: string,
    amount: number,
    date: string,
    method: PaymentMethod,
    monthsCovered: string[],
    note?: string,
    academicYearId?: string
  ): Promise<FeePayment> {
    const activeAy = this.getActiveAcademicYear(schoolId);
    const targetAyId = academicYearId || this.getSelectedAcademicYearId(schoolId) || activeAy?.id;

    const sb = getSupabase();
    const { data, error } = await sb.rpc('record_payment', {
      p_student_id: studentId,
      p_amount: amount,
      p_date_received: date,
      p_method: method,
      p_months_covered: monthsCovered,
      p_note: note || null,
      p_academic_year_id: targetAyId || null,
    });

    if (error) throw new Error(error.message);

    await this.loadSessionData();

    const newPaymentId = typeof data === 'string' ? data : data?.id || data?.payment_id;
    if (newPaymentId) {
      const found = this.data.feePayments.find((p) => p.id === newPaymentId);
      if (found) return found;
    }

    return (
      this.data.feePayments.find(
        (p) => p.studentId === studentId && p.amount === amount && p.date === date && !p.isVoided
      ) || {
        id: newPaymentId || '',
        schoolId,
        academicYearId: targetAyId,
        recordedDuringAcademicYearId: activeAy?.id || targetAyId,
        studentId,
        amount,
        date,
        method,
        monthsCovered,
        note,
        isVoided: false,
        createdAt: getTodayStr(),
      }
    );
  }

  public async voidPayment(paymentId: string, schoolId: string): Promise<void> {
    const payment = this.data.feePayments.find((p) => p.id === paymentId && p.schoolId === schoolId);
    if (payment?.academicYearId && this.isAcademicYearReadOnly(schoolId, payment.academicYearId)) {
      throw new Error('Historical academic year payment records are read-only.');
    }

    const sb = getSupabase();
    const { error } = await sb.rpc('void_payment', { p_payment_id: paymentId });
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async updatePayment(
    paymentId: string,
    schoolId: string,
    updates: { amount?: number; date?: string; method?: PaymentMethod; monthsCovered?: string[]; note?: string }
  ): Promise<void> {
    const payment = this.data.feePayments.find((p) => p.id === paymentId && p.schoolId === schoolId);
    if (payment?.academicYearId && this.isAcademicYearReadOnly(schoolId, payment.academicYearId)) {
      throw new Error('Historical academic year payment records are read-only.');
    }

    const sb = getSupabase();
    const { error } = await sb.rpc('update_payment', {
      p_payment_id: paymentId,
      p_amount: updates.amount ?? payment?.amount,
      p_date_received: updates.date ?? payment?.date,
      p_method: updates.method ?? payment?.method,
      p_months_covered: updates.monthsCovered ?? payment?.monthsCovered ?? [],
      p_note: updates.note !== undefined ? updates.note : payment?.note ?? null,
    });
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  public async updateStudentFeeSettings(
    schoolId: string,
    studentId: string,
    feeStartDate: string,
    feeBillingType: FeeBillingType,
    monthlyFee: number,
    academicYearId?: string
  ): Promise<void> {
    const targetAyId =
      academicYearId || this.getSelectedAcademicYearId(schoolId) || this.getActiveAcademicYear(schoolId)?.id;
    if (targetAyId && this.isAcademicYearReadOnly(schoolId, targetAyId)) {
      throw new Error('Historical academic year is read-only.');
    }
    await this.updateStudent(
      studentId,
      schoolId,
      { feeStartDate, feeBillingType, monthlyFee },
      targetAyId
    );
  }

  private computeStandaloneYearFeeDetails(
    schoolId: string,
    studentBase: Student,
    targetAy: AcademicYear
  ): StudentFeeHistoryDetails {
    const todayStr = getTodayStr();
    const enr = this.getStudentEnrollmentForYear(schoolId, studentBase.id, targetAy.id);
    const student: Student = enr
      ? {
          ...studentBase,
          classId: enr.classId,
          shift: enr.shift,
          monthlyFee: enr.monthlyFee,
          feeStartDate: enr.feeStartDate || studentBase.feeStartDate || studentBase.registrationDate,
          feeBillingType: enr.feeBillingType || studentBase.feeBillingType || 'monthly_from_joining_month',
          enrollmentStatus: enr.enrollmentStatus,
        }
      : studentBase;

    const targetCalYear = this.getCalendarYearForAcademicYear(targetAy);
    const monthlyFee = Number(student.monthlyFee) || 0;
    const registrationDate = student.registrationDate || `${targetCalYear}-01-01`;
    const feeStartDate =
      student.feeStartDate && student.feeStartDate.trim() !== '' ? student.feeStartDate : registrationDate;
    const feeBillingType: FeeBillingType = student.feeBillingType || 'monthly_from_joining_month';

    const payments = this.data.feePayments.filter(
      (p) =>
        p.schoolId === schoolId &&
        p.studentId === studentBase.id &&
        !p.isVoided &&
        p.academicYearId === targetAy.id
    );
    const existingBills = this.data.feeBills.filter(
      (b) => b.schoolId === schoolId && b.studentId === studentBase.id && b.academicYearId === targetAy.id
    );

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const shortMonthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const [startYearRaw, startMonthRaw, startDayRaw] = feeStartDate.split('-').map(Number);
    const sYear = startYearRaw || targetCalYear;
    const sMonth = startMonthRaw || 1;
    const sDay = startDayRaw || 1;

    const schoolBills = this.data.feeBills.filter(
      (b) => b.schoolId === schoolId && b.academicYearId === targetAy.id
    );
    let activeBilledMonth = 0;
    let activeBilledYear = targetCalYear;
    if (schoolBills.length > 0) {
      schoolBills.forEach((b) => {
        const bYear = b.year || targetCalYear;
        const bMonth = b.monthIndex || 1;
        if (bYear > activeBilledYear || (bYear === activeBilledYear && bMonth > activeBilledMonth)) {
          activeBilledYear = bYear;
          activeBilledMonth = bMonth;
        }
      });
    }

    const monthsBreakdown: StudentMonthlyFeeRecord[] = [];
    for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
      const year = targetCalYear;
      const monthKey = `${year}-${String(monthIndex).padStart(2, '0')}`;
      const monthName = `${monthNames[monthIndex - 1]} ${year}`;
      const shortMonth = `${shortMonthNames[monthIndex - 1]} ${year}`;
      const dueDate = `${year}-${String(monthIndex).padStart(2, '0')}-25`;

      const isBeforeEnrollment = year < sYear || (year === sYear && monthIndex < sMonth);

      let expectedFee = isBeforeEnrollment ? 0 : monthlyFee;
      const existingBill = existingBills.find(
        (b) => b.month === monthName || (b.year === year && b.monthIndex === monthIndex)
      );

      if (existingBill) {
        expectedFee = existingBill.amount;
      } else if (feeBillingType === 'exact_date' && year === sYear && monthIndex === sMonth) {
        const daysInMonth = new Date(year, monthIndex, 0).getDate();
        const activeDays = Math.max(1, daysInMonth - sDay + 1);
        expectedFee = Math.round(((activeDays / daysInMonth) * monthlyFee) * 100) / 100;
      }

      const isBilledCycle =
        activeBilledMonth > 0 &&
        !isBeforeEnrollment &&
        (year < activeBilledYear || (year === activeBilledYear && monthIndex <= activeBilledMonth));

      monthsBreakdown.push({
        monthKey,
        monthName,
        shortMonth,
        year,
        monthIndex,
        dueDate,
        expectedFee,
        paidAmount: 0,
        balance: expectedFee,
        status: isBeforeEnrollment ? 'Paid' : 'Unpaid',
        isOverdue: !isBeforeEnrollment && isBilledCycle && dueDate < todayStr,
        isBilled: isBilledCycle,
        isAdvance: !isBeforeEnrollment && !isBilledCycle,
        academicYearId: targetAy.id,
      });
    }

    const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    let unallocatedPool = 0;

    const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));

    sortedPayments.forEach((payment) => {
      let remainingForPayment = Number(payment.amount) || 0;
      const covered = (payment.monthsCovered || []).map((m) => m.toLowerCase().trim());

      if (covered.length > 0) {
        monthsBreakdown.forEach((record) => {
          if (remainingForPayment <= 0 || record.expectedFee <= 0 || record.balance <= 0) return;
          const shortOnly = shortMonthNames[record.monthIndex - 1].toLowerCase();
          const fullOnly = monthNames[record.monthIndex - 1].toLowerCase();
          const matchesMonth = covered.some(
            (c) =>
              c === shortOnly ||
              c === fullOnly ||
              c === record.shortMonth.toLowerCase() ||
              c === record.monthName.toLowerCase() ||
              c === record.monthKey.toLowerCase()
          );
          if (matchesMonth) {
            const toApply = Math.min(record.balance, remainingForPayment);
            record.paidAmount = Math.round((record.paidAmount + toApply) * 100) / 100;
            record.balance = Math.max(0, Math.round((record.expectedFee - record.paidAmount) * 100) / 100);
            remainingForPayment = Math.max(0, Math.round((remainingForPayment - toApply) * 100) / 100);
          }
        });
      }

      unallocatedPool += remainingForPayment;
    });

    if (unallocatedPool > 0) {
      monthsBreakdown.forEach((record) => {
        if (record.expectedFee <= 0 || record.balance <= 0 || unallocatedPool <= 0) return;
        const allocated = Math.min(record.balance, unallocatedPool);
        record.paidAmount = Math.round((record.paidAmount + allocated) * 100) / 100;
        record.balance = Math.max(0, Math.round((record.expectedFee - record.paidAmount) * 100) / 100);
        unallocatedPool = Math.max(0, Math.round((unallocatedPool - allocated) * 100) / 100);
      });
    }

    monthsBreakdown.forEach((record) => {
      if (record.expectedFee === 0) return;

      if (record.balance <= 0) {
        record.status = 'Paid';
        record.isOverdue = false;
      } else if (record.paidAmount > 0) {
        record.status = 'Partial';
        record.isOverdue = Boolean(record.isBilled) && record.dueDate < todayStr;
      } else {
        record.isOverdue = Boolean(record.isBilled) && record.dueDate < todayStr;
        record.status = record.isOverdue ? 'Overdue' : 'Unpaid';
      }
    });

    const activeBilledRecords = monthsBreakdown.filter(
      (m) => m.expectedFee > 0 && (m.isBilled || m.paidAmount > 0)
    );
    const totalFeesExpected = activeBilledRecords.reduce((sum, m) => sum + m.expectedFee, 0);
    const remainingBalance = Math.max(0, Math.round((totalFeesExpected - totalAmountPaid) * 100) / 100);

    const totalMonthsExpected = activeBilledRecords.length;
    const totalMonthsPaid = activeBilledRecords.filter((m) => m.status === 'Paid').length;
    const totalMonthsUnpaid = activeBilledRecords.filter(
      (m) => m.status === 'Unpaid' || m.status === 'Overdue'
    ).length;
    const totalMonthsPartial = activeBilledRecords.filter((m) => m.status === 'Partial').length;

    let lastMonthPaid = 'None';
    for (let i = monthsBreakdown.length - 1; i >= 0; i--) {
      if (monthsBreakdown[i].paidAmount > 0) {
        lastMonthPaid = monthsBreakdown[i].shortMonth;
        break;
      }
    }

    let overallStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' = 'Paid';
    if (totalMonthsExpected === 0 || remainingBalance === 0) {
      overallStatus = 'Paid';
    } else if (totalAmountPaid > 0) {
      overallStatus = 'Partial';
    } else if (activeBilledRecords.some((m) => m.status === 'Overdue')) {
      overallStatus = 'Overdue';
    } else {
      overallStatus = 'Unpaid';
    }

    return {
      student,
      academicYearId: targetAy.id,
      academicYearName: targetAy.name,
      monthlyFee,
      registrationDate,
      feeStartDate,
      feeBillingType,
      monthsBreakdown,
      totalMonthsExpected,
      totalMonthsPaid,
      totalMonthsUnpaid,
      totalMonthsPartial,
      totalFeesExpected,
      totalAmountPaid,
      remainingBalance,
      previousYearDebts: [],
      previousYearsOutstanding: 0,
      combinedOutstandingBalance: remainingBalance,
      lastMonthPaid,
      overallStatus,
      payments,
    };
  }

  public getStudentFeeHistoryDetails(
    schoolId: string,
    studentId: string,
    academicYearId?: string
  ): StudentFeeHistoryDetails | null {
    const studentBase = this.data.students.find((s) => s.id === studentId && s.schoolId === schoolId);
    if (!studentBase) return null;

    const chronYears = this.getAcademicYearsChronological(schoolId);
    const resolvedAyId =
      academicYearId || this.getSelectedAcademicYearId(schoolId) || this.getActiveAcademicYear(schoolId)?.id;
    const targetAy =
      chronYears.find((y) => y.id === resolvedAyId) ||
      this.getActiveAcademicYear(schoolId) ||
      chronYears[0];

    if (!targetAy) return null;

    const currentDetails = this.computeStandaloneYearFeeDetails(schoolId, studentBase, targetAy);

    const targetIdx = chronYears.findIndex((y) => y.id === targetAy.id);
    const priorYears = targetIdx > 0 ? chronYears.slice(0, targetIdx) : [];
    const previousYearDebts: PreviousYearDebtSummary[] = [];

    priorYears.forEach((prevAy) => {
      const hasEnrollment = Boolean(this.getStudentEnrollmentForYear(schoolId, studentId, prevAy.id));
      const hasBills = this.data.feeBills.some(
        (b) => b.schoolId === schoolId && b.studentId === studentId && b.academicYearId === prevAy.id
      );
      if (!hasEnrollment && !hasBills) return;

      const prevStandalone = this.computeStandaloneYearFeeDetails(schoolId, studentBase, prevAy);
      if (prevStandalone.remainingBalance > 0) {
        previousYearDebts.push({
          academicYearId: prevAy.id,
          academicYearName: prevAy.name,
          totalFeesExpected: prevStandalone.totalFeesExpected,
          totalAmountPaid: prevStandalone.totalAmountPaid,
          outstandingBalance: prevStandalone.remainingBalance,
          unpaidMonths: prevStandalone.monthsBreakdown
            .filter((m) => (m.isBilled || m.paidAmount > 0) && m.balance > 0)
            .map((m) => m.monthName),
        });
      }
    });

    const previousYearsOutstanding =
      Math.round(previousYearDebts.reduce((sum, d) => sum + d.outstandingBalance, 0) * 100) / 100;
    const combinedOutstandingBalance =
      Math.round((previousYearsOutstanding + currentDetails.remainingBalance) * 100) / 100;

    return {
      ...currentDetails,
      previousYearDebts,
      previousYearsOutstanding,
      combinedOutstandingBalance,
    };
  }

  public getUnpaidStudentsList(
    schoolId: string,
    options?: {
      classId?: string;
      month?: string;
      status?: string;
      search?: string;
      academicYearId?: string;
      debtScope?: 'all' | 'previous_year' | 'current_year';
    }
  ): UnpaidStudentItem[] {
    const ayId = options?.academicYearId || this.getSelectedAcademicYearId(schoolId);
    const students = this.getStudents(schoolId, ayId).filter(
      (s) => s.enrollmentStatus === 'Active'
    );
    const classes = this.getClasses(schoolId, ayId);

    const items: UnpaidStudentItem[] = [];

    students.forEach((student) => {
      const details = this.getStudentFeeHistoryDetails(schoolId, student.id, ayId);
      if (!details) return;

      const scope = options?.debtScope || 'all';
      if (scope === 'previous_year' && details.previousYearsOutstanding <= 0) return;
      if (scope === 'current_year' && details.remainingBalance <= 0) return;
      if (scope === 'all' && details.combinedOutstandingBalance <= 0) return;

      const unpaidMonths = details.monthsBreakdown.filter(
        (m) => (m.isBilled || m.paidAmount > 0) && m.status !== 'Paid'
      );

      if (scope === 'current_year' && unpaidMonths.length === 0) return;

      const className = classes.find((c) => c.id === student.classId)?.name || 'Class';
      const dueMonthsList = unpaidMonths.map((m) => m.monthName);
      const prevDebtMonths = details.previousYearDebts.flatMap((d) =>
        d.unpaidMonths.length > 0 ? d.unpaidMonths : [`${d.academicYearName} Balance`]
      );
      const combinedDueList = [...prevDebtMonths, ...dueMonthsList];
      const latestDueMonth =
        dueMonthsList[dueMonthsList.length - 1] ||
        (details.previousYearDebts.length > 0
          ? `Prior: ${details.previousYearDebts.map((d) => d.academicYearName).join(', ')}`
          : 'Current month');

      let itemStatus: 'Unpaid' | 'Partial' | 'Overdue' = 'Unpaid';
      if (details.remainingBalance > 0) {
        if (details.totalAmountPaid > 0) {
          itemStatus = 'Partial';
        } else if (unpaidMonths.some((m) => m.status === 'Overdue')) {
          itemStatus = 'Overdue';
        } else {
          itemStatus = 'Unpaid';
        }
      } else if (details.previousYearsOutstanding > 0) {
        itemStatus = 'Overdue';
      }

      if (options?.classId && options.classId !== 'all' && student.classId !== options.classId) {
        return;
      }
      if (options?.status && options.status !== 'all' && itemStatus !== options.status) {
        return;
      }
      if (options?.month && options.month !== 'all') {
        const matchesMonth = unpaidMonths.some(
          (m) => m.monthName === options.month || m.shortMonth === options.month
        );
        if (!matchesMonth) return;
      }
      if (options?.search && options.search.trim() !== '') {
        const q = options.search.toLowerCase().trim();
        const matches =
          student.name.toLowerCase().includes(q) ||
          student.studentIdNumber.toLowerCase().includes(q) ||
          student.guardianPhone.toLowerCase().includes(q);
        if (!matches) return;
      }

      items.push({
        studentId: student.id,
        studentName: student.name,
        studentIdNumber: student.studentIdNumber,
        classId: student.classId,
        className,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        monthlyFee: details.monthlyFee,
        amountPaid: details.totalAmountPaid,
        remainingBalance: details.remainingBalance,
        previousYearDebt: details.previousYearsOutstanding,
        combinedBalance: details.combinedOutstandingBalance,
        previousYearBreakdown: details.previousYearDebts,
        dueMonth: latestDueMonth,
        dueMonthsList: combinedDueList,
        status: itemStatus,
        academicYearId: ayId,
      });
    });

    return items;
  }

  public getComprehensiveFeeStats(schoolId: string, academicYearId?: string) {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    const students = this.getStudents(schoolId, ayId).filter(
      (s) => s.enrollmentStatus === 'Active'
    );

    const totalStudents = students.length;
    let fullyPaidStudents = 0;
    let outstandingStudentsCount = 0;
    let unpaidThisMonthCount = 0;
    let partialCount = 0;
    let overdueCount = 0;
    let totalFeesExpected = 0;
    let totalFeesCollected = 0;
    let previousYearsOutstanding = 0;
    let studentsWithPreviousDebtCount = 0;

    students.forEach((student) => {
      const details = this.getStudentFeeHistoryDetails(schoolId, student.id, ayId);
      if (!details) return;

      totalFeesExpected += details.totalFeesExpected;
      totalFeesCollected += details.totalAmountPaid;
      previousYearsOutstanding += details.previousYearsOutstanding;
      if (details.previousYearsOutstanding > 0) {
        studentsWithPreviousDebtCount++;
      }

      if (details.overallStatus === 'Paid') {
        fullyPaidStudents++;
      } else {
        outstandingStudentsCount++;
        if (details.overallStatus === 'Partial') {
          partialCount++;
        } else if (details.overallStatus === 'Overdue') {
          overdueCount++;
        } else {
          unpaidThisMonthCount++;
        }
      }
    });

    const totalOutstandingFees = Math.max(0, Math.round((totalFeesExpected - totalFeesCollected) * 100) / 100);
    previousYearsOutstanding = Math.round(previousYearsOutstanding * 100) / 100;
    const combinedOutstanding = Math.round((totalOutstandingFees + previousYearsOutstanding) * 100) / 100;

    return {
      academicYearId: ayId,
      totalStudents,
      fullyPaidStudents,
      outstandingStudentsCount,
      unpaidThisMonthCount,
      partialCount,
      overdueCount,
      totalFeesExpected,
      totalFeesCollected,
      totalOutstandingFees,
      previousYearsOutstanding,
      combinedOutstanding,
      studentsWithPreviousDebtCount,
    };
  }

  public getStudentFeeSummary(schoolId: string, studentId: string, academicYearId?: string) {
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    const details = this.getStudentFeeHistoryDetails(schoolId, studentId, ayId);
    if (!details) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
        previousYearsOutstanding: 0,
        combinedBalance: 0,
        status: 'Paid' as const,
        bills: [],
        payments: [],
      };
    }

    let statusDisplay: 'Paid' | 'Partial Payment' | 'Unpaid' | 'Overdue' = 'Paid';
    if (details.overallStatus === 'Paid') {
      statusDisplay = 'Paid';
    } else if (details.overallStatus === 'Partial') {
      statusDisplay = 'Partial Payment';
    } else if (details.overallStatus === 'Overdue') {
      statusDisplay = 'Overdue';
    } else {
      statusDisplay = 'Unpaid';
    }

    return {
      totalBilled: details.totalFeesExpected,
      totalPaid: details.totalAmountPaid,
      balance: details.remainingBalance,
      previousYearsOutstanding: details.previousYearsOutstanding,
      combinedBalance: details.combinedOutstandingBalance,
      status: statusDisplay,
      bills: this.data.feeBills.filter(
        (b) => b.schoolId === schoolId && b.studentId === studentId && (!ayId || b.academicYearId === ayId)
      ),
      payments: details.payments,
    };
  }

  public getSchoolFeeStats(schoolId: string, academicYearId?: string) {
    const stats = this.getComprehensiveFeeStats(schoolId, academicYearId);
    return {
      amountBilled: stats.totalFeesExpected,
      collected: stats.totalFeesCollected,
      outstanding: stats.totalOutstandingFees,
      previousYearsOutstanding: stats.previousYearsOutstanding,
      combinedOutstanding: stats.combinedOutstanding,
    };
  }

  public async updateSchoolFeePolicy(schoolId: string, allowAdvancePayments: boolean): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb
      .from('schools')
      .update({ allow_advance_payments: allowAdvancePayments })
      .eq('id', schoolId);
    if (error) throw new Error(error.message);
    await this.loadSessionData();
  }

  // Promotion (Academic Year-aware, strictly via promote_students RPC)
  public getPromotions(schoolId: string, academicYearId?: string): PromotionRecord[] {
    if (academicYearId === 'all') {
      return this.data.promotions.filter((p) => p.schoolId === schoolId);
    }
    const ayId = academicYearId || this.getSelectedAcademicYearId(schoolId);
    return this.data.promotions.filter(
      (p) => p.schoolId === schoolId && (!ayId || p.academicYearId === ayId)
    );
  }

  public async promoteStudents(
    schoolId: string,
    fromClassId: string,
    toClassId: string,
    academicYear: string,
    studentIds: string[],
    targetAcademicYearId?: string
  ): Promise<void> {
    const years = this.getAcademicYears(schoolId);
    const targetAy =
      (targetAcademicYearId && years.find((y) => y.id === targetAcademicYearId)) ||
      years.find((y) => y.id === academicYear || y.name === academicYear) ||
      this.getSelectedAcademicYear(schoolId) ||
      this.getActiveAcademicYear(schoolId);

    if (targetAy && this.isAcademicYearReadOnly(schoolId, targetAy.id)) {
      throw new Error('Historical academic year is read-only. Cannot promote students in a closed year.');
    }

    const sb = getSupabase();
    const { error } = await sb.rpc('promote_students', {
      p_from_class_id: fromClassId,
      p_to_class_id: toClassId,
      p_academic_year_id: targetAy?.id || null,
      p_student_ids: studentIds,
    });
    if (error) throw new Error(error.message);

    await this.loadSessionData();
  }

  // CSV Report Generator
  public generateCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((row) =>
          row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const storage = new StorageService();
