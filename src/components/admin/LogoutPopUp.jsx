'use client'

import { useState } from 'react'
import { Modal } from '../../components/ui/Model'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/hooks/useAuth'   

export function LogoutPopUp({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
    const { signOut,profile } = useAuth();

  const handleSignOut = async () => {
    setLoading(true)
    console.log('here')
    try {
        await signOut();
    } catch (err) {
      console.error('Failed to Logout', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User">
      <div className="mb-6">
        <p className="text-gray-700 mb-2">
          Are you sure you want to Logout? ....
        </p>
        <p className="text-sm text-gray-600">
          Name : <strong>{profile?.full_name}</strong>
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="button" 
          variant="danger" 
          onClick={handleSignOut} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'processing...' : 'Logout'}
        </Button>
      </div>
    </Modal>
  )
}
