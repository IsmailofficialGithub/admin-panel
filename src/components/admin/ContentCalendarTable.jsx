// src/components/admin/ContentCalendarTable.jsx
'use client'

import { useContentCalendar } from '@/lib/hooks/useContentCalendar'
import { Button } from '@/components/ui/Button'

export function ContentCalendarTable({ brandId = null }) {
  const { posts, loading } = useContentCalendar(brandId)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    }
    
    return badges[status] || badges.draft
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading posts...</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date & Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Brand & Platform
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Topic
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Media
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {posts.map((post) => (
            <tr key={post.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(post.date)}
                </div>
                <div className="text-xs text-gray-500">
                  {post.time || 'Not set'}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {post.brands?.name || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">
                  {post.platforms || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {post.topic || 'No topic'}
                </div>
                {post.hashtags && (
                  <div className="text-xs text-blue-600 mt-1">
                    {post.hashtags}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(post.post_status)}`}>
                  {post.post_status || 'draft'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {post.media_url && (
                    <img 
                      src={post.media_url} 
                      alt="Post media" 
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  {post.post_images?.length > 0 && (
                    <span className="text-xs text-gray-500">
                      +{post.post_images.length} images
                    </span>
                  )}
                  {!post.media_url && post.noMedia && (
                    <span className="text-xs text-gray-400">No media</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium">
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="secondary">
                    View
                  </Button>
                  <Button size="sm" variant="primary">
                    Edit
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No posts found. Create your first post!
        </div>
      )}
    </div>
  )
}