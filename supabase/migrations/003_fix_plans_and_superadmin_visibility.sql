-- Migration 003:
-- 1) Fix 42501 "permission denied for table schools" when anon queries public.plans:
--    Split plans SELECT policy for anon vs authenticated and wrap the school plan lookup
--    in a SECURITY DEFINER helper app_private.current_school_plan_id().
-- 2) Ensure app_private schema/function privileges are granted cleanly.
-- 3) Ensure all super_admin profiles have school_id = NULL so app_private.is_super_admin()
--    always evaluates to true, granting full visibility over schools & school_payments.

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

DROP POLICY IF EXISTS plans_select_public ON public.plans;
DROP POLICY IF EXISTS plans_select_anon ON public.plans;
DROP POLICY IF EXISTS plans_select_authenticated ON public.plans;

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

-- Ensure app_private schema & functions are callable by anon and authenticated
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO anon, authenticated;

-- Ensure any super_admin profile has school_id = NULL (required by app_private.is_super_admin())
UPDATE public.profiles
SET school_id = NULL
WHERE role = 'super_admin' AND school_id IS NOT NULL;

-- Guarantee super_admin SELECT policies on schools, school_payments, and profiles
DROP POLICY IF EXISTS schools_select_scoped ON public.schools;
CREATE POLICY schools_select_scoped ON public.schools
  FOR SELECT TO authenticated
  USING (
    app_private.is_super_admin()
    OR id = app_private.current_school_id()
  );

DROP POLICY IF EXISTS school_payments_select_scoped ON public.school_payments;
CREATE POLICY school_payments_select_scoped ON public.school_payments
  FOR SELECT TO authenticated
  USING (
    app_private.is_super_admin()
    OR school_id = app_private.current_school_id()
  );

DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR app_private.is_super_admin()
    OR (school_id IS NOT NULL AND school_id = app_private.current_school_id())
  );

-- Recover any auth.users accounts that finished email confirmation or failed mid-way
-- with pending_school_registration metadata but have no profile/school row yet.
DO $$
DECLARE
  v_user record;
  v_meta jsonb;
  v_school_id uuid;
  v_plan_id uuid;
  v_plan_price numeric;
  v_school_name text;
  v_method text;
  v_ref text;
  v_pm_type text;
  v_sp_method_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_pm_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'schools' AND a.attname = 'payment_method';

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_sp_method_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'school_payments' AND a.attname = 'method';

  FOR v_user IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
      AND u.raw_user_meta_data ? 'pending_school_registration'
  LOOP
    v_meta := v_user.raw_user_meta_data -> 'pending_school_registration';
    v_school_name := COALESCE(NULLIF(trim(v_meta->>'school_name'), ''), split_part(v_user.email, '@', 1));
    v_plan_id := NULLIF(v_meta->>'plan_id', '')::uuid;
    v_method := COALESCE(NULLIF(v_meta->>'payment_method', ''), 'Mobile money');
    v_ref := COALESCE(NULLIF(v_meta->>'payment_reference', ''), 'REG-' || floor(100000 + random() * 900000)::text);

    SELECT id, price INTO v_plan_id, v_plan_price
    FROM public.plans
    WHERE id = v_plan_id
    LIMIT 1;

    IF v_plan_id IS NULL THEN
      SELECT id, price INTO v_plan_id, v_plan_price
      FROM public.plans
      ORDER BY sort_order ASC
      LIMIT 1;
    END IF;

    IF v_plan_id IS NOT NULL THEN
      EXECUTE format(
        'INSERT INTO public.schools (name, email, plan_id, status, payment_method, payment_reference) VALUES ($1, $2, $3, ''pending'', $4::%s, $5) RETURNING id',
        COALESCE(v_pm_type, 'text')
      )
      USING v_school_name, v_user.email, v_plan_id, v_method, v_ref
      INTO v_school_id;

      INSERT INTO public.profiles (id, school_id, role, full_name, email)
      VALUES (v_user.id, v_school_id, 'school_admin', v_school_name || ' Admin', v_user.email)
      ON CONFLICT (id) DO NOTHING;

      EXECUTE format(
        'INSERT INTO public.school_payments (school_id, plan_id, amount, method, reference, status) VALUES ($1, $2, $3, $4::%s, $5, ''pending'')',
        COALESCE(v_sp_method_type, 'text')
      )
      USING v_school_id, v_plan_id, COALESCE(v_plan_price, 0), v_method, v_ref;
    END IF;
  END LOOP;
END;
$$;
