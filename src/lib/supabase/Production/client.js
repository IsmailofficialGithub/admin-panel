import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PRODUCTION,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PRODUCTION
  )
}