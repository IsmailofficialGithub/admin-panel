// src/app/admin/layout.jsx
'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/admin') return 'DASHBOARD'
    if (pathname === '/admin/brands') return 'BRANDS'
    if (pathname === '/admin/content-calendar') return 'CONTENT CALENDAR'
    if (pathname === '/admin/analysis') return 'ANALYSIS'
    if (pathname === '/admin/social-accounts') return 'SOCIAL ACCOUNTS'
    if (pathname === '/admin/search-queries') return 'SEARCH QUERIES'
    if (pathname === '/admin/profiles') return 'PROFILES'
    return 'DASHBOARD'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-wide">
                  {getPageTitle()}
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.email}
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to logout?')) {
                      router.push('/login')
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}