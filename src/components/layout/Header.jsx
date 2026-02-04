'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function Header({ title = 'HOME' }) {
  // NOTE: Assuming you have a useAuth hook and components/ui/Badge
  const { user, profile, signOut, loading } = useAuth()

  const handleLogout = async () => {
    console.log('here')
    await signOut()
    if (confirm('Are you sure you want to logout?')) {
      await signOut()
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            {/* Dynamic Title */}
            <h1 className="text-3xl font-bold text-gray-900 tracking-wide">{title}</h1>
          </div>
          
          {/* User Info and Logout (Conditional rendering for authenticated user) */}
          {!loading && user && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-medium text-gray-900">
                    {profile?.full_name || user?.email}
                  </span>
                  <Badge variant={profile?.role}>
                    {profile?.role || 'user'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {user?.email}
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant="danger" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}