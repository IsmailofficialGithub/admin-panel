'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreateUserModal } from '@/components/admin/CreateUserModal'
import { CreateConsumerModal } from '@/components/admin/CreateConsumerModal'
import { UserTable } from '@/components/admin/UserTable'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminUsersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateConsumerModalOpen, setIsCreateConsumerModalOpen] = useState(false)
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

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-gray-600 mt-1">Create and manage user accounts</p>
        </div>
        <div className='gap-2 flex'>
          <Button onClick={() => setIsCreateModalOpen(true)}>
          + Create User
        </Button>

        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <UserTable />
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}} // UserTable handles refetching internally via useUsers
      />
      <CreateConsumerModal
        isOpen={isCreateConsumerModalOpen}
        onClose={() => setIsCreateConsumerModalOpen(false)}
        onSuccess={() => {}} // UserTable handles refetching internally via useUsers
      />
    </div>
  )
}