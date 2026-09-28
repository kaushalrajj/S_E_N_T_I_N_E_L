import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseClientConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl?.includes('your-project') &&
  !supabaseAnonKey?.includes('your-anon')
);

export const supabaseClient = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
