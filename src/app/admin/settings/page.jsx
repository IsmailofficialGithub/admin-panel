'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function AdminSettingsPage() {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState({
    siteName: 'Admin Dashboard',
    siteEmail: 'admin@example.com',
    maxUsers: '1000',
    enableRegistration: true,
    enableNotifications: true
  })

  // Route protection
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/login')
    }
  }, [isAdmin, loading, router])

  const handleSave = () => {
    // In a real application, you would send an API request here
    alert('Settings saved successfully! (Simulated)')
  }

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

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
        
        <Input
          label="Site Name"
          id="siteName"
          value={settings.siteName}
          onChange={(e) => setSettings({...settings, siteName: e.target.value})}
        />

        <Input
          label="Site Email"
          id="siteEmail"
          type="email"
          value={settings.siteEmail}
          onChange={(e) => setSettings({...settings, siteEmail: e.target.value})}
        />

        <Input
          label="Maximum Users"
          id="maxUsers"
          type="number"
          value={settings.maxUsers}
          onChange={(e) => setSettings({...settings, maxUsers: e.target.value})}
        />

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.enableRegistration}
              onChange={(e) => setSettings({...settings, enableRegistration: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable User Registration</span>
          </label>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
          </label>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave}>Save Changes</Button>
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}