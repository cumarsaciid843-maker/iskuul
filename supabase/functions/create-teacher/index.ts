import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server environment variables are not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    // 1. Verify caller's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerAuthError,
    } = await userClient.auth.getUser();

    if (callerAuthError || !caller) {
      return jsonResponse({ error: 'Invalid or expired authentication token' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Derive role and school_id strictly from public.profiles (never from user_metadata)
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: 'Caller profile not found' }, 403);
    }

    if (callerProfile.role !== 'school_admin' || !callerProfile.school_id) {
      return jsonResponse({ error: 'Forbidden: only an active school_admin can create teachers' }, 403);
    }

    const schoolId: string = callerProfile.school_id;

    // 3. Verify the caller's school is active
    const { data: school, error: schoolErr } = await adminClient
      .from('schools')
      .select('id, status')
      .eq('id', schoolId)
      .single();

    if (schoolErr || !school || school.status !== 'active') {
      return jsonResponse({ error: 'School subscription is not active' }, 403);
    }

    // 4. Parse & validate request payload
    const body = await req.json();
    const fullName = String(body?.fullName || body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const phone = body?.phone ? String(body.phone).trim() : null;
    const classId = body?.classId ? String(body.classId).trim() : null;
    const requestedAyId = body?.academicYearId ? String(body.academicYearId).trim() : null;
    const subjects = Array.isArray(body?.subjects) ? body.subjects.map((s: unknown) => String(s)) : [];

    if (!fullName) {
      return jsonResponse({ error: 'Teacher full name is required' }, 400);
    }
    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Valid teacher email is required' }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
    }

    // 5. Resolve academic year for this school
    let targetAyId: string | null = requestedAyId;
    if (targetAyId) {
      const { data: ayRow, error: ayErr } = await adminClient
        .from('academic_years')
        .select('id, status')
        .eq('id', targetAyId)
        .eq('school_id', schoolId)
        .single();
      if (ayErr || !ayRow) {
        return jsonResponse({ error: 'Academic year does not belong to your school' }, 400);
      }
      if (ayRow.status !== 'Active') {
        return jsonResponse({ error: 'Cannot create teacher in a closed academic year' }, 400);
      }
    } else {
      const { data: activeAy } = await adminClient
        .from('academic_years')
        .select('id')
        .eq('school_id', schoolId)
        .eq('status', 'Active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      targetAyId = activeAy?.id ?? null;
    }

    // 6. Validate optional classId belongs to caller's school
    if (classId) {
      const { data: clsRow, error: clsErr } = await adminClient
        .from('classes')
        .select('id, school_id')
        .eq('id', classId)
        .eq('school_id', schoolId)
        .single();

      if (clsErr || !clsRow) {
        return jsonResponse({ error: 'Selected class does not belong to your school' }, 400);
      }
    }

    // 7. Create Auth user
    const { data: createdAuth, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createAuthErr || !createdAuth?.user) {
      return jsonResponse({ error: createAuthErr?.message || 'Failed to create auth user' }, 400);
    }

    const newUserId = createdAuth.user.id;
    const initials = fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // 8. Insert public.profiles row explicitly (no auth trigger)
    const { data: profileRow, error: insertProfileErr } = await adminClient
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name: fullName,
        role: 'teacher',
        school_id: schoolId,
        avatar_initials: initials || 'TR',
      })
      .select()
      .single();

    if (insertProfileErr) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: insertProfileErr.message }, 400);
    }

    // 9. Insert public.teachers row
    const { data: teacherRow, error: insertTeacherErr } = await adminClient
      .from('teachers')
      .insert({
        school_id: schoolId,
        user_id: newUserId,
        name: fullName,
        email,
        phone,
        subjects,
        academic_year_id: targetAyId,
        available_in_year_ids: targetAyId ? [targetAyId] : [],
      })
      .select()
      .single();

    if (insertTeacherErr) {
      await adminClient.from('profiles').delete().eq('id', newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return jsonResponse({ error: insertTeacherErr.message }, 400);
    }

    // 10. Assign optional class
    if (classId) {
      if (targetAyId) {
        await adminClient
          .from('teacher_year_assignments')
          .delete()
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .eq('academic_year_id', targetAyId);

        await adminClient.from('teacher_year_assignments').insert({
          school_id: schoolId,
          teacher_id: teacherRow.id,
          class_id: classId,
          academic_year_id: targetAyId,
        });
      }

      await adminClient
        .from('classes')
        .update({ teacher_id: teacherRow.id })
        .eq('id', classId)
        .eq('school_id', schoolId);
    }

    return jsonResponse({ user: profileRow, teacher: teacherRow }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return jsonResponse({ error: message }, 500);
  }
});
