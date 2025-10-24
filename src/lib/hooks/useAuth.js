'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  // NOTE: createClient needs to be implemented to use Supabase client
  const supabase = createClient() 

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // NOTE: 'user_profiles' table must exist in your Supabase schema
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setProfile(profile)
      }
      
      setLoading(false)
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    console.log('call')
    await supabase.auth.signOut()
   document.cookie = 'sb:token=; Max-Age=0; path=/';
  document.cookie = 'sb:refresh-token=; Max-Age=0; path=/';
    router.push('/login')
  }

  return { user, profile, loading, signOut, isAdmin: profile?.role === 'admin' }
}