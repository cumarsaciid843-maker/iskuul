-- 001c_functions_views.sql
-- Security-definer RPC functions and security-invoker views

-- 1. register_school
CREATE OR REPLACE FUNCTION public.register_school(
  p_school_name text,
  p_plan_id uuid,
  p_payment_method text,
  p_payment_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user record;
  v_plan record;
  v_school_id uuid;
  v_name text;
  v_start_year integer;
  v_ay_name text;
  v_ay_start date;
  v_ay_end date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'User profile already exists';
  END IF;

  SELECT id, email, raw_user_meta_data
  INTO v_user
  FROM auth.users
  WHERE id = v_uid;

  IF NOT FOUND OR v_user.email IS NULL THEN
    RAISE EXCEPTION 'Authenticated auth user record not found';
  END IF;

  v_name := trim(COALESCE(p_school_name, ''));
  IF v_name = '' THEN
    RAISE EXCEPTION 'School name is required';
  END IF;

  SELECT id, price
  INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected plan not found';
  END IF;

  IF p_payment_method NOT IN ('Mobile money', 'Bank transfer', 'Cash', 'Cheque') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  INSERT INTO public.schools (
    name,
    email,
    plan_id,
    status,
    payment_method,
    payment_reference
  )
  VALUES (
    v_name,
    lower(trim(v_user.email)),
    v_plan.id,
    'pending',
    p_payment_method::public.payment_method_type,
    NULLIF(trim(COALESCE(p_payment_reference, '')), '')
  )
  RETURNING id INTO v_school_id;

  INSERT INTO public.profiles (
    id,
    school_id,
    role,
    full_name,
    email,
    avatar_initials
  )
  VALUES (
    v_uid,
    v_school_id,
    'school_admin',
    v_name || ' Admin',
    lower(trim(v_user.email)),
    upper(left(v_name, 2))
  );

  INSERT INTO public.school_payments (
    school_id,
    plan_id,
    amount,
    method,
    reference,
    status
  )
  VALUES (
    v_school_id,
    v_plan.id,
    v_plan.price,
    p_payment_method::public.payment_method_type,
    NULLIF(trim(COALESCE(p_payment_reference, '')), ''),
    'pending'
  );

  -- Create initial active academic year for the newly registered school
  v_start_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  v_ay_name := v_start_year::text || ' - ' || (v_start_year + 1)::text;
  v_ay_start := make_date(v_start_year, 1, 1);
  v_ay_end := make_date(v_start_year, 12, 31);

  INSERT INTO public.academic_years (school_id, name, start_date, end_date, status)
  VALUES (v_school_id, v_ay_name, v_ay_start, v_ay_end, 'Active');

  RETURN v_school_id;
END;
$$;

-- 2. approve_school
CREATE OR REPLACE FUNCTION public.approve_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_paid_until date := (CURRENT_DATE + INTERVAL '30 days')::date;
  v_start_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
BEGIN
  IF NOT app_private.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super_admin can approve schools';
  END IF;

  UPDATE public.schools
  SET status = 'active',
      paid_until = GREATEST(COALESCE(paid_until, v_paid_until), v_paid_until)
  WHERE id = p_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found';
  END IF;

  UPDATE public.school_payments
  SET status = 'paid',
      paid_until = v_paid_until,
      approved_by = auth.uid(),
      approved_at = now()
  WHERE school_id = p_school_id
    AND status = 'pending';

  IF NOT EXISTS (SELECT 1 FROM public.academic_years WHERE school_id = p_school_id) THEN
    INSERT INTO public.academic_years (school_id, name, start_date, end_date, status)
    VALUES (
      p_school_id,
      v_start_year::text || ' - ' || (v_start_year + 1)::text,
      make_date(v_start_year, 1, 1),
      make_date(v_start_year, 12, 31),
      'Active'
    );
  END IF;
END;
$$;

-- 3. reject_school
CREATE OR REPLACE FUNCTION public.reject_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT app_private.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super_admin can reject schools';
  END IF;

  UPDATE public.schools
  SET status = 'rejected'
  WHERE id = p_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found';
  END IF;

  UPDATE public.school_payments
  SET status = 'rejected'
  WHERE school_id = p_school_id
    AND status = 'pending';
END;
$$;

-- 4. suspend_school
CREATE OR REPLACE FUNCTION public.suspend_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT app_private.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super_admin can suspend schools';
  END IF;

  UPDATE public.schools
  SET status = 'suspended'
  WHERE id = p_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found';
  END IF;
END;
$$;

-- 5. activate_school
CREATE OR REPLACE FUNCTION public.activate_school(p_school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_paid_until date := (CURRENT_DATE + INTERVAL '30 days')::date;
BEGIN
  IF NOT app_private.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super_admin can activate schools';
  END IF;

  UPDATE public.schools
  SET status = 'active',
      paid_until = GREATEST(COALESCE(paid_until, v_paid_until), v_paid_until)
  WHERE id = p_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'School not found';
  END IF;

  UPDATE public.school_payments
  SET status = 'paid',
      paid_until = v_paid_until,
      approved_by = auth.uid(),
      approved_at = now()
  WHERE school_id = p_school_id
    AND status = 'pending';
END;
$$;

-- 6. request_subscription_renewal
CREATE OR REPLACE FUNCTION public.request_subscription_renewal(
  p_plan_id uuid,
  p_payment_method text,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_plan record;
  v_payment_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role <> 'school_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only a school admin can submit a renewal request';
  END IF;

  SELECT id, price
  INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected plan not found';
  END IF;

  UPDATE public.schools
  SET payment_method = p_payment_method::public.payment_method_type,
      payment_reference = COALESCE(NULLIF(trim(p_reference), ''), payment_reference),
      plan_id = v_plan.id
  WHERE id = v_profile.school_id;

  INSERT INTO public.school_payments (
    school_id,
    plan_id,
    amount,
    method,
    reference,
    status
  )
  VALUES (
    v_profile.school_id,
    v_plan.id,
    v_plan.price,
    p_payment_method::public.payment_method_type,
    NULLIF(trim(COALESCE(p_reference, '')), ''),
    'pending'
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- 7. take_attendance
CREATE OR REPLACE FUNCTION public.take_attendance(
  p_class_id uuid,
  p_date date,
  p_records jsonb,
  p_academic_year_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_school_status text;
  v_class_school_id uuid;
  v_teacher_id uuid;
  v_ay_id uuid;
  v_ay_status text;
  v_rec jsonb;
  v_student_id uuid;
  v_status text;
  v_belongs boolean;
  v_is_assigned boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role NOT IN ('school_admin', 'teacher') THEN
    RAISE EXCEPTION 'Unauthorized: only active school admins or teachers can record attendance';
  END IF;

  SELECT status::text INTO v_school_status
  FROM public.schools
  WHERE id = v_profile.school_id;

  IF v_school_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'School subscription is not active';
  END IF;

  SELECT school_id INTO v_class_school_id
  FROM public.classes
  WHERE id = p_class_id;

  IF NOT FOUND OR v_class_school_id IS DISTINCT FROM v_profile.school_id THEN
    RAISE EXCEPTION 'Class not found in your school';
  END IF;

  IF p_academic_year_id IS NOT NULL THEN
    SELECT id, status::text INTO v_ay_id, v_ay_status
    FROM public.academic_years
    WHERE id = p_academic_year_id AND school_id = v_profile.school_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Academic year not found for your school';
    END IF;
    IF v_ay_status IS DISTINCT FROM 'Active' THEN
      RAISE EXCEPTION 'Cannot record attendance in a closed academic year';
    END IF;
  ELSE
    SELECT id INTO v_ay_id
    FROM public.academic_years
    WHERE school_id = v_profile.school_id AND status = 'Active'
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  IF v_profile.role = 'teacher' THEN
    SELECT id INTO v_teacher_id
    FROM public.teachers
    WHERE user_id = v_uid AND school_id = v_profile.school_id
    LIMIT 1;

    IF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'Teacher profile not found';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = p_class_id AND c.school_id = v_profile.school_id AND c.teacher_id = v_teacher_id
    ) OR EXISTS (
      SELECT 1 FROM public.teacher_year_assignments tya
      WHERE tya.school_id = v_profile.school_id
        AND tya.teacher_id = v_teacher_id
        AND tya.class_id = p_class_id
        AND (v_ay_id IS NULL OR tya.academic_year_id = v_ay_id)
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
      RAISE EXCEPTION 'Unauthorized: teacher is not assigned to this class';
    END IF;
  END IF;

  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RAISE EXCEPTION 'p_records must be a JSON array';
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::uuid;
    v_status := v_rec->>'status';

    IF v_student_id IS NULL THEN
      RAISE EXCEPTION 'Each attendance record must include a valid student_id';
    END IF;
    IF v_status NOT IN ('present', 'absent', 'late') THEN
      RAISE EXCEPTION 'Invalid attendance status: %', v_status;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.students s
      LEFT JOIN public.student_year_enrollments sye
        ON sye.student_id = s.id
       AND sye.school_id = v_profile.school_id
       AND (v_ay_id IS NOT NULL AND sye.academic_year_id = v_ay_id)
      WHERE s.id = v_student_id
        AND s.school_id = v_profile.school_id
        AND COALESCE(sye.class_id, s.class_id) = p_class_id
    ) INTO v_belongs;

    IF NOT v_belongs THEN
      RAISE EXCEPTION 'Student % does not belong to class %', v_student_id, p_class_id;
    END IF;
  END LOOP;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::uuid;
    v_status := v_rec->>'status';

    DELETE FROM public.attendance
    WHERE school_id = v_profile.school_id
      AND student_id = v_student_id
      AND date = p_date
      AND academic_year_id IS NOT DISTINCT FROM v_ay_id;

    INSERT INTO public.attendance (
      school_id,
      academic_year_id,
      class_id,
      student_id,
      date,
      status
    )
    VALUES (
      v_profile.school_id,
      v_ay_id,
      p_class_id,
      v_student_id,
      p_date,
      v_status::public.attendance_status
    );
  END LOOP;
END;
$$;

-- 8. bill_students
CREATE OR REPLACE FUNCTION public.bill_students(
  p_month text,
  p_class_id uuid DEFAULT NULL,
  p_fee_mode text DEFAULT 'student_fee',
  p_custom_amount numeric DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_academic_year_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_school_status text;
  v_ay_id uuid;
  v_ay_status text;
  v_month_name text;
  v_month_index integer;
  v_year integer;
  v_due_date date;
  v_class_scope text := 'All classes';
  v_students_billed integer := 0;
  v_total_billed numeric(12, 2) := 0;
  v_row record;
  v_bill_amount numeric(10, 2);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role <> 'school_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only an active school_admin can run billing';
  END IF;

  SELECT status::text INTO v_school_status
  FROM public.schools
  WHERE id = v_profile.school_id;

  IF v_school_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'School subscription is not active';
  END IF;

  IF p_academic_year_id IS NOT NULL THEN
    SELECT id, status::text INTO v_ay_id, v_ay_status
    FROM public.academic_years
    WHERE id = p_academic_year_id AND school_id = v_profile.school_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Academic year not found for your school';
    END IF;
    IF v_ay_status IS DISTINCT FROM 'Active' THEN
      RAISE EXCEPTION 'Cannot run monthly billing inside a closed academic year';
    END IF;
  ELSE
    SELECT id INTO v_ay_id
    FROM public.academic_years
    WHERE school_id = v_profile.school_id AND status = 'Active'
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  IF p_class_id IS NOT NULL THEN
    SELECT name INTO v_class_scope
    FROM public.classes
    WHERE id = p_class_id AND school_id = v_profile.school_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected class does not belong to your school';
    END IF;
  END IF;

  v_month_name := split_part(trim(p_month), ' ', 1);
  v_year := NULLIF(regexp_replace(p_month, '.*?(\d{4}).*', '\1'), '')::integer;
  IF v_year IS NULL THEN
    v_year := EXTRACT(YEAR FROM COALESCE(p_due_date, CURRENT_DATE))::integer;
  END IF;

  v_month_index := CASE lower(left(v_month_name, 3))
    WHEN 'jan' THEN 1
    WHEN 'feb' THEN 2
    WHEN 'mar' THEN 3
    WHEN 'apr' THEN 4
    WHEN 'may' THEN 5
    WHEN 'jun' THEN 6
    WHEN 'jul' THEN 7
    WHEN 'aug' THEN 8
    WHEN 'sep' THEN 9
    WHEN 'oct' THEN 10
    WHEN 'nov' THEN 11
    WHEN 'dec' THEN 12
    ELSE EXTRACT(MONTH FROM COALESCE(p_due_date, CURRENT_DATE))::integer
  END;

  v_due_date := COALESCE(p_due_date, make_date(v_year, v_month_index, 25));

  IF p_fee_mode = 'custom' AND (p_custom_amount IS NULL OR p_custom_amount <= 0) THEN
    RAISE EXCEPTION 'Custom billing amount must be greater than zero';
  END IF;

  FOR v_row IN
    SELECT
      s.id AS student_id,
      COALESCE(sye.class_id, s.class_id) AS class_id,
      COALESCE(sye.monthly_fee, s.monthly_fee) AS monthly_fee,
      COALESCE(sye.enrollment_status, s.enrollment_status) AS enrollment_status
    FROM public.students s
    LEFT JOIN public.student_year_enrollments sye
      ON sye.student_id = s.id
     AND sye.school_id = v_profile.school_id
     AND sye.academic_year_id = v_ay_id
    WHERE s.school_id = v_profile.school_id
      AND COALESCE(sye.enrollment_status, s.enrollment_status) = 'Active'
      AND (v_ay_id IS NULL OR sye.id IS NOT NULL OR s.registered_academic_year_id = v_ay_id)
      AND (p_class_id IS NULL OR COALESCE(sye.class_id, s.class_id) = p_class_id)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.fee_bills b
      WHERE b.school_id = v_profile.school_id
        AND b.academic_year_id IS NOT DISTINCT FROM v_ay_id
        AND b.student_id = v_row.student_id
        AND b.year = v_year
        AND b.month_index = v_month_index
    ) THEN
      v_bill_amount := CASE
        WHEN p_fee_mode = 'custom' THEN p_custom_amount
        ELSE v_row.monthly_fee
      END;

      IF v_bill_amount > 0 THEN
        INSERT INTO public.fee_bills (
          school_id,
          academic_year_id,
          student_id,
          class_id,
          month,
          month_index,
          year,
          amount,
          due_date
        )
        VALUES (
          v_profile.school_id,
          v_ay_id,
          v_row.student_id,
          v_row.class_id,
          trim(p_month),
          v_month_index,
          v_year,
          v_bill_amount,
          v_due_date
        );

        v_students_billed := v_students_billed + 1;
        v_total_billed := v_total_billed + v_bill_amount;
      END IF;
    END IF;
  END LOOP;

  IF v_students_billed = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'students_billed', 0,
      'total_billed', 0,
      'message', 'All eligible students in this academic year have already been billed for this month.'
    );
  END IF;

  INSERT INTO public.billing_runs (
    school_id,
    academic_year_id,
    month,
    class_scope,
    students_billed_count,
    total_billed_amount,
    due_date
  )
  VALUES (
    v_profile.school_id,
    v_ay_id,
    trim(p_month),
    v_class_scope,
    v_students_billed,
    v_total_billed,
    v_due_date
  );

  RETURN jsonb_build_object(
    'success', true,
    'students_billed', v_students_billed,
    'total_billed', v_total_billed
  );
END;
$$;

-- 9. record_payment
CREATE OR REPLACE FUNCTION public.record_payment(
  p_student_id uuid,
  p_amount numeric,
  p_date_received date,
  p_method text,
  p_months_covered text[] DEFAULT '{}'::text[],
  p_note text DEFAULT NULL,
  p_academic_year_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_school_status text;
  v_ay_id uuid;
  v_active_ay_id uuid;
  v_payment_id uuid;
  v_remaining numeric(10, 2);
  v_bill record;
  v_already_alloc numeric(10, 2);
  v_bill_due numeric(10, 2);
  v_apply numeric(10, 2);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role <> 'school_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only an active school_admin can record payments';
  END IF;

  SELECT status::text INTO v_school_status
  FROM public.schools
  WHERE id = v_profile.school_id;

  IF v_school_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'School subscription is not active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.school_id = v_profile.school_id
  ) THEN
    RAISE EXCEPTION 'Student not found in your school';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT id INTO v_active_ay_id
  FROM public.academic_years
  WHERE school_id = v_profile.school_id AND status = 'Active'
  ORDER BY start_date DESC
  LIMIT 1;

  IF p_academic_year_id IS NOT NULL THEN
    SELECT id INTO v_ay_id
    FROM public.academic_years
    WHERE id = p_academic_year_id AND school_id = v_profile.school_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Academic year not found for your school';
    END IF;
  ELSE
    v_ay_id := v_active_ay_id;
  END IF;

  INSERT INTO public.fee_payments (
    school_id,
    academic_year_id,
    recorded_during_academic_year_id,
    student_id,
    amount,
    date_received,
    method,
    months_covered,
    note,
    voided
  )
  VALUES (
    v_profile.school_id,
    v_ay_id,
    COALESCE(v_active_ay_id, v_ay_id),
    p_student_id,
    p_amount,
    COALESCE(p_date_received, CURRENT_DATE),
    p_method::public.payment_method_type,
    COALESCE(p_months_covered, '{}'::text[]),
    NULLIF(trim(COALESCE(p_note, '')), ''),
    false
  )
  RETURNING id INTO v_payment_id;

  -- Allocate payment across unpaid fee bills in chronological order
  v_remaining := p_amount;
  FOR v_bill IN
    SELECT b.id, b.amount
    FROM public.fee_bills b
    WHERE b.school_id = v_profile.school_id
      AND b.student_id = p_student_id
      AND b.academic_year_id IS NOT DISTINCT FROM v_ay_id
    ORDER BY b.year ASC, b.month_index ASC, b.created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    SELECT COALESCE(SUM(fpa.amount), 0)
    INTO v_already_alloc
    FROM public.fee_payment_allocations fpa
    JOIN public.fee_payments fp ON fp.id = fpa.payment_id
    WHERE fpa.bill_id = v_bill.id
      AND fp.voided = false;

    v_bill_due := GREATEST(0, v_bill.amount - v_already_alloc);
    IF v_bill_due > 0 THEN
      v_apply := LEAST(v_remaining, v_bill_due);
      INSERT INTO public.fee_payment_allocations (school_id, payment_id, bill_id, amount)
      VALUES (v_profile.school_id, v_payment_id, v_bill.id, v_apply);
      v_remaining := v_remaining - v_apply;
    END IF;
  END LOOP;

  RETURN v_payment_id;
END;
$$;

-- 10. update_payment
CREATE OR REPLACE FUNCTION public.update_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_date_received date,
  p_method text,
  p_months_covered text[] DEFAULT '{}'::text[],
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_payment record;
  v_ay_status text;
  v_remaining numeric(10, 2);
  v_bill record;
  v_already_alloc numeric(10, 2);
  v_bill_due numeric(10, 2);
  v_apply numeric(10, 2);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role <> 'school_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only school_admin can update payments';
  END IF;

  SELECT * INTO v_payment
  FROM public.fee_payments
  WHERE id = p_payment_id AND school_id = v_profile.school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in your school';
  END IF;

  IF v_payment.voided THEN
    RAISE EXCEPTION 'Cannot edit a voided payment';
  END IF;

  IF v_payment.academic_year_id IS NOT NULL THEN
    SELECT status::text INTO v_ay_status
    FROM public.academic_years
    WHERE id = v_payment.academic_year_id AND school_id = v_profile.school_id;
    IF v_ay_status IS DISTINCT FROM 'Active' THEN
      RAISE EXCEPTION 'Historical academic year payment records are read-only';
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  UPDATE public.fee_payments
  SET amount = p_amount,
      date_received = COALESCE(p_date_received, date_received),
      method = COALESCE(p_method::public.payment_method_type, method),
      months_covered = COALESCE(p_months_covered, months_covered),
      note = CASE WHEN p_note IS NULL THEN NULL ELSE NULLIF(trim(p_note), '') END
  WHERE id = p_payment_id AND school_id = v_profile.school_id;

  DELETE FROM public.fee_payment_allocations
  WHERE payment_id = p_payment_id AND school_id = v_profile.school_id;

  v_remaining := p_amount;
  FOR v_bill IN
    SELECT b.id, b.amount
    FROM public.fee_bills b
    WHERE b.school_id = v_profile.school_id
      AND b.student_id = v_payment.student_id
      AND b.academic_year_id IS NOT DISTINCT FROM v_payment.academic_year_id
    ORDER BY b.year ASC, b.month_index ASC, b.created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    SELECT COALESCE(SUM(fpa.amount), 0)
    INTO v_already_alloc
    FROM public.fee_payment_allocations fpa
    JOIN public.fee_payments fp ON fp.id = fpa.payment_id
    WHERE fpa.bill_id = v_bill.id
      AND fp.voided = false;

    v_bill_due := GREATEST(0, v_bill.amount - v_already_alloc);
    IF v_bill_due > 0 THEN
      v_apply := LEAST(v_remaining, v_bill_due);
      INSERT INTO public.fee_payment_allocations (school_id, payment_id, bill_id, amount)
      VALUES (v_profile.school_id, p_payment_id, v_bill.id, v_apply);
      v_remaining := v_remaining - v_apply;
    END IF;
  END LOOP;
END;
$$;

-- 11. void_payment
CREATE OR REPLACE FUNCTION public.void_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_payment record;
  v_ay_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role <> 'school_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only school_admin can void payments';
  END IF;

  SELECT * INTO v_payment
  FROM public.fee_payments
  WHERE id = p_payment_id AND school_id = v_profile.school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in your school';
  END IF;

  IF v_payment.academic_year_id IS NOT NULL THEN
    SELECT status::text INTO v_ay_status
    FROM public.academic_years
    WHERE id = v_payment.academic_year_id AND school_id = v_profile.school_id;
    IF v_ay_status IS DISTINCT FROM 'Active' THEN
      RAISE EXCEPTION 'Historical academic year payment records are read-only';
    END IF;
  END IF;

  UPDATE public.fee_payments
  SET voided = true,
      voided_at = COALESCE(voided_at, now())
  WHERE id = p_payment_id AND school_id = v_profile.school_id;

  DELETE FROM public.fee_payment_allocations
  WHERE payment_id = p_payment_id AND school_id = v_profile.school_id;
END;
$$;

-- 12. promote_students
CREATE OR REPLACE FUNCTION public.promote_students(
  p_from_class_id uuid,
  p_to_class_id uuid,
  p_academic_year_id uuid DEFAULT NULL,
  p_student_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_school_status text;
  v_ay record;
  v_active_ay_id uuid;
  v_sid uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, role::text AS role, school_id
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.school_id IS NULL OR v_profile.role <> 'school_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only school_admin can promote students';
  END IF;

  SELECT status::text INTO v_school_status
  FROM public.schools
  WHERE id = v_profile.school_id;

  IF v_school_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'School subscription is not active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_from_class_id AND school_id = v_profile.school_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_to_class_id AND school_id = v_profile.school_id
  ) THEN
    RAISE EXCEPTION 'Source or destination class does not belong to your school';
  END IF;

  SELECT id INTO v_active_ay_id
  FROM public.academic_years
  WHERE school_id = v_profile.school_id AND status = 'Active'
  ORDER BY start_date DESC
  LIMIT 1;

  IF p_academic_year_id IS NOT NULL THEN
    SELECT id, name, status::text AS status
    INTO v_ay
    FROM public.academic_years
    WHERE id = p_academic_year_id AND school_id = v_profile.school_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Academic year not found for your school';
    END IF;
    IF v_ay.status IS DISTINCT FROM 'Active' THEN
      RAISE EXCEPTION 'Historical academic year is read-only. Cannot promote students in a closed year.';
    END IF;
  ELSE
    SELECT id, name, status::text AS status
    INTO v_ay
    FROM public.academic_years
    WHERE id = v_active_ay_id;
  END IF;

  IF p_student_ids IS NULL OR COALESCE(array_length(p_student_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one student must be selected for promotion';
  END IF;

  FOREACH v_sid IN ARRAY p_student_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.students WHERE id = v_sid AND school_id = v_profile.school_id
    ) THEN
      RAISE EXCEPTION 'Student % does not belong to your school', v_sid;
    END IF;

    IF v_ay.id IS NULL OR v_ay.id = v_active_ay_id THEN
      UPDATE public.students
      SET class_id = p_to_class_id
      WHERE id = v_sid AND school_id = v_profile.school_id;
    END IF;

    IF v_ay.id IS NOT NULL THEN
      INSERT INTO public.student_year_enrollments (
        school_id,
        student_id,
        academic_year_id,
        class_id,
        shift,
        monthly_fee,
        fee_start_date,
        fee_billing_type,
        enrollment_status
      )
      SELECT
        s.school_id,
        s.id,
        v_ay.id,
        p_to_class_id,
        s.shift,
        s.monthly_fee,
        s.fee_start_date,
        s.fee_billing_type,
        s.enrollment_status
      FROM public.students s
      WHERE s.id = v_sid AND s.school_id = v_profile.school_id
      ON CONFLICT (school_id, student_id, academic_year_id)
      DO UPDATE SET class_id = EXCLUDED.class_id;
    END IF;

    INSERT INTO public.promotions (
      school_id,
      academic_year_id,
      student_id,
      from_class_id,
      to_class_id,
      academic_year_name
    )
    VALUES (
      v_profile.school_id,
      v_ay.id,
      v_sid,
      p_from_class_id,
      p_to_class_id,
      COALESCE(v_ay.name, '')
    );
  END LOOP;
END;
$$;

-- Security-invoker reporting views (always respect caller's RLS)
DROP VIEW IF EXISTS public.v_student_balances;
CREATE VIEW public.v_student_balances
WITH (security_invoker = true) AS
SELECT
  s.id AS student_id,
  s.school_id,
  s.student_id_number,
  s.name AS student_name,
  s.class_id,
  COALESCE(b.total_billed, 0)::numeric(12, 2) AS total_billed,
  COALESCE(p.total_paid, 0)::numeric(12, 2) AS total_paid,
  GREATEST(0, COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0))::numeric(12, 2) AS balance
FROM public.students s
LEFT JOIN (
  SELECT student_id, SUM(amount) AS total_billed
  FROM public.fee_bills
  GROUP BY student_id
) b ON b.student_id = s.id
LEFT JOIN (
  SELECT student_id, SUM(amount) AS total_paid
  FROM public.fee_payments
  WHERE voided = false
  GROUP BY student_id
) p ON p.student_id = s.id;

DROP VIEW IF EXISTS public.v_school_summary;
CREATE VIEW public.v_school_summary
WITH (security_invoker = true) AS
SELECT
  sch.id AS school_id,
  sch.name AS school_name,
  sch.status,
  sch.paid_until,
  pl.name AS plan_name,
  pl.student_limit,
  (SELECT COUNT(*) FROM public.students st WHERE st.school_id = sch.id AND st.enrollment_status = 'Active') AS active_students_count,
  (SELECT COUNT(*) FROM public.teachers tc WHERE tc.school_id = sch.id) AS teachers_count,
  (SELECT COUNT(*) FROM public.classes cl WHERE cl.school_id = sch.id) AS classes_count
FROM public.schools sch
JOIN public.plans pl ON pl.id = sch.plan_id;
