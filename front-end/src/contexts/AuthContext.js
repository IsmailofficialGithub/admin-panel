import React, { createContext, useContext, useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, account_status')
        .eq('user_id', userId)
        .single()

      const role = profileData?.role
      const accountStatus = profileData?.account_status

      // Consumers should be redirected to external site immediately
      if (role === 'consumer') {
        console.log('❌ AuthContext: Consumer role detected. Redirecting to external site.')
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

      // Define allowed roles (consumers are not allowed)
      const allowedRoles = ['admin', 'reseller']
      
      if (!role || !allowedRoles.includes(role)) {
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

      // Check if consumer account is deactivated
      if (role === 'consumer' && accountStatus === 'deactive') {
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

      // Check if reseller account is deactivated
      if (role === 'reseller' && accountStatus === 'deactive') {
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

          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          // Consumers should be redirected to external site immediately
          if (profileData?.role === 'consumer') {
            console.log('❌ AuthContext: Consumer role detected. Redirecting to external site.')
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
          if (profileData?.role === 'reseller' && profileData?.account_status === 'deactive') {
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
    
    const role = profile.role
    
    if (role === 'admin' && path.startsWith('/admin')) return true
    if (role === 'reseller' && path.startsWith('/reseller')) return true
    
    return false
  }

  // Helper function to get the correct dashboard path for user's role
  const getDashboardPath = () => {
    if (!profile || !profile.role) return '/login'
    
    const role = profile.role
    if (role === 'admin') return '/admin/dashboard'
    if (role === 'reseller') return '/reseller/dashboard'
    
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
    isAdmin: profile?.role === 'admin',
    isReseller: profile?.role === 'reseller',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

