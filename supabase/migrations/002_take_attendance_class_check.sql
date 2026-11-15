-- Migration 002:
-- 1) Update take_attendance so every student_id MUST belong to the given class (and school), otherwise raise an error.
-- 2) Add request_subscription_renewal RPC for suspended schools on PausedAccessPage.

CREATE OR REPLACE FUNCTION public.take_attendance(
  p_class_id uuid,
  p_date date,
  p_records jsonb,
  p_academic_year_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_status_type text;
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
    WHERE school_id = v_profile.school_id AND status::text = 'Active'
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

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_status_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'attendance' AND a.attname = 'status';

  IF v_status_type IS NULL THEN
    v_status_type := 'text';
  END IF;

  -- First validate EVERY student_id in p_records belongs to p_class_id and caller's school
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

  -- Upsert validated records
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::uuid;
    v_status := v_rec->>'status';

    DELETE FROM public.attendance
    WHERE school_id = v_profile.school_id
      AND student_id = v_student_id
      AND date = p_date
      AND academic_year_id IS NOT DISTINCT FROM v_ay_id;

    EXECUTE format(
      'INSERT INTO public.attendance (school_id, academic_year_id, class_id, student_id, date, status) VALUES ($1, $2, $3, $4, $5, $6::%s)',
      v_status_type
    )
    USING v_profile.school_id, v_ay_id, p_class_id, v_student_id, p_date, v_status;
  END LOOP;
END;
$$;

-- Allow a school_admin (even while suspended) to submit a pending renewal payment request
CREATE OR REPLACE FUNCTION public.request_subscription_renewal(
  p_plan_id uuid,
  p_payment_method text,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_plan record;
  v_payment_id uuid;
  v_school_pm_type text;
  v_sp_method_type text;
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

  SELECT id, price INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected plan not found';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_school_pm_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'schools' AND a.attname = 'payment_method';

  IF v_school_pm_type IS NULL THEN
    v_school_pm_type := 'text';
  END IF;

  EXECUTE format(
    'UPDATE public.schools SET payment_method = $1::%s, payment_reference = COALESCE($2, payment_reference) WHERE id = $3',
    v_school_pm_type
  )
  USING p_payment_method, p_reference, v_profile.school_id;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_sp_method_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'school_payments' AND a.attname = 'method';

  IF v_sp_method_type IS NULL THEN
    v_sp_method_type := 'text';
  END IF;

  EXECUTE format(
    'INSERT INTO public.school_payments (school_id, plan_id, amount, method, reference, status) VALUES ($1, $2, $3, $4::%s, $5, ''pending'') RETURNING id',
    v_sp_method_type
  )
  USING v_profile.school_id, p_plan_id, v_plan.price, p_payment_method, p_reference
  INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;
