-- 001d_seed_grants.sql
-- Seed plans and empty platform_settings row, then configure strict least-privilege grants

-- 1. Seed default subscription plans (idempotent)
INSERT INTO public.plans (slug, name, price, student_limit, features, is_highlighted, is_visible, sort_order)
VALUES
  (
    'basic',
    'Basic',
    29.00,
    150,
    '["Up to 150 students", "Attendance tracking", "Fee billing & receipts", "Teacher portal"]'::jsonb,
    false,
    true,
    1
  ),
  (
    'standard',
    'Standard',
    59.00,
    500,
    '["Up to 500 students", "Multi-year academic records", "Excel & PDF exports", "Priority support"]'::jsonb,
    true,
    true,
    2
  ),
  (
    'premium',
    'Premium',
    99.00,
    2000,
    '["Up to 2,000 students", "Unlimited classes & teachers", "Full financial history & reporting", "Dedicated onboarding"]'::jsonb,
    false,
    true,
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed single empty platform_settings row (id = 1)
INSERT INTO public.platform_settings (
  id,
  mobile_money_number,
  mobile_money_provider,
  bank_name,
  account_name,
  account_number,
  bank_branch,
  contact_email,
  currency
)
VALUES (1, '', '', '', '', '', '', '', 'USD')
ON CONFLICT (id) DO NOTHING;

-- 3. Schema & table privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;

-- Revoke broad public privileges on all tables, then grant exact scoped access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Publicly readable catalog tables (RLS still restricts hidden plans)
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.platform_settings TO anon, authenticated;

-- Authenticated table privileges (every operation enforced by RLS + FORCE RLS)
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT SELECT, UPDATE ON public.schools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_payments TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_year_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_year_enrollments TO authenticated;
GRANT SELECT ON public.attendance TO authenticated;
GRANT SELECT ON public.fee_bills TO authenticated;
GRANT SELECT ON public.billing_runs TO authenticated;
GRANT SELECT ON public.fee_payments TO authenticated;
GRANT SELECT ON public.fee_payment_allocations TO authenticated;
GRANT SELECT ON public.promotions TO authenticated;

-- Security-invoker views
GRANT SELECT ON public.v_student_balances TO authenticated;
GRANT SELECT ON public.v_school_summary TO authenticated;

-- Private RLS helpers
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO anon, authenticated;

-- RPC function permissions: revoke PUBLIC/anon, grant EXECUTE only to authenticated
REVOKE ALL ON FUNCTION public.register_school(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_school(text, uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_school(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_school(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.suspend_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suspend_school(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.activate_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_school(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.request_subscription_renewal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_subscription_renewal(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.take_attendance(uuid, date, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.take_attendance(uuid, date, jsonb, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.bill_students(text, uuid, text, numeric, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bill_students(text, uuid, text, numeric, date, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.record_payment(uuid, numeric, date, text, text[], text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, date, text, text[], text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_payment(uuid, numeric, date, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_payment(uuid, numeric, date, text, text[], text) TO authenticated;

REVOKE ALL ON FUNCTION public.void_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_payment(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.promote_students(uuid, uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_students(uuid, uuid, uuid, uuid[]) TO authenticated;
