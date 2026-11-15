import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LanguageSelector } from './components/common/LanguageSelector';
import { storage } from './services/storage';
import { Sidebar } from './components/common/Sidebar';
import { SchoolManagerLogo } from './components/common/Logo';
import { OfflineIndicator } from './components/common/PWAStatus';
import { LandingPage } from './components/public/LandingPage';
import { GetStartedPage } from './components/public/GetStartedPage';
import { LoginPage } from './components/public/LoginPage';
import { PausedAccessPage } from './components/public/PausedAccessPage';
import { WaitingForApprovalPage } from './components/public/WaitingForApprovalPage';

// Super Admin Components
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { SuperAdminApprovals } from './components/superadmin/SuperAdminApprovals';
import { SuperAdminSchools } from './components/superadmin/SuperAdminSchools';
import { SuperAdminResetPassword } from './components/superadmin/SuperAdminResetPassword';
import { SuperAdminPlans } from './components/superadmin/SuperAdminPlans';
import { SuperAdminPayments } from './components/superadmin/SuperAdminPayments';
import { SuperAdminSettings } from './components/superadmin/SuperAdminSettings';

// School Admin Components
import { SchoolAdminDashboard } from './components/schooladmin/SchoolAdminDashboard';
import { StudentsList } from './components/schooladmin/StudentsList';
import { RegisterStudent } from './components/schooladmin/RegisterStudent';
import { StudentProfile } from './components/schooladmin/StudentProfile';
import { AttendanceSheet } from './components/schooladmin/AttendanceSheet';
import { AttendanceHistory } from './components/schooladmin/AttendanceHistory';
import { FeeManagement } from './components/schooladmin/FeeManagement';
import { MonthlyBilling } from './components/schooladmin/MonthlyBilling';
import { RecordPayment } from './components/schooladmin/RecordPayment';
import { PaymentHistory } from './components/schooladmin/PaymentHistory';
import { UnpaidStudentsPage } from './components/schooladmin/UnpaidStudentsPage';
import { ReportsPage } from './components/schooladmin/ReportsPage';
import { AcademicYears } from './components/schooladmin/AcademicYears';
import { PromotionPage } from './components/schooladmin/PromotionPage';
import { ClassesPage } from './components/schooladmin/ClassesPage';
import { TeachersPage } from './components/schooladmin/TeachersPage';
import { ResetTeacherPassword } from './components/schooladmin/ResetTeacherPassword';
import { SubjectsPage } from './components/schooladmin/SubjectsPage';

// Teacher Components
import { TeacherMyClasses } from './components/teacher/TeacherMyClasses';
import { TeacherProfile } from './components/teacher/TeacherProfile';

import { Menu, CheckCircle2, Calendar, Lock } from 'lucide-react';
import { Student, Teacher, School } from './types';

