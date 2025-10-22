'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button' // Assuming this path is correct

const AdminEntryPage = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      
      {/* Introduction Section */}
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Admin Panel Access</h1>
      <p className="text-lg text-gray-600 mb-12 max-w-xl text-center">
        Welcome! Use the sections below to access key administrative features or jump directly to the main dashboard.
      </p>

      {/* Two Main Sections (Buttons styled as entry cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        
        {/* Section 1: User Management */}
        <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:scale-[1.02] border-t-4 border-blue-600">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">👥 User Management</h2>
          <p className="text-gray-600 mb-6">
            View, create, edit, and delete user accounts and their associated roles. Essential for maintaining system security and access levels.
          </p>
          <Button 
            onClick={() => router.push('/admin/users')}
            className="w-full"
            variant="primary"
          >
            Go to Users Page
          </Button>
        </div>

        {/* Section 2: Reports & Analytics */}
        <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:scale-[1.02] border-t-4 border-green-600">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">📊 System Reports</h2>
          <p className="text-gray-600 mb-6">
            Access analytics, track user growth, monitor system health, and view detailed logs and usage data.
          </p>
          <Button 
            onClick={() => router.push('/admin/reports')}
            className="w-full"
            variant="success"
          >
            View Reports
          </Button>
        </div>
      </div>
      
      {/* Footer Button to Main Dashboard */}
      <Button  
        className='mt-12 cursor-pointer' 
        onClick={() => router.push('/admin')}
        variant="secondary"
        size="lg"
      >
        🏠 Main Admin Dashboard
      </Button>
    </div>
  )
}

export default AdminEntryPage