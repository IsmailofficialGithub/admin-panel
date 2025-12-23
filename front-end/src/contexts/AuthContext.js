import React, { createContext, useContext, useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { createClient } from '../lib/supabase/Production/client'
import toast from 'react-hot-toast'
import { hasRole, hasAnyRole, getPrimaryRole, normalizeRole } from '../utils/roleUtils'

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
  const [loading, setLoading] = useState(true) // Start as true to wait for auth check
  const [supabase] = useState(() => createClient())
  const history = useHistory()
  const location = useLocation()
  
  // Check if current path is the payment page (public route)
  const isPaymentPage = location.pathname === '/payment'

  // Check if user has a valid role and active account
  const checkValidRole = async (userId) => {
    // Skip role checks on payment page - it's a public route
    if (isPaymentPage) {
      return true
    }
    
    try {
      // Get user to check if they are system admin
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      
      if (!userId) return false
      
      // Check if user has is_systemadmin flag in profiles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('is_systemadmin')
        .eq('user_id', userId)
        .single()
      
      // Bypass profile check for system admin users
      if (userProfile?.is_systemadmin === true) {
        return true
      }
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, account_status')
        .eq('user_id', userId)
        .single()

      const role = profileData?.role
      const accountStatus = profileData?.account_status

      console.log('🔍 checkValidRole: Checking role:', { role, roleType: typeof role, isArray: Array.isArray(role) })

      // Check if user has reseller role first
      if (hasRole(role, 'reseller')) {
        console.log('✅ checkValidRole: User has reseller role, allowing access')
        // Check if reseller account is deactivated
        if (accountStatus === 'deactive') {
          await supabase.auth.signOut()
          // Wait for signOut to complete
          await new Promise(resolve => setTimeout(resolve, 200))
          // Clear all tokens and storage
          localStorage.clear()
          sessionStorage.clear()
          // Clear all cookies including Supabase auth cookies with domain
          document.cookie.split(";").forEach((c) => {
            const cookieName = c.split("=")[0].trim()
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
          })
          setUser(null)
          setProfile(null)
          toast.error('Your account has been deactivated. Please contact the administrator.')
          // Force redirect and reload to ensure clean state
          setTimeout(() => {
            window.location.href = '/login'
          }, 500)
          return false
        }
        // User has reseller role and account is active, allow access
        return true
      }
      
      // If user is ONLY consumer (no reseller role), redirect to external site
      const userRoles = normalizeRole(role)
      const isOnlyConsumer = userRoles.length === 1 && userRoles.includes('consumer')
      if (isOnlyConsumer) {
        console.log('❌ AuthContext: Consumer-only role detected. Redirecting to external site.')
        await supabase.auth.signOut()
        // Wait for signOut to complete
        await new Promise(resolve => setTimeout(resolve, 200))
        // Clear all tokens and storage
        localStorage.clear()
        sessionStorage.clear()
        // Clear all cookies including Supabase auth cookies
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim()
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
        })
        setUser(null)
        setProfile(null)
        // Redirect to external site
        window.location.href = 'https://social.duhanashrah.ai/'
        return false
      }

      // Define allowed roles (admin is allowed, reseller already handled above)
      const allowedRoles = ['admin']
      
      if (!hasAnyRole(role, allowedRoles)) {
        await supabase.auth.signOut()
        // Clear all tokens and storage
        localStorage.clear()
        sessionStorage.clear()
        // Clear all cookies including Supabase auth cookies
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim()
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
        })
        setUser(null)
        setProfile(null)
        toast.error('Access denied. No valid role assigned.')
        history.push('/login')
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ Error checking role:', error)
      return false
    }
  }

  useEffect(() => {
    // Check auth only once on mount
    const initAuth = async () => {
      try {
        setLoading(true)
        
        // Skip all auth checks on payment page - it's a public route
        if (isPaymentPage) {
          setLoading(false)
          return
        }
        
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          // Check if user has a valid role
          const hasValidRole = await checkValidRole(session.user.id)
          if (!hasValidRole) {
            setLoading(false)
            return // User will be signed out and redirected to login
          }

          setUser(session.user)

          // Check if user is system admin - bypass profile check
          const { data: systemAdminProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_systemadmin', true)
            .single()
          
          if (systemAdminProfile) {
            // User is system admin - use their actual profile
            setProfile(systemAdminProfile)
            setLoading(false)
            return
          }

          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          console.log('🔍 AuthContext: Profile loaded:', { role: profileData?.role, roleType: typeof profileData?.role, isArray: Array.isArray(profileData?.role) })

          // Check if user has reseller role first - if yes, allow access
          if (hasRole(profileData?.role, 'reseller')) {
            console.log('✅ AuthContext: User has reseller role, setting profile and allowing access')
            // User has reseller role, set profile and continue (will redirect to reseller dashboard)
            setProfile(profileData)
            setLoading(false)
            return
          }
          
          // If user is ONLY consumer (no reseller role), redirect to external site
          const userRoles = normalizeRole(profileData?.role)
          console.log('🔍 AuthContext: Normalized roles:', userRoles, 'isOnlyConsumer:', userRoles.length === 1 && userRoles.includes('consumer'))
          const isOnlyConsumer = userRoles.length === 1 && userRoles.includes('consumer')
          if (isOnlyConsumer) {
            console.log('❌ AuthContext: Consumer-only role detected. Redirecting to external site.')
            await supabase.auth.signOut()
            // Wait for signOut to complete
            await new Promise(resolve => setTimeout(resolve, 200))
            // Clear all tokens and storage
            localStorage.clear()
            sessionStorage.clear()
            // Clear all cookies including Supabase auth cookies
            document.cookie.split(";").forEach((c) => {
              const cookieName = c.split("=")[0].trim()
              document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`
              document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
            })
            setUser(null)
            setProfile(null)
            setLoading(false)
            toast.error('You are not authorized to access this page. Redirecting to external site...');
            setTimeout(() => {
              window.location.href = 'https://social.duhanashrah.ai/';
            }, 3000);
            return
          }

          // Check if reseller account is deactivated
          if (hasRole(profileData?.role, 'reseller') && profileData?.account_status === 'deactive') {
            await supabase.auth.signOut()
            // Wait for signOut to complete
            await new Promise(resolve => setTimeout(resolve, 200))
            // Clear all tokens and storage
            localStorage.clear()
            sessionStorage.clear()
            // Clear all cookies including Supabase auth cookies with domain
            document.cookie.split(";").forEach((c) => {
              const cookieName = c.split("=")[0].trim()
              document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`
              document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
            })
            setUser(null)
            setProfile(null)
            toast.error('Your account has been deactivated. Please contact the administrator.')
            // Force redirect and reload to ensure clean state
            setTimeout(() => {
              window.location.href = '/login'
            }, 500)
            setLoading(false)
            return
          }

          setProfile(profileData)
        }
      } catch (error) {
        console.error('❌ AuthContext: Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    // const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    //   console.log('🔄 AuthContext: Auth state changed:', event)
    //   if (session?.user) {
    //     // Check trial expiry
    //     const isTrialValid = await checkTrialExpiry(session.user.id)
    //     if (!isTrialValid) {
    //       return // User will be redirected to trial-expired page
    //     }

    //     setUser(session.user)
        
    //     const { data: profileData } = await supabase
    //       .from('profiles')
    //       .select('*')
    //       .eq('user_id', session.user.id)
    //       .single()

    //     setProfile(profileData)
    //   } else {
    //     setUser(null)
    //     setProfile(null)
    //   }
    // })

    // return () => subscription.unsubscribe()
  }, [supabase, isPaymentPage])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // Clear all tokens and storage
      localStorage.clear()
      sessionStorage.clear()
      // Clear all cookies including Supabase auth cookies
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim()
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
      })
      setUser(null)
      setProfile(null)
      toast.success('Logged out successfully!')
      history.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  // Helper function to check if user can access a specific route
  const canAccessRoute = (path) => {
    if (!profile || !profile.role) return false
    
    if (hasRole(profile.role, 'admin') && path.startsWith('/admin')) return true
    if (hasRole(profile.role, 'reseller') && path.startsWith('/reseller')) return true
    
    return false
  }

  // Helper function to get the correct dashboard path for user's role
  const getDashboardPath = () => {
    if (!profile || !profile.role) return '/login'
    
    const primaryRole = getPrimaryRole(profile.role)
    if (primaryRole === 'admin') return '/admin/dashboard'
    if (primaryRole === 'reseller') return '/reseller/dashboard'
    
    return '/login'
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    canAccessRoute,
    getDashboardPath,
    isAuthenticated: !!user,
    isAdmin: hasRole(profile?.role, 'admin'),
    isReseller: hasRole(profile?.role, 'reseller'),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

