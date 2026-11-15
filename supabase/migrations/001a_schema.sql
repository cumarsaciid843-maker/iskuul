-- 001a_schema.sql
-- Schemas, extensions, enums, tables, foreign keys, and indexes for School Manager

CREATE SCHEMA IF NOT EXISTS app_private;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'school_admin', 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'school_status') THEN
    CREATE TYPE public.school_status AS ENUM ('pending', 'active', 'rejected', 'suspended');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'payment_method_type') THEN
    CREATE TYPE public.payment_method_type AS ENUM ('Cash', 'Mobile money', 'Bank transfer', 'Cheque');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'school_payment_status') THEN
    CREATE TYPE public.school_payment_status AS ENUM ('pending', 'paid', 'active', 'rejected', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'academic_year_status') THEN
    CREATE TYPE public.academic_year_status AS ENUM ('Active', 'Closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'shift_type') THEN
    CREATE TYPE public.shift_type AS ENUM ('Morning', 'Afternoon', 'Evening');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'fee_billing_type') THEN
    CREATE TYPE public.fee_billing_type AS ENUM ('monthly_from_joining_month', 'exact_date', 'full_year');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'enrollment_status') THEN
    CREATE TYPE public.enrollment_status AS ENUM ('Active', 'Inactive');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'attendance_status') THEN
    CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
  END IF;
END
$$;

-- 1. Platform Settings (single-row global configuration)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mobile_money_number text NOT NULL DEFAULT '',
  mobile_money_provider text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  bank_branch text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  student_limit integer NOT NULL DEFAULT 100 CHECK (student_limit > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_highlighted boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON public.plans (sort_order, created_at);

-- 3. Schools (Tenants)
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status public.school_status NOT NULL DEFAULT 'pending',
  paid_until date,
  payment_method public.payment_method_type,
  payment_reference text,
  allow_advance_payments boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools (status);
CREATE INDEX IF NOT EXISTS idx_schools_plan_id ON public.schools (plan_id);
CREATE INDEX IF NOT EXISTS idx_schools_created_at ON public.schools (created_at DESC);

-- 4. School Subscription Payments
CREATE TABLE IF NOT EXISTS public.school_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  method public.payment_method_type NOT NULL DEFAULT 'Mobile money',
  reference text,
  status public.school_payment_status NOT NULL DEFAULT 'pending',
  paid_until date,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_payments_school_id ON public.school_payments (school_id);
CREATE INDEX IF NOT EXISTS idx_school_payments_status ON public.school_payments (status);

-- 5. User Profiles (1:1 with auth.users; super_admin has NULL school_id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  avatar_initials text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_profiles_role_school CHECK (
    (role = 'super_admin' AND school_id IS NULL)
    OR (role IN ('school_admin', 'teacher') AND school_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles (school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));

-- 6. Academic Years
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.academic_year_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_academic_years_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_academic_years_school_id ON public.academic_years (school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_one_active
  ON public.academic_years (school_id)
  WHERE status = 'Active';

-- 7. Classes
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  teacher_id uuid,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  available_in_year_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes (teacher_id);

-- 8. Teachers
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subjects text[] NOT NULL DEFAULT '{}'::text[],
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  available_in_year_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers (school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers (user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_teacher_id'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT fk_classes_teacher_id
      FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 9. Teacher Year Assignments
CREATE TABLE IF NOT EXISTS public.teacher_year_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_teacher_year_class UNIQUE (school_id, teacher_id, class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_tya_school_id ON public.teacher_year_assignments (school_id);
CREATE INDEX IF NOT EXISTS idx_tya_teacher_ay ON public.teacher_year_assignments (teacher_id, academic_year_id);

-- 10. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  available_in_year_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects (school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects (class_id);

-- 11. Students
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id_number text NOT NULL,
  name text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  guardian_name text NOT NULL DEFAULT '',
  guardian_phone text NOT NULL DEFAULT '',
  guardian_address text,
  shift public.shift_type NOT NULL DEFAULT 'Morning',
  monthly_fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  registration_date date NOT NULL DEFAULT CURRENT_DATE,
  fee_start_date date,
  fee_billing_type public.fee_billing_type NOT NULL DEFAULT 'monthly_from_joining_month',
  enrollment_status public.enrollment_status NOT NULL DEFAULT 'Active',
  notes text,
  registered_academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_students_school_number UNIQUE (school_id, student_id_number)
);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students (school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students (class_id);

-- 12. Student Year Enrollments
CREATE TABLE IF NOT EXISTS public.student_year_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  shift public.shift_type NOT NULL DEFAULT 'Morning',
  monthly_fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  fee_start_date date,
  fee_billing_type public.fee_billing_type NOT NULL DEFAULT 'monthly_from_joining_month',
  enrollment_status public.enrollment_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sye_student_year UNIQUE (school_id, student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_sye_school_id ON public.student_year_enrollments (school_id);
CREATE INDEX IF NOT EXISTS idx_sye_ay_class ON public.student_year_enrollments (academic_year_id, class_id);

-- 13. Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status public.attendance_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON public.attendance (school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance (school_id, class_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_student_day
  ON public.attendance (school_id, student_id, date, academic_year_id);

-- 14. Fee Bills
CREATE TABLE IF NOT EXISTS public.fee_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  month text NOT NULL,
  month_index integer NOT NULL CHECK (month_index BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_bills_school_id ON public.fee_bills (school_id);
CREATE INDEX IF NOT EXISTS idx_fee_bills_student_id ON public.fee_bills (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_bills_unique_student_month
  ON public.fee_bills (school_id, academic_year_id, student_id, year, month_index);

-- 15. Billing Runs
CREATE TABLE IF NOT EXISTS public.billing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  month text NOT NULL,
  class_scope text NOT NULL DEFAULT 'All classes',
  students_billed_count integer NOT NULL DEFAULT 0,
  total_billed_amount numeric(12, 2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_runs_school_id ON public.billing_runs (school_id);

-- 16. Fee Payments
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  recorded_during_academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  date_received date NOT NULL DEFAULT CURRENT_DATE,
  method public.payment_method_type NOT NULL DEFAULT 'Cash',
  months_covered text[] NOT NULL DEFAULT '{}'::text[],
  note text,
  voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_school_id ON public.fee_payments (school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments (student_id);

-- 17. Fee Payment Allocations
CREATE TABLE IF NOT EXISTS public.fee_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.fee_bills(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fpa_school_id ON public.fee_payment_allocations (school_id);
CREATE INDEX IF NOT EXISTS idx_fpa_payment_id ON public.fee_payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_fpa_bill_id ON public.fee_payment_allocations (bill_id);

-- 18. Student Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  from_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  to_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_name text NOT NULL DEFAULT '',
  promoted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_school_id ON public.promotions (school_id);
CREATE INDEX IF NOT EXISTS idx_promotions_student_id ON public.promotions (student_id);
