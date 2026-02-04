'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'

export default function AdminRolesPage() {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()

  // Route protection
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/login')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const roles = [
    {
      name: 'Admin',
      description: 'Full access to all features and settings',
      permissions: ['Create users', 'Delete users', 'Manage roles', 'View reports', 'System settings'],
      count: 12,
      variant: 'admin'
    },
    {
      name: 'Moderator',
      description: 'Can manage users and view reports',
      permissions: ['View users', 'Edit users', 'View reports'],
      count: 25,
      variant: 'moderator'
    },
    {
      name: 'User',
      description: 'Standard user with basic access',
      permissions: ['View own profile', 'Edit own profile'],
      count: 987,
      variant: 'user'
    },
    {
      name: 'Viewer',
      description: 'Read-only access to basic features',
      permissions: ['View dashboard', 'View reports'],
      count: 210,
      variant: 'viewer'
    }
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div key={role.name} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge variant={role.variant}>{role.name}</Badge>
                <span className="text-sm text-gray-500">{role.count} users</span>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{role.description}</p>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Permissions:</h4>
              <ul className="space-y-1">
                {role.permissions.map((permission, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}