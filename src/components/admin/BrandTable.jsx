// src/components/admin/BrandTable.jsx
'use client'

import { useBrands } from '@/lib/hooks/useBrands'
import { Button } from '@/components/ui/Button'
import { useEffect } from 'react'

export function BrandTable({ onEdit, onDelete,isrefetch,setIsRefresh }) {
  const { brands, loading,refetch } = useBrands()

  useEffect(()=>{
    if(isrefetch){
      refetch()
      setIsRefresh(false)
    }
  },[isrefetch])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading brands...</div>
      </div>
    )
  }
  

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Brand Info
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Niche
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Target Market
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Website
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {brands.map((brand) => (
            <tr key={brand.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {brand.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                    <div className="text-xs text-gray-500">{brand.timezone || 'UTC'} | {brand?.owner_email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{brand.niche || 'N/A'}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{brand.target_market || 'N/A'}</td>
              <td className="px-6 py-4 text-sm">
                {brand.website_url ? (
                  <a 
                    href={brand.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Visit →
                  </a>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(brand.created_at)}
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium">
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(brand)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDelete(brand)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {brands.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No brands found. Create your first brand!
        </div>
      )}
    </div>
  )
}