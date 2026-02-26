import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when both Supabase env vars are present.
 * The app falls back to demo/mock mode when false.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase client — null in demo mode.
 * Always guard with `isSupabaseConfigured` before use.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

/** The base URL used to call Edge Functions. */
export const supabaseFunctionsUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1`
  : null;

