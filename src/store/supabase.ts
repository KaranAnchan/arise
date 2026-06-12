/**
 * The Supabase client — or null. The app is local-first: with no env configured,
 * every feature except sync works and the UI says so quietly. Never gate anything
 * on `supabase` being present except sync/auth themselves.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey && url.startsWith('https://') && !url.includes('YOUR-PROJECT')
    ? createClient(url, anonKey)
    : null;
