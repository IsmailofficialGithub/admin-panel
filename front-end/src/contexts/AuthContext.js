import React, { createContext, useContext, useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { createClient } from '../lib/supabase/Production/client'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => createClient())
  const history = useHistory()

  // Check trial expiry for consumers
  const checkTrialExpiry = async (userId) => {
    try {
      console.log('🔍 Checking trial expiry for user:', userId)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('trial_expiry, role')
        .eq('user_id', userId)
        .single()

      // Only check trial expiry for consumers
      if (profileData?.role === 'consumer' && profileData?.trial_expiry) {
        const expiryDate = new Date(profileData.trial_expiry)
        const now = new Date()
        
        console.log('📅 Trial expiry date:', expiryDate)
        console.log('📅 Current date:', now)

        if (expiryDate < now) {
          console.log('❌ Trial has expired!')
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          window.location.href = '/trial-expired'
          return false
        } else {
          const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
          console.log('✅ Trial is active. Days left:', daysLeft)
        }
      }
      return true
    } catch (error) {
      console.error('❌ Error checking trial expiry:', error)
      return true // Don't block on error
    }
  }

  useEffect(() => {
    console.log('🔄 AuthContext: Initializing authentication...')
    // Check auth only once on mount
    const initAuth = async () => {
      try {
        console.log('🔄 AuthContext: Fetching session...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('✅ AuthContext: Session retrieved:', session ? 'User logged in' : 'No session')

        if (session?.user) {
          console.log('👤 AuthContext: User ID:', session.user.id)
          
          // Check trial expiry first
          const isTrialValid = await checkTrialExpiry(session.user.id)
          if (!isTrialValid) {
            return // User will be redirected to trial-expired page
          }

          setUser(session.user)

          console.log('🔄 AuthContext: Fetching profile...')
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          console.log('✅ AuthContext: Profile loaded:', profileData)
          setProfile(profileData)
        } else {
          console.log('⚠️ AuthContext: No user session found')
        }
      } catch (error) {
        console.error('❌ AuthContext: Auth error:', error)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state changed:', event)
      if (session?.user) {
        // Check trial expiry
        const isTrialValid = await checkTrialExpiry(session.user.id)
        if (!isTrialValid) {
          return // User will be redirected to trial-expired page
        }

        setUser(session.user)
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        setProfile(profileData)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      toast.success('Logged out successfully!')
      history.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const getRoleBasedPath = () => {
    const roleRoutes = {
      'admin': '/admin/dashboard',
      'user': '/user/dashboard',
      'viewer': '/viewer/dashboard',
      'consumer': '/consumer/dashboard',
      'resaler': '/resalers/consumers'
    }
    return roleRoutes[profile?.role] || '/login'
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    userRole: profile?.role,
    getRoleBasedPath
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

