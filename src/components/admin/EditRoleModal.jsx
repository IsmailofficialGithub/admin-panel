'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Model'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

export function EditRoleModal({ isOpen, onClose, user, onSuccess }) {
  // NOTE: Initial state must be set only when modal opens, typically by passing user prop
  const [role, setRole] = useState(user?.role || 'user')
  const [loading, setLoading] = useState(false)

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'viewer', label: 'Viewer' }
  ]

  // Re-sync role state when user prop changes
  useState(() => {
      setRole(user?.role || 'user');
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // NOTE: This assumes you have a Next.js API route set up for role updates
      const response = await fetch(`/api/admin/users/${user.user_id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('Failed to update role', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User Role">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-600 mb-4">
          Changing role for: <strong>{user?.email}</strong>
        </p>

        <Select
          label="Role"
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={roleOptions}
          required
        />

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}