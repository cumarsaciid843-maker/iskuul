import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, School, UserRole, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  school: School | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  role: UserRole | null;
  isSchoolSuspended: boolean;
  isPendingApproval: boolean;
  academicYears: AcademicYear[];
  selectedAcademicYear: AcademicYear | null;
  activeAcademicYear: AcademicYear | null;
  isHistoricalReadOnly: boolean;
  setSelectedAcademicYearId: (academicYearId: string) => void;
  login: (
    email: string,
    passwordAttempt: string
  ) => Promise<{ success: boolean; error?: string; status?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isPendingApproval, setIsPendingApproval] = useState<boolean>(false);
  const [isSchoolSuspended, setIsSchoolSuspended] = useState<boolean>(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear | null>(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);

  const syncAcademicYearState = useCallback((schoolId?: string) => {
    if (!schoolId) {
      setAcademicYears([]);
      setSelectedAcademicYear(null);
      setActiveAcademicYear(null);
      return;
    }
    const years = storage.getAcademicYearsChronological(schoolId);
    const active = storage.getActiveAcademicYear(schoolId) || null;
    const selected = storage.getSelectedAcademicYear(schoolId) || active;
    setAcademicYears(years);
    setActiveAcademicYear(active);
    setSelectedAcademicYear(selected);
  }, []);

  const syncFromStorageCache = useCallback(() => {
    const u = storage.getCurrentUser();
    if (!u) {
      setUser(null);
      setSchool(null);
      setIsPendingApproval(false);
      setIsSchoolSuspended(false);
      syncAcademicYearState(undefined);
      return;
    }

    if (u.schoolId) {
      const s = storage.getSchoolById(u.schoolId);
      if (!s || s.status === 'rejected') {
        setUser(null);
        setSchool(null);
        setIsPendingApproval(false);
        setIsSchoolSuspended(false);
        syncAcademicYearState(undefined);
        return;
      }

      setUser(u);
      setSchool(s);
      syncAcademicYearState(s.id);
      setIsPendingApproval(s.status === 'pending');
      setIsSchoolSuspended(s.status === 'suspended');
      return;
    }

    // Super admin (no schoolId)
    setUser(u);
    setSchool(null);
    setIsPendingApproval(false);
    setIsSchoolSuspended(false);
    syncAcademicYearState(undefined);
  }, [syncAcademicYearState]);

  const hydrateFromSupabase = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setIsLoadingAuth(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const res = await storage.loadSessionData();
        if (res.status === 'rejected') {
          await supabase.auth.signOut();
          storage.clearSessionCache();
        }
      } else {
        await storage.loadPublicData();
      }
      syncFromStorageCache();
    } catch (err) {
      console.error('Auth hydration error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [syncFromStorageCache]);

  useEffect(() => {
    void hydrateFromSupabase();

    const unsubscribeCache = storage.subscribe(() => {
      syncFromStorageCache();
    });

    let unsubscribeAuth: (() => void) | undefined;
    if (supabase && isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (storage.isAuthEventSuppressed()) return;
        if (event === 'SIGNED_OUT') {
          storage.clearSessionCache();
          void storage.loadPublicData();
          syncFromStorageCache();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          void (async () => {
            await storage.loadSessionData();
            syncFromStorageCache();
          })();
        }
      });
      unsubscribeAuth = () => subscription.unsubscribe();
    }

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void storage.refreshIfStale(4000);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityOrFocus);
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }

    return () => {
      unsubscribeCache();
      unsubscribeAuth?.();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleVisibilityOrFocus);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    };
  }, [hydrateFromSupabase, syncFromStorageCache]);

  // Keep Super Admin list of schools/approvals/payments fresh across tabs & devices
  useEffect(() => {
    const sb = supabase;
    if (!sb || !isSupabaseConfigured || user?.role !== 'super_admin') return;

    const channel = sb
      .channel('superadmin-schools-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schools' },
        () => {
          void storage.refreshIfStale(1000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'school_payments' },
        () => {
          void storage.refreshIfStale(1000);
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void storage.refreshIfStale(14000);
      }
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      void sb.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  const setSelectedAcademicYearId = (academicYearId: string) => {
    if (!school) return;
    storage.setSelectedAcademicYearId(school.id, academicYearId);
    syncAcademicYearState(school.id);
  };

  const login = async (email: string, passwordAttempt: string) => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const res = await storage.signIn(email, passwordAttempt);
    if (res.user) {
      if (res.status === 'rejected') {
        return { success: false, error: res.error || 'Your registration was rejected.' };
      }

      syncFromStorageCache();

      if (res.status === 'pending') {
        return { success: true, status: 'pending' };
      }
      if (res.status === 'suspended') {
        return { success: true, status: 'suspended' };
      }
      return { success: true, status: 'active' };
    }
    return { success: false, error: res.error || 'Invalid credentials' };
  };

  const logout = async () => {
    await storage.signOut();
    syncFromStorageCache();
  };

  const refresh = async () => {
    await hydrateFromSupabase();
  };

  const isHistoricalReadOnly = Boolean(
    selectedAcademicYear && selectedAcademicYear.status !== 'Active'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        school,
        isAuthenticated: !!user,
        isLoadingAuth,
        role: user ? user.role : null,
        isSchoolSuspended,
        isPendingApproval,
        academicYears,
        selectedAcademicYear,
        activeAcademicYear,
        isHistoricalReadOnly,
        setSelectedAcademicYearId,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
