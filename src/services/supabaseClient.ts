import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://iwdgkfattksnhllmagsu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fJSCIlADXGLeTmMLy_xMeA_XR8Me-jS';

function normalizeEnvValue(raw: string | undefined, keyName: string): string {
  if (!raw) return '';
  let val = raw.trim();
  if (!val || val === 'undefined' || val === 'null') return '';
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1).trim();
  }
  const prefix = `${keyName}=`;
  if (val.startsWith(prefix)) {
    val = val.slice(prefix.length).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
  }
  if (!val || val === 'undefined' || val === 'null') return '';
  return val;
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  let val = normalizeEnvValue(raw, 'VITE_SUPABASE_URL');
  if (!val) return '';
  if (!/^https?:\/\//i.test(val) && val.includes('.') && !/\s/.test(val)) {
    val = `https://${val}`;
  }
  return val;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const envSupabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
const envSupabaseAnonKey = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  'VITE_SUPABASE_ANON_KEY'
);

const supabaseUrl =
  envSupabaseUrl && !envSupabaseUrl.includes('your-project-ref') && isValidHttpUrl(envSupabaseUrl)
    ? envSupabaseUrl
    : DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  envSupabaseAnonKey && !envSupabaseAnonKey.includes('your-supabase-anon')
    ? envSupabaseAnonKey
    : DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    isValidHttpUrl(supabaseUrl) &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    client = null;
  }
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return client;
}

export const supabase = client;
