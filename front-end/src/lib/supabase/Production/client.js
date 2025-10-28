import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Singleton instance - created once and reused everywhere
let supabaseInstance = null;

export function createClient() {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL_PRODUCTION;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY_PRODUCTION;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing in .env file');
  }

  // Create the singleton instance using supabase-js (for React SPA)
  // This will store sessions in localStorage automatically
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,  // Store session in localStorage
      autoRefreshToken: true,  // Automatically refresh token
      detectSessionInUrl: true  // Detect OAuth callback
    }
  });
  console.log('✅ Supabase singleton client created (with localStorage)');
  
  return supabaseInstance;
}

// Direct export of the singleton instance for easy importing
export const supabase = createClient();



