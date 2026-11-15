-- 001b_security.sql
-- Private RLS helper functions, updated_at triggers, ENABLE/FORCE RLS, and strict multi-tenant RLS policies

-- Helper functions inside app_private (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION app_private.current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.school_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.current_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
      AND p.school_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_school_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schools s
    WHERE s.id = app_private.current_school_id()
      AND s.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id
  FROM public.teachers t
  WHERE t.user_id = auth.uid()
    AND t.school_id = app_private.current_school_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.current_school_plan_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.plan_id
  FROM public.schools s
  WHERE s.id = app_private.current_school_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.is_teacher_assigned_to_class(
  p_class_id uuid,
  p_academic_year_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = p_class_id
      AND c.school_id = app_private.current_school_id()
      AND c.teacher_id = app_private.current_teacher_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.teacher_year_assignments tya
    WHERE tya.school_id = app_private.current_school_id()
      AND tya.teacher_id = app_private.current_teacher_id()
      AND tya.class_id = p_class_id
      AND (p_academic_year_id IS NULL OR tya.academic_year_id = p_academic_year_id)
  );
$$;

CREATE OR REPLACE FUNCTION app_private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Updated-at triggers
DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_schools_updated_at ON public.schools;
CREATE TRIGGER trg_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_academic_years_updated_at ON public.academic_years;
CREATE TRIGGER trg_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_teachers_updated_at ON public.teachers;
CREATE TRIGGER trg_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_sye_updated_at ON public.student_year_enrollments;
CREATE TRIGGER trg_sye_updated_at
  BEFORE UPDATE ON public.student_year_enrollments
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

DROP TRIGGER IF EXISTS trg_fee_payments_updated_at ON public.fee_payments;
CREATE TRIGGER trg_fee_payments_updated_at
  BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_updated_at();

-- Enable and Force RLS on every table
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;

ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years FORCE ROW LEVEL SECURITY;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.teacher_year_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_year_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;

ALTER TABLE public.student_year_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_year_enrollments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE public.fee_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_bills FORCE ROW LEVEL SECURITY;

ALTER TABLE public.billing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_runs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions FORCE ROW LEVEL SECURITY;

-- 1. platform_settings policies
DROP POLICY IF EXISTS platform_settings_select_public ON public.platform_settings;
CREATE POLICY platform_settings_select_public ON public.platform_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS platform_settings_write_super ON public.platform_settings;
CREATE POLICY platform_settings_write_super ON public.platform_settings
  FOR ALL TO authenticated
  USING (app_private.is_super_admin())
  WITH CHECK (app_private.is_super_admin());

-- 2. plans policies (split anon vs authenticated so anon never touches public.schools)
DROP POLICY IF EXISTS plans_select_public ON public.plans;
DROP POLICY IF EXISTS plans_select_anon ON public.plans;
DROP POLICY IF EXISTS plans_select_authenticated ON public.plans;
DROP POLICY IF EXISTS plans_write_super ON public.plans;

CREATE POLICY plans_select_anon ON public.plans
  FOR SELECT TO anon
  USING (is_visible = true);

CREATE POLICY plans_select_authenticated ON public.plans
  FOR SELECT TO authenticated
  USING (
    is_visible = true
    OR app_private.is_super_admin()
    OR id = app_private.current_school_plan_id()
  );

CREATE POLICY plans_write_super ON public.plans
  FOR ALL TO authenticated
  USING (app_private.is_super_admin())
  WITH CHECK (app_private.is_super_admin());

-- 3. schools policies
DROP POLICY IF EXISTS schools_select_scoped ON public.schools;
CREATE POLICY schools_select_scoped ON public.schools
  FOR SELECT TO authenticated
  USING (
    app_private.is_super_admin()
    OR id = app_private.current_school_id()
  );

DROP POLICY IF EXISTS schools_update_super_or_admin ON public.schools;
CREATE POLICY schools_update_super_or_admin ON public.schools
  FOR UPDATE TO authenticated
  USING (
    app_private.is_super_admin()
    OR (
      id = app_private.current_school_id()
      AND app_private.current_role() = 'school_admin'
      AND app_private.is_school_active()
    )
  )
  WITH CHECK (
    app_private.is_super_admin()
    OR (
      id = app_private.current_school_id()
      AND app_private.current_role() = 'school_admin'
      AND app_private.is_school_active()
    )
  );

-- 4. school_payments policies
DROP POLICY IF EXISTS school_payments_select_scoped ON public.school_payments;
CREATE POLICY school_payments_select_scoped ON public.school_payments
  FOR SELECT TO authenticated
  USING (
    app_private.is_super_admin()
    OR school_id = app_private.current_school_id()
  );

DROP POLICY IF EXISTS school_payments_write_super ON public.school_payments;
CREATE POLICY school_payments_write_super ON public.school_payments
  FOR ALL TO authenticated
  USING (app_private.is_super_admin())
  WITH CHECK (app_private.is_super_admin());

-- 5. profiles policies
DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR app_private.is_super_admin()
    OR (school_id IS NOT NULL AND school_id = app_private.current_school_id())
  );

DROP POLICY IF EXISTS profiles_update_self_or_super ON public.profiles;
CREATE POLICY profiles_update_self_or_super ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    app_private.is_super_admin()
    OR id = auth.uid()
  )
  WITH CHECK (
    app_private.is_super_admin()
    OR (
      id = auth.uid()
      AND role = app_private.current_role()
      AND school_id IS NOT DISTINCT FROM app_private.current_school_id()
    )
  );

