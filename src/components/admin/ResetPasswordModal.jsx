'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Model'
import { Button } from '@/components/ui/Button'
import { generatePassword } from '@/lib/randomPassword/rmPassword'

export function ResetPasswordModal({ isOpen, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false)

  console.log(user)
  const handleResetPassword = async () => {
    setLoading(true)

    try {
      // NOTE: This assumes you have a Next.js API route set up for user deletion
      const response = await fetch(`/api/admin/resetPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: user.user_id || user.id, 
          password: generatePassword(10)
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
      }
    } catch (err) {
      console.error('Failed to reset password', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Password">
      <div className="mb-6">
        <p className="text-gray-700 mb-2">
          Are you sure you want to reset the password for this user?
        </p>
        <p className="text-sm text-gray-600">
          Email: <strong>{user?.email}</strong>
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="button" 
          variant="primary" 
          onClick={handleResetPassword} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </div>
    </Modal>
  )
}