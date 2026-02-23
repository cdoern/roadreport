import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
      'Copy .env.example to .env.local and fill in your Supabase project URL.'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
      'Copy .env.example to .env.local and fill in your Supabase anon key.'
  );
}

/** Singleton Supabase client. Import this wherever Supabase access is needed. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
