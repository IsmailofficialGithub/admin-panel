import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL_PRODUCTION;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY_PRODUCTION;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
