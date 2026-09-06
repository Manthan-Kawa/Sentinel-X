import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const KEY_SUPABASE_URL = 'sentinel_supabase_url';
export const KEY_SUPABASE_ANON_KEY = 'sentinel_supabase_anon_key';

/** Retrieves current Supabase URL from environment or localStorage */
function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

/** Retrieves current Supabase URL from environment or localStorage with resilient fallback */
export const getSupabaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (envUrl && !envUrl.includes('placeholder') && !envUrl.includes('your-project')) {
    return cleanSupabaseUrl(envUrl);
  }
  try {
    const local = localStorage.getItem(KEY_SUPABASE_URL);
    if (local && local.trim()) return cleanSupabaseUrl(local);
  } catch {
    // ignore
  }
  // Hardcoded fallback — guarantees mobile devices & external clients always connect to the shared database
  return 'https://guipyyckfappwsnwnjdn.supabase.co';
};

/** Retrieves current Supabase Anon Key from environment or localStorage with resilient fallback */
export const getSupabaseAnonKey = (): string => {
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (envKey && !envKey.includes('placeholder') && !envKey.includes('your-anon-key')) {
    return envKey;
  }
  try {
    const local = localStorage.getItem(KEY_SUPABASE_ANON_KEY);
    if (local && local.trim()) return local.trim();
  } catch {
    // ignore
  }
  // Hardcoded fallback — guarantees mobile devices & external clients always connect to the shared database
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aXB5eWNrZmFwcHdzbnduamRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDIxNDcsImV4cCI6MjEwNDI3ODE0N30.mz0_0heMuNtiWlgZPTK1hJx0l7cLb8ZSnKZf7fxcFjQ';
};

/** Checks whether valid Supabase credentials have been configured */
export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('http') &&
    anonKey.length > 20 &&
    !url.includes('placeholder')
  );
};

let clientInstance: SupabaseClient | null = null;

const createClientInstance = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
};

clientInstance = createClientInstance();

/** Returns active Supabase client instance */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!clientInstance && isSupabaseConfigured()) {
    clientInstance = createClientInstance();
  }
  return clientInstance;
};

/** Proxy export for backward compatibility with `supabase` object */
export const supabase: SupabaseClient | null = clientInstance;

/** Dynamically configure or update Supabase credentials */
export const setSupabaseConfig = (url: string, anonKey: string): boolean => {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (cleanUrl) localStorage.setItem(KEY_SUPABASE_URL, cleanUrl);
    else localStorage.removeItem(KEY_SUPABASE_URL);

    if (cleanKey) localStorage.setItem(KEY_SUPABASE_ANON_KEY, cleanKey);
    else localStorage.removeItem(KEY_SUPABASE_ANON_KEY);

    clientInstance = createClientInstance();
    return true;
  } catch (e) {
    console.error('Failed to set Supabase config:', e);
    return false;
  }
};

/** Test connection to Supabase database */
export const testSupabaseConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, error: 'Supabase URL or Anon Key is missing.' };
  }
  try {
    const { error } = await client.from('profiles').select('id', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist yet, we can check auth session
      if (error.code === '42P01') {
        return { ok: true, error: 'Connected to Supabase, but "profiles" table not yet created. Please run the migration SQL.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Connection failed.' };
  }
};
