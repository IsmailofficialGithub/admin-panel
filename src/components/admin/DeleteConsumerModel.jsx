'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Model'
import { Button } from '@/components/ui/Button'

export function DeleteConsumerModal({ isOpen, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      // NOTE: This assumes you have a Next.js API route set up for user deletion
      const response = await fetch(`/api/admin/consumers/${user}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('Failed to delete user', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User">
      <div className="mb-6">
        <p className="text-gray-700 mb-2">
          Are you sure you want to delete this Consumer?
        </p>
        <p className="text-sm text-gray-600">
          Email: <strong>{user?.email}</strong>
        </p>
        <p className="text-sm text-red-600 mt-2">
          This action cannot be undone.
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="button" 
          variant="danger" 
          onClick={handleDelete} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Deleting...' : 'Delete User'}
        </Button>
      </div>
    </Modal>
  )
}