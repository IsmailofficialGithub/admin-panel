// src/components/admin/CreateBrandModal.jsx
'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Model'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function CreateBrandModal({ isOpen, onClose, onSuccess}) {
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    niche: '',
    target_market: '',
    timezone: 'UTC',
    brand_colors: '',
    logo: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/brands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setFormData({
          name: '',
          website_url: '',
          niche: '',
          target_market: '',
          timezone: 'UTC',
          brand_colors: '',
          logo: ''
        })
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to create brand')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Brand" size="lg">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Brand Name"
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Corp"
            required
          />

          <Input
            label="Website URL"
            id="website_url"
            type="url"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            placeholder="https://example.com"
          />

          <Input
            label="Niche"
            id="niche"
            type="text"
            value={formData.niche}
            onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
            placeholder="Technology, Fashion, etc."
          />

          <Input
            label="Target Market"
            id="target_market"
            type="text"
            value={formData.target_market}
            onChange={(e) => setFormData({ ...formData, target_market: e.target.value })}
            placeholder="Millennials, B2B, etc."
          />

          <Input
            label="Timezone"
            id="timezone"
            type="text"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            placeholder="UTC, America/New_York"
          />

          <Input
            label="Brand Colors"
            id="brand_colors"
            type="text"
            value={formData.brand_colors}
            onChange={(e) => setFormData({ ...formData, brand_colors: e.target.value })}
            placeholder="#FF5733, #3498DB"
          />
        </div>

        <Input
          label="Logo URL"
          id="logo"
          type="url"
          value={formData.logo}
          onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
          placeholder="https://example.com/logo.png"
        />

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Brand'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}