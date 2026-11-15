import React, { useEffect } from 'react';
import {
  LayoutGrid,
  Users,
  Clock,
  History,
  CircleDollarSign,
  FileBarChart,
  CalendarDays,
  TrendingUp,
  Monitor,
  GraduationCap,
  BookOpen,
  UserCheck,
  Building2,
  BarChart3,
  CreditCard,
  Sliders,
  LogOut,
  User,
  X,
  AlertCircle,
} from 'lucide-react';
import { SchoolManagerLogo } from './Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { storage } from '../../services/storage';

export type NavItemKey =
  // Super Admin
  | 'super_dashboard'
  | 'super_approvals'
  | 'super_schools'
  | 'super_plans'
  | 'super_payments'
  | 'super_settings'
  // School Admin
  | 'admin_dashboard'
  | 'admin_students'
  | 'admin_attendance'
  | 'admin_attendance_history'
  | 'admin_fees'
  | 'admin_unpaid_students'
  | 'admin_reports'
  | 'admin_academic_years'
  | 'admin_promotion'
  | 'admin_classes'
  | 'admin_teachers'
  | 'admin_subjects'
  // Teacher
  | 'teacher_my_classes'
  | 'teacher_attendance'
  | 'teacher_attendance_history'
  | 'teacher_profile';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: any) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, school, role, logout } = useAuth();
  const { t } = useLanguage();

  // Dynamic student count badge
  const studentCount = school ? storage.getStudents(school.id).length : 0;
  // Dynamic unpaid students badge for School Admin
  const unpaidStudentsCount = school
    ? storage.getComprehensiveFeeStats(school.id).outstandingStudentsCount
    : 0;
  // Dynamic pending approvals badge for Super Admin
  const pendingApprovalsCount = storage
    .getSchools()
    .filter((s) => s.status === 'pending').length;

  useEffect(() => {
    if (!isOpenMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpenMobile, onCloseMobile]);

  const renderNavItem = (
    key: string,
    label: string,
    IconComponent: any,
    badge?: number | string
  ) => {
    const isActive = currentTab === key;
    return (
      <button
        key={key}
        onClick={() => {
          onSelectTab(key);
          onCloseMobile?.();
        }}
        className={`w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-semibold transition-all select-none text-start cursor-pointer ${
          isActive
            ? 'bg-white text-[#5458A7] shadow-sm'
            : 'text-white hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <IconComponent
            size={18}
            className={`shrink-0 ${isActive ? 'text-[#5458A7]' : 'text-white'}`}
          />
          <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all shrink-0 ${
              isActive
                ? 'bg-[#5458A7] text-white'
                : 'bg-white text-[#5458A7]'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile/Tablet backdrop (<1024px) */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        className={`fixed lg:sticky top-0 inset-y-0 start-0 h-dvh z-50 w-[min(18rem,85vw)] lg:w-72 bg-[#5458A7] text-white flex flex-col justify-between shrink-0 p-4 sm:p-5 max-lg:transform max-lg:transition-transform max-lg:duration-200 max-lg:ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'
        }`}
      >
        <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto pe-1">
          {/* Top Logo & Mobile Close */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <div className="sm:hidden min-w-0">
              <SchoolManagerLogo variant="light" size="sm" />
            </div>
            <div className="hidden sm:block min-w-0">
              <SchoolManagerLogo variant="light" size="md" />
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation based on Role */}
          {role === 'super_admin' && (
            <div className="flex flex-col gap-5 mt-2">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-white/70 uppercase px-4 mb-2 font-manrope">
                  {t('nav_role_super_admin')}
                </div>
                <div className="space-y-1">
                  {renderNavItem('super_dashboard', t('nav_dashboard'), LayoutGrid)}
                  {renderNavItem(
                    'super_approvals',
                    t('nav_approvals'),
                    UserCheck,
                    pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
                  )}
                  {renderNavItem('super_schools', t('nav_schools'), Building2)}
                  {renderNavItem('super_plans', t('nav_plans'), BarChart3)}
                  {renderNavItem('super_payments', t('nav_payments'), CreditCard)}
                  {renderNavItem('super_settings', t('nav_settings'), Sliders)}
                </div>
              </div>
            </div>
          )}

          {role === 'school_admin' && (
            <div className="flex flex-col gap-5 mt-2">
              {/* Overview Section */}
              <div>
                <div className="text-[11px] font-bold tracking-widest text-white/70 uppercase px-4 mb-2 font-manrope">
                  {t('nav_section_overview')}
                </div>
                <div className="space-y-1">
                  {renderNavItem('admin_dashboard', t('nav_dashboard'), LayoutGrid)}
                  {renderNavItem(
                    'admin_students',
                    t('nav_students'),
                    Users,
                    studentCount
                  )}
                  {renderNavItem('admin_attendance', t('nav_attendance'), Clock)}
                  {renderNavItem(
                    'admin_attendance_history',
                    t('nav_attendanceHistory'),
                    History
                  )}
                  {renderNavItem('admin_fees', t('nav_fees'), CircleDollarSign)}
                  {renderNavItem(
                    'admin_unpaid_students',
                    t('nav_unpaidStudents'),
                    AlertCircle,
                    unpaidStudentsCount > 0 ? unpaidStudentsCount : undefined
                  )}
                  {renderNavItem('admin_reports', t('nav_reports'), FileBarChart)}
                  {renderNavItem(
                    'admin_academic_years',
                    t('nav_academicYears'),
                    CalendarDays
                  )}
                  {renderNavItem('admin_promotion', t('nav_promotion'), TrendingUp)}
                </div>
              </div>

              {/* Management Section */}
              <div>
                <div className="text-[11px] font-bold tracking-widest text-white/70 uppercase px-4 mb-2 font-manrope">
                  {t('nav_section_academic')}
                </div>
                <div className="space-y-1">
                  {renderNavItem('admin_classes', t('nav_classes'), Monitor)}
                  {renderNavItem('admin_teachers', t('nav_teachers'), GraduationCap)}
                  {renderNavItem('admin_subjects', t('nav_subjects'), BookOpen)}
                </div>
              </div>
            </div>
          )}

          {role === 'teacher' && (
            <div className="flex flex-col gap-5 mt-2">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-white/70 uppercase px-4 mb-2 font-manrope">
                  {t('nav_role_teacher')}
                </div>
                <div className="space-y-1">
                  {renderNavItem('teacher_my_classes', t('nav_myClasses'), Monitor)}
                  {renderNavItem('teacher_attendance', t('nav_attendance'), Clock)}
                  {renderNavItem(
                    'teacher_attendance_history',
                    t('nav_attendanceHistory'),
                    History
                  )}
                  {renderNavItem('teacher_profile', t('nav_myProfile'), User)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom User Profile & Logout */}
        <div className="pt-4 mt-4 border-t border-white/20 flex flex-col gap-2">
          <div className="px-3 py-2 rounded-xl bg-white/10 flex items-center justify-between gap-2">
            <div className="min-w-0 pe-2">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || ''}
              </div>
              <div className="text-[11px] text-white/70 truncate">
                {school?.name || user?.email}
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              {role === 'super_admin'
                ? t('nav_role_super_admin')
                : role === 'school_admin'
                ? t('nav_role_school_admin')
                : t('nav_role_teacher')}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <LogOut size={14} className="rtl:rotate-180" />
            <span>{t('nav_logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
