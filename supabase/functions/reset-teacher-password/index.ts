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

    // 1. Verify caller JWT
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

    // 2. Verify caller profile is an active school_admin
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'school_admin' || !callerProfile.school_id) {
      return jsonResponse({ error: 'Forbidden: only an active school_admin can reset teacher passwords' }, 403);
    }

    const { data: school, error: schoolErr } = await adminClient
      .from('schools')
      .select('id, status')
      .eq('id', callerProfile.school_id)
      .single();

    if (schoolErr || !school || school.status !== 'active') {
      return jsonResponse({ error: 'School subscription is not active' }, 403);
    }

    // 3. Validate payload & target teacher belongs to caller's school
    const body = await req.json();
    const teacherId = body?.teacherId ? String(body.teacherId).trim() : null;
    const requestedUserId = body?.userId ? String(body.userId).trim() : null;
    const newPassword = String(body?.newPassword || '');

    if (newPassword.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
    }

    let targetUserId = requestedUserId;
    if (teacherId) {
      const { data: teacherRow, error: teacherErr } = await adminClient
        .from('teachers')
        .select('id, user_id, school_id')
        .eq('id', teacherId)
        .eq('school_id', callerProfile.school_id)
        .single();

      if (teacherErr || !teacherRow || !teacherRow.user_id) {
        return jsonResponse({ error: 'Teacher not found in your school' }, 404);
      }
      targetUserId = teacherRow.user_id;
    }

    if (!targetUserId) {
      return jsonResponse({ error: 'teacherId or userId is required' }, 400);
    }

    // Verify target profile is a teacher in the exact same school
    const { data: targetProfile, error: targetProfileErr } = await adminClient
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', targetUserId)
      .eq('school_id', callerProfile.school_id)
      .eq('role', 'teacher')
      .single();

    if (targetProfileErr || !targetProfile) {
      return jsonResponse({ error: 'Target teacher does not belong to your school' }, 403);
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updateErr) {
      return jsonResponse({ error: updateErr.message }, 400);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return jsonResponse({ error: message }, 500);
  }
});