-- 6. academic_years policies
DROP POLICY IF EXISTS academic_years_select_scoped ON public.academic_years;
CREATE POLICY academic_years_select_scoped ON public.academic_years
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
  );

DROP POLICY IF EXISTS academic_years_write_admin ON public.academic_years;
CREATE POLICY academic_years_write_admin ON public.academic_years
  FOR ALL TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 7. classes policies
DROP POLICY IF EXISTS classes_select_scoped ON public.classes;
CREATE POLICY classes_select_scoped ON public.classes
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR (
        app_private.current_role() = 'teacher'
        AND app_private.is_teacher_assigned_to_class(id, NULL)
      )
    )
  );

DROP POLICY IF EXISTS classes_write_admin ON public.classes;
CREATE POLICY classes_write_admin ON public.classes
  FOR ALL TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 8. teachers policies
DROP POLICY IF EXISTS teachers_select_scoped ON public.teachers;
CREATE POLICY teachers_select_scoped ON public.teachers
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS teachers_update_scoped ON public.teachers;
CREATE POLICY teachers_update_scoped ON public.teachers
  FOR UPDATE TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR user_id = auth.uid()
    )
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS teachers_delete_admin ON public.teachers;
CREATE POLICY teachers_delete_admin ON public.teachers
  FOR DELETE TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 9. teacher_year_assignments policies
DROP POLICY IF EXISTS tya_select_scoped ON public.teacher_year_assignments;
CREATE POLICY tya_select_scoped ON public.teacher_year_assignments
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR teacher_id = app_private.current_teacher_id()
    )
  );

DROP POLICY IF EXISTS tya_write_admin ON public.teacher_year_assignments;
CREATE POLICY tya_write_admin ON public.teacher_year_assignments
  FOR ALL TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 10. subjects policies
DROP POLICY IF EXISTS subjects_select_scoped ON public.subjects;
CREATE POLICY subjects_select_scoped ON public.subjects
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR (
        app_private.current_role() = 'teacher'
        AND (
          teacher_id = app_private.current_teacher_id()
          OR app_private.is_teacher_assigned_to_class(class_id, NULL)
        )
      )
    )
  );

DROP POLICY IF EXISTS subjects_write_admin ON public.subjects;
CREATE POLICY subjects_write_admin ON public.subjects
  FOR ALL TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 11. students policies (NO DELETE policy: students are never deleted)
DROP POLICY IF EXISTS students_select_scoped ON public.students;
CREATE POLICY students_select_scoped ON public.students
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR (
        app_private.current_role() = 'teacher'
        AND (
          app_private.is_teacher_assigned_to_class(class_id, NULL)
          OR EXISTS (
            SELECT 1
            FROM public.student_year_enrollments sye
            WHERE sye.student_id = students.id
              AND sye.school_id = app_private.current_school_id()
              AND app_private.is_teacher_assigned_to_class(sye.class_id, sye.academic_year_id)
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS students_insert_admin ON public.students;
CREATE POLICY students_insert_admin ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

DROP POLICY IF EXISTS students_update_admin ON public.students;
CREATE POLICY students_update_admin ON public.students
  FOR UPDATE TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 12. student_year_enrollments policies
DROP POLICY IF EXISTS sye_select_scoped ON public.student_year_enrollments;
CREATE POLICY sye_select_scoped ON public.student_year_enrollments
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR (
        app_private.current_role() = 'teacher'
        AND app_private.is_teacher_assigned_to_class(class_id, academic_year_id)
      )
    )
  );

DROP POLICY IF EXISTS sye_write_admin ON public.student_year_enrollments;
CREATE POLICY sye_write_admin ON public.student_year_enrollments
  FOR ALL TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  )
  WITH CHECK (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 13. attendance policies (reads scoped; writes strictly via take_attendance RPC)
DROP POLICY IF EXISTS attendance_select_scoped ON public.attendance;
CREATE POLICY attendance_select_scoped ON public.attendance
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.is_school_active()
    AND (
      app_private.current_role() = 'school_admin'
      OR (
        app_private.current_role() = 'teacher'
        AND app_private.is_teacher_assigned_to_class(class_id, academic_year_id)
      )
    )
  );

-- 14. fee_bills policies (school_admin read-only; writes strictly via bill_students RPC)
DROP POLICY IF EXISTS fee_bills_select_admin ON public.fee_bills;
CREATE POLICY fee_bills_select_admin ON public.fee_bills
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 15. billing_runs policies (school_admin read-only; writes strictly via bill_students RPC)
DROP POLICY IF EXISTS billing_runs_select_admin ON public.billing_runs;
CREATE POLICY billing_runs_select_admin ON public.billing_runs
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 16. fee_payments policies (school_admin read-only; writes strictly via payment RPCs)
DROP POLICY IF EXISTS fee_payments_select_admin ON public.fee_payments;
CREATE POLICY fee_payments_select_admin ON public.fee_payments
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 17. fee_payment_allocations policies (school_admin read-only; writes strictly via payment RPCs)
DROP POLICY IF EXISTS fpa_select_admin ON public.fee_payment_allocations;
CREATE POLICY fpa_select_admin ON public.fee_payment_allocations
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );

-- 18. promotions policies (school_admin read-only; writes strictly via promote_students RPC)
DROP POLICY IF EXISTS promotions_select_admin ON public.promotions;
CREATE POLICY promotions_select_admin ON public.promotions
  FOR SELECT TO authenticated
  USING (
    school_id = app_private.current_school_id()
    AND app_private.current_role() = 'school_admin'
    AND app_private.is_school_active()
  );
