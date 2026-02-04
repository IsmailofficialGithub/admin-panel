// src/app/admin/content-calendar/page.jsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ContentCalendarTable } from '@/components/admin/ContentCalendarTable'
import { useBrands } from '@/lib/hooks/useBrands'

export default function AdminContentCalendarPage() {
  const [selectedBrand, setSelectedBrand] = useState(null)
  const { brands } = useBrands()

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Calendar</h2>
          <p className="text-gray-600 mt-1">Manage scheduled social media posts</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <select
            value={selectedBrand || ''}
            onChange={(e) => setSelectedBrand(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          
          <Button>
            + Create Post
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Posts</div>
          <div className="text-2xl font-bold text-gray-900">156</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Scheduled</div>
          <div className="text-2xl font-bold text-blue-600">45</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Published</div>
          <div className="text-2xl font-bold text-green-600">98</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Drafts</div>
          <div className="text-2xl font-bold text-gray-600">13</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <ContentCalendarTable brandId={selectedBrand} />
      </div>
    </div>
  )
}