'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Model'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useBrands } from '@/lib/hooks/useBrands'

export function EditBrandModal({ isOpen, onClose, onSuccess, brandId }) {
  const { updateBrand, getBrandById } = useBrands()

  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    niche: '',
    target_market: '',
    timezone: 'UTC',
    brand_colors: '',
    logo: ''
  })

  const [loading, setLoading] = useState(false) // For saving
  const [fetching, setFetching] = useState(false) // For initial fetch
  const [error, setError] = useState('')

  // 🧩 Fetch brand details when modal opens
  useEffect(() => {
    const fetchBrand = async () => {
      if (!brandId || !isOpen) return
      setFetching(true)
      setError('')

      try {
        const result = await getBrandById(brandId)
        if (result.success) {
          setFormData({
            name: result.data.name || '',
            website_url: result.data.website_url || '',
            niche: result.data.niche || '',
            target_market: result.data.target_market || '',
            timezone: result.data.timezone || 'UTC',
            brand_colors: result.data.brand_colors || '',
            logo: result.data.logo || ''
          })
        } else {
          setError(result.error || 'Failed to fetch brand details')
        }
      } catch (err) {
        setError('An unexpected error occurred while fetching brand')
      } finally {
        setFetching(false)
      }
    }

    fetchBrand()
  }, [brandId, isOpen])

  // 📝 Handle save
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!brandId) {
        setError('Missing brand ID')
        return
      }

      const result = await updateBrand(brandId, formData)
      if (result.success) {
        onSuccess?.()
        onClose?.()
      } else {
        setError(result.error || 'Failed to update brand')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Brand" size="lg">
      {fetching ? (
        <div className="p-8 text-center text-gray-600">Loading brand details...</div>
      ) : (
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
              required
            />
            <Input
              label="Website URL"
              id="website_url"
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            />
            <Input
              label="Niche"
              id="niche"
              type="text"
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
            />
            <Input
              label="Target Market"
              id="target_market"
              type="text"
              value={formData.target_market}
              onChange={(e) => setFormData({ ...formData, target_market: e.target.value })}
            />
            <Input
              label="Timezone"
              id="timezone"
              type="text"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            />
            <Input
              label="Brand Colors"
              id="brand_colors"
              type="text"
              value={formData.brand_colors}
              onChange={(e) => setFormData({ ...formData, brand_colors: e.target.value })}
            />
          </div>

          <Input
            label="Logo URL"
            id="logo"
            type="url"
            value={formData.logo}
            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
          />

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
