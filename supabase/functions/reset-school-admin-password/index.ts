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

    // 2. Verify caller profile is super_admin
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'super_admin' || callerProfile.school_id !== null) {
      return jsonResponse({ error: 'Forbidden: only super_admin can reset school admin passwords' }, 403);
    }

    // 3. Parse payload
    const body = await req.json();
    const schoolId = body?.schoolId ? String(body.schoolId).trim() : null;
    const requestedUserId = body?.userId ? String(body.userId).trim() : null;
    const newPassword = String(body?.newPassword || '');

    if (newPassword.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
    }

    let query = adminClient
      .from('profiles')
      .select('id, role, school_id')
      .eq('role', 'school_admin');

    if (requestedUserId) {
      query = query.eq('id', requestedUserId);
    } else if (schoolId) {
      query = query.eq('school_id', schoolId);
    } else {
      return jsonResponse({ error: 'schoolId or userId is required' }, 400);
    }

    const { data: targetAdmin, error: targetErr } = await query.limit(1).maybeSingle();
    if (targetErr || !targetAdmin) {
      return jsonResponse({ error: 'School admin account not found' }, 404);
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetAdmin.id, {
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