function MainApp() {
  const {
    user,
    school,
    isAuthenticated,
    isLoadingAuth,
    role,
    isSchoolSuspended,
    isPendingApproval,
    academicYears,
    selectedAcademicYear,
    isHistoricalReadOnly,
    setSelectedAcademicYearId,
    logout,
  } = useAuth();
  const { t, isRTL } = useLanguage();

  // Re-render when Supabase cache refreshes
  const [, setStorageTick] = useState(0);
  React.useEffect(() => {
    return storage.subscribe(() => setStorageTick((v) => v + 1));
  }, []);

  // Public view navigation (supports deep links like /login and /get-started)
  const [publicView, setPublicView] = useState<'landing' | 'get_started' | 'login'>(() => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.toLowerCase();
    if (path === '/login') return 'login';
    if (path === '/get-started') return 'get_started';
    return 'landing';
  });
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState<string | undefined>();

  const navigatePublic = (next: 'landing' | 'get_started' | 'login') => {
    setPublicView(next);
    try {
      const target = next === 'login' ? '/login' : next === 'get_started' ? '/get-started' : '/';
      if (window.location.pathname !== target) {
        window.history.replaceState(null, '', target);
      }
    } catch {
      // Ignore history errors
    }
  };

  // Current Dashboard Tab
  const [currentTab, setCurrentTab] = useState<string>('admin_dashboard');

  // Mobile sidebar open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Deep view selections
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedTeacherForReset, setSelectedTeacherForReset] = useState<Teacher | null>(null);
  const [selectedSchoolForReset, setSelectedSchoolForReset] = useState<School | null>(null);
  const [forcedAttendanceClassId, setForcedAttendanceClassId] = useState<string | undefined>();
  const [recordPaymentStudentId, setRecordPaymentStudentId] = useState<string | undefined>();
  const [recordPaymentAcademicYearId, setRecordPaymentAcademicYearId] = useState<string | undefined>();
  const [unpaidStatusFilter, setUnpaidStatusFilter] = useState<string>('all');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // If role changes, set reasonable default tab
  React.useEffect(() => {
    if (role === 'super_admin') {
      setCurrentTab('super_dashboard');
    } else if (role === 'school_admin') {
      setCurrentTab('admin_dashboard');
    } else if (role === 'teacher') {
      setCurrentTab('teacher_my_classes');
    }
  }, [role]);

  // Refresh Super Admin data automatically when switching tabs
  React.useEffect(() => {
    if (role !== 'super_admin') return;
    void (async () => {
      await storage.refreshIfStale(2500);
      const sessionErr = storage.getLastSessionError();
      if (sessionErr) {
        showToast(sessionErr);
      }
    })();
  }, [role, currentTab]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FDFEFE] font-manrope">
        <div className="flex flex-col items-center gap-4">
          <SchoolManagerLogo variant="dark" size="md" />
          <div className="w-6 h-6 border-2 border-[#5458A7] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 1. PUBLIC VIEWS (When not logged in)
  if (!isAuthenticated) {
    if (publicView === 'get_started') {
      return (
        <GetStartedPage
          initialPlanId={selectedPlanForOnboarding}
          onGoToLogin={() => navigatePublic('login')}
          onGoToHome={() => navigatePublic('landing')}
        />
      );
    }
    if (publicView === 'login') {
      return (
        <LoginPage
          onGoToGetStarted={() => {
            setSelectedPlanForOnboarding(undefined);
            navigatePublic('get_started');
          }}
          onGoToHome={() => navigatePublic('landing')}
        />
      );
    }
    return (
      <LandingPage
        onGoToLogin={() => navigatePublic('login')}
        onGoToGetStarted={(planId) => {
          setSelectedPlanForOnboarding(planId);
          navigatePublic('get_started');
        }}
      />
    );
  }

  // 2. WAITING FOR APPROVAL VIEW (Pending school status - strictly blocked from all dashboards)
  if (isPendingApproval) {
    return <WaitingForApprovalPage onGoToHome={logout} />;
  }

  // 3. PAUSED / SUSPENDED SCHOOL VIEW
  if (isSchoolSuspended) {
    return <PausedAccessPage />;
  }

  // 3. AUTHENTICATED PORTAL VIEW
  const renderTabContent = () => {
    // SUPER ADMIN TABS
    if (role === 'super_admin') {
      switch (currentTab) {
        case 'super_dashboard':
          return <SuperAdminDashboard onNavigateTab={setCurrentTab} />;
        case 'super_approvals':
          return <SuperAdminApprovals onShowToast={showToast} />;
        case 'super_schools':
          return (
            <SuperAdminSchools
              onResetPasswordClick={(sch) => {
                setSelectedSchoolForReset(sch);
                setCurrentTab('super_reset_password');
              }}
              onShowToast={showToast}
            />
          );
        case 'super_reset_password':
          return (
            <SuperAdminResetPassword
              initialSchool={selectedSchoolForReset}
              onCancel={() => setCurrentTab('super_schools')}
              onShowToast={showToast}
            />
          );
        case 'super_plans':
          return <SuperAdminPlans onShowToast={showToast} />;
        case 'super_payments':
          return <SuperAdminPayments />;
        case 'super_settings':
          return <SuperAdminSettings onShowToast={showToast} />;
        default:
          return <SuperAdminDashboard onNavigateTab={setCurrentTab} />;
      }
    }

    // SCHOOL ADMIN TABS
    if (role === 'school_admin') {
      switch (currentTab) {
        case 'admin_dashboard':
          return (
            <SchoolAdminDashboard
              onNavigateTab={(tab, params) => {
                if (params?.status) {
                  setUnpaidStatusFilter(params.status);
                } else {
                  setUnpaidStatusFilter('all');
                }
                setCurrentTab(tab);
              }}
              onOpenRegisterStudent={() => setCurrentTab('admin_register_student')}
              onOpenAddTeacher={() => setCurrentTab('admin_teachers')}
              onShowToast={showToast}
            />
          );
        case 'admin_students':
          return (
            <StudentsList
              onOpenAddStudent={() => setCurrentTab('admin_register_student')}
              onViewStudentProfile={(s) => {
                setSelectedStudentForProfile(s);
                setCurrentTab('admin_student_profile');
              }}
              onShowToast={showToast}
            />
          );
        case 'admin_register_student':
          return (
            <RegisterStudent
              onCancel={() => setCurrentTab('admin_students')}
              onSuccess={() => setCurrentTab('admin_students')}
              onShowToast={showToast}
            />
          );
        case 'admin_student_profile':
          if (!selectedStudentForProfile) {
            return (
              <StudentsList
                onOpenAddStudent={() => setCurrentTab('admin_register_student')}
                onViewStudentProfile={(s) => {
                  setSelectedStudentForProfile(s);
                  setCurrentTab('admin_student_profile');
                }}
              />
            );
          }
          return (
            <StudentProfile
              student={selectedStudentForProfile}
              onViewAttendanceHistory={(classId) => {
                setForcedAttendanceClassId(classId);
                setCurrentTab('admin_attendance_history');
              }}
              onBack={() => setCurrentTab('admin_students')}
              onShowToast={showToast}
            />
          );
        case 'admin_attendance':
          return (
            <AttendanceSheet
              forcedClassId={forcedAttendanceClassId}
              onShowToast={showToast}
            />
          );
        case 'admin_attendance_history':
          return (
            <AttendanceHistory
              initialClassId={forcedAttendanceClassId}
              onShowToast={showToast}
            />
          );
        case 'admin_fees':
          return (
            <FeeManagement
              onOpenMonthlyBilling={() => setCurrentTab('admin_monthly_billing')}
              onOpenRecordPayment={() => {
                setRecordPaymentStudentId(undefined);
                setRecordPaymentAcademicYearId(undefined);
                setCurrentTab('admin_record_payment');
              }}
              onViewStudentProfile={(studentId) => {
                const s = storage.getStudentById(studentId, selectedAcademicYear?.id);
                if (s) {
                  setSelectedStudentForProfile(s);
                  setCurrentTab('admin_student_profile');
                }
              }}
              onShowToast={showToast}
            />
          );
        case 'admin_unpaid_students':
          return (
            <UnpaidStudentsPage
              initialStatusFilter={unpaidStatusFilter}
              onRecordPaymentClick={(studentId, targetAyId) => {
                setRecordPaymentStudentId(studentId);
                setRecordPaymentAcademicYearId(targetAyId);
                setCurrentTab('admin_record_payment');
              }}
              onViewStudentProfile={(studentId) => {
                const s = storage.getStudentById(studentId, selectedAcademicYear?.id);
                if (s) {
                  setSelectedStudentForProfile(s);
                  setCurrentTab('admin_student_profile');
                }
              }}
              onShowToast={showToast}
            />
          );
        case 'admin_monthly_billing':
          return (
            <MonthlyBilling
              onBackToFees={() => setCurrentTab('admin_fees')}
              onShowToast={showToast}
            />
          );
        case 'admin_record_payment':
          return (
            <RecordPayment
              initialStudentId={recordPaymentStudentId}
              initialAcademicYearId={recordPaymentAcademicYearId}
              onGoToPaymentHistory={() => {
                setRecordPaymentStudentId(undefined);
                setRecordPaymentAcademicYearId(undefined);
                setCurrentTab('admin_payment_history');
              }}
              onCancel={() => {
                setRecordPaymentStudentId(undefined);
                setRecordPaymentAcademicYearId(undefined);
                setCurrentTab('admin_fees');
              }}
              onShowToast={showToast}
            />
          );
        case 'admin_payment_history':
          return (
            <PaymentHistory
              onOpenRecordPayment={() => {
                setRecordPaymentStudentId(undefined);
                setRecordPaymentAcademicYearId(undefined);
                setCurrentTab('admin_record_payment');
              }}
              onShowToast={showToast}
            />
          );
        case 'admin_reports':
          return <ReportsPage onShowToast={showToast} />;
        case 'admin_academic_years':
          return <AcademicYears onShowToast={showToast} />;
        case 'admin_promotion':
          return <PromotionPage onShowToast={showToast} />;
        case 'admin_classes':
          return <ClassesPage onShowToast={showToast} />;
        case 'admin_teachers':
          return (
            <TeachersPage
              onOpenResetPassword={(teacher) => {
                setSelectedTeacherForReset(teacher);
                setCurrentTab('admin_reset_teacher_password');
              }}
              onShowToast={showToast}
            />
          );
        case 'admin_reset_teacher_password':
          return (
            <ResetTeacherPassword
              initialTeacher={selectedTeacherForReset}
              onCancel={() => setCurrentTab('admin_teachers')}
              onShowToast={showToast}
            />
          );
        case 'admin_subjects':
          return <SubjectsPage onShowToast={showToast} />;
        default:
          return (
            <SchoolAdminDashboard
              onNavigateTab={setCurrentTab}
              onOpenRegisterStudent={() => setCurrentTab('admin_register_student')}
              onOpenAddTeacher={() => setCurrentTab('admin_teachers')}
            />
          );
      }
    }

    // TEACHER TABS
    if (role === 'teacher') {
      switch (currentTab) {
        case 'teacher_my_classes':
          return (
            <TeacherMyClasses
              onTakeAttendance={(classId) => {
                setForcedAttendanceClassId(classId);
                setCurrentTab('teacher_attendance');
              }}
            />
          );
        case 'teacher_attendance':
          return (
            <AttendanceSheet
              forcedClassId={forcedAttendanceClassId}
              isTeacherMode={true}
              onShowToast={showToast}
            />
          );
        case 'teacher_attendance_history':
          return (
            <AttendanceHistory
              initialClassId={forcedAttendanceClassId}
              isTeacherMode={true}
              onShowToast={showToast}
            />
          );
        case 'teacher_profile':
          return <TeacherProfile onShowToast={showToast} />;
        default:
          return (
            <TeacherMyClasses
              onTakeAttendance={(classId) => {
                setForcedAttendanceClassId(classId);
                setCurrentTab('teacher_attendance');
              }}
            />
          );
      }
    }

    return null;
  };

  const getMobilePageTitle = (): string => {
    const map: Record<string, string> = {
      super_dashboard: t('nav_dashboard'),
      super_approvals: t('nav_approvals'),
      super_schools: t('nav_schools'),
      super_reset_password: t('sa_rp_title'),
      super_plans: t('nav_plans'),
      super_payments: t('nav_payments'),
      super_settings: t('nav_settings'),
      admin_dashboard: t('nav_dashboard'),
      admin_students: t('nav_students'),
      admin_register_student: t('adm_reg_title'),
      admin_student_profile: selectedStudentForProfile?.name || t('nav_students'),
      admin_attendance: t('nav_attendance'),
      admin_attendance_history: t('nav_attendanceHistory'),
      admin_fees: t('nav_fees'),
      admin_unpaid_students: t('nav_unpaidStudents'),
      admin_monthly_billing: t('adm_bill_title'),
      admin_record_payment: t('adm_rp_title'),
      admin_payment_history: t('adm_ph_title'),
      admin_reports: t('nav_reports'),
      admin_academic_years: t('nav_academicYears'),
      admin_promotion: t('nav_promotion'),
      admin_classes: t('nav_classes'),
      admin_teachers: t('nav_teachers'),
      admin_reset_teacher_password: t('adm_rtp_title'),
      admin_subjects: t('nav_subjects'),
      teacher_my_classes: t('nav_myClasses'),
      teacher_attendance: t('nav_attendance'),
      teacher_attendance_history: t('nav_attendanceHistory'),
      teacher_profile: t('nav_myProfile'),
    };
    return map[currentTab] || t('nav_dashboard');
  };

  return (
    <div className="flex min-h-dvh w-full max-w-full bg-[#FDFEFE] font-manrope text-[#23265A]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Top Header Bar for Mobile/Tablet, Academic Year Selector & Active User */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#E4E6F3] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#23265A] hover:bg-[#F3F4FB] rounded-xl shrink-0 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <div className="hidden sm:block shrink-0">
                <SchoolManagerLogo variant="dark" size="sm" />
              </div>
              <span className="text-sm font-extrabold font-sora text-[#23265A] truncate">
                {getMobilePageTitle()}
              </span>
            </div>
            <div className="hidden lg:block text-xs font-semibold text-[#6B7280] truncate">
              {role === 'super_admin'
                ? t('nav_superAdminPortal')
                : role === 'school_admin'
                ? (school?.name ? `${school.name} · ${t('nav_schoolAdminSuffix')}` : t('nav_schoolAdministration'))
                : (school?.name ? `${school.name} · ${t('nav_teacherPortalSuffix')}` : t('nav_teacherPortal'))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end min-w-0">
            {(role === 'school_admin' || role === 'teacher') && academicYears.length > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                {isHistoricalReadOnly && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                    title={t('nav_historicalTooltip')}
                  >
                    <Lock size={11} />
                    {t('nav_historicalBadge')}
                  </span>
                )}
                <div className="flex items-center gap-1.5 bg-[#F8F8FD] border border-[#E4E6F3] rounded-xl px-2.5 min-h-[40px] lg:min-h-0 py-1 max-w-[165px] sm:max-w-none">
                  <Calendar size={13} className="text-[#5458A7] shrink-0" />
                  <select
                    aria-label={t('nav_selectAcademicYear')}
                    value={selectedAcademicYear?.id || ''}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const chosen = academicYears.find((y) => y.id === nextId);
                      setSelectedAcademicYearId(nextId);
                      if (chosen) {
                        showToast(
                          chosen.status === 'Active'
                            ? t('nav_switchedActiveAy', { name: chosen.name })
                            : t('nav_viewingHistoricalAy', { name: chosen.name })
                        );
                      }
                    }}
                    className="bg-transparent text-xs font-bold text-[#23265A] focus:outline-none cursor-pointer pe-1 min-w-0 truncate max-w-full"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} ({ay.status === 'Active' ? t('common_active') : t('common_historical')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <LanguageSelector />

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-[#EEEEF8] text-[#5458A7] flex items-center justify-center font-bold text-xs">
                {user?.avatarInitials || user?.name?.slice(0, 2).toUpperCase() || 'SM'}
              </div>
              <span className="text-xs font-bold text-[#23265A] hidden md:inline max-w-[140px] truncate">
                {user?.name}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-xs font-bold text-[#6B7280] hover:text-red-600 px-2.5 min-h-[40px] lg:min-h-0 py-1 rounded-full border border-transparent hover:border-red-100 transition-colors cursor-pointer hidden sm:inline-flex items-center"
              title={t('nav_logout')}
            >
              {t('nav_logout')}
            </button>
          </div>
        </header>

        {/* Page Tab Render */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:end-6 z-50 flex items-center justify-center sm:justify-start gap-2.5 bg-[#23265A] text-white px-4 sm:px-5 py-3 rounded-2xl shadow-xl border border-white/10 text-sm font-semibold max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <span className="wrap-anywhere">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
        <OfflineIndicator />
      </AuthProvider>
    </LanguageProvider>
  );
}
