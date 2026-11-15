# School Manager (DugsiManager)

Multi-tenant School Management System built with React, TypeScript, Vite, Tailwind CSS, and Supabase (PostgreSQL + Row Level Security + Auth + Edge Functions). Supports full multilingual UI (`English`, `Soomaali`, `العربية`), academic-year-scoped records, fee billing/payments, attendance, and PWA installability.

---

## 1. Environment Variables

Copy `.env.example` to `.env` (or configure environment variables in Vercel / Netlify / AI Studio):

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-public-key"
```

> **Security Note:** Never place `SUPABASE_SERVICE_ROLE_KEY` in frontend environment variables or source code. The service role key is only used inside Supabase Edge Functions (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`, automatically injected by Supabase).

---

## 2. Database Migrations (Supabase SQL Editor)

1. Ensure the base multi-tenant schema migration (`001`) has already been applied in your Supabase SQL Editor.
2. Apply the follow-up migration in `supabase/migrations/002_take_attendance_class_check.sql` in the **Supabase SQL Editor**:
   - Enforces that every `student_id` submitted to `take_attendance` belongs to the specified `p_class_id` and caller's school.
   - Adds `request_subscription_renewal(p_plan_id, p_payment_method, p_reference)` for suspended schools submitting renewal payments from the Paused Access screen.

---

## 3. Supabase Auth Setup & First Super Admin

1. In **Supabase Dashboard → Authentication → Providers → Email**:
   - Ensure Email/Password sign-in is enabled.
   - If schools register via `/get-started` and log in right away once approved, either disable **"Confirm email"** in Authentication settings or ensure users confirm their email address before signing in.
2. To create your first **Super Admin**:
   - Create a user in **Authentication → Users** (or sign up via the Auth API).
   - Run the following SQL in the **Supabase SQL Editor** to promote that user to `super_admin` (since `handle_new_auth_user` trigger is disabled, insert or update `public.profiles`):

```sql
INSERT INTO public.profiles (id, email, full_name, role, school_id)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Super Admin'), 'super_admin', NULL
FROM auth.users
WHERE email = 'admin@yourdomain.com'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin',
    school_id = NULL;
```

---

## 4. Deploy Supabase Edge Functions

Three Edge Functions handle privileged Auth operations (`auth.admin.*`) and profile/teacher provisioning after strictly verifying the caller's JWT and `public.profiles` role/school:

- `supabase/functions/create-teacher` — Verifies active `school_admin` caller, creates the Auth user, and inserts `public.profiles`, `public.teachers`, and `public.teacher_year_assignments` using `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase/functions/reset-teacher-password` — Verifies active `school_admin` caller and same-school teacher ownership before resetting password.
- `supabase/functions/reset-school-admin-password` — Verifies `super_admin` caller before resetting a school admin's password.

Deploy all three with the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-teacher
supabase functions deploy reset-teacher-password
supabase functions deploy reset-school-admin-password
```

---

## 5. Local Development & Build

```bash
npm install
npm run dev       # Starts Vite dev server on port 3000
npm run lint      # Runs TypeScript type-checking (tsc --noEmit)
npm run build     # Builds production bundle into dist/
```
