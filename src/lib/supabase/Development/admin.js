import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_ISMAIL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_ISMAIL,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
