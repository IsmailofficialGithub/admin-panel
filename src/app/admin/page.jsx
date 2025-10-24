// src/app/admin/page.jsx
'use client'

import { useBrands } from '@/lib/hooks/useBrands'
import { useContentCalendar } from '@/lib/hooks/useContentCalendar'

export default function AdminDashboardPage() {
  const { brands, loading: brandsLoading } = useBrands()
  const { posts, loading: postsLoading } = useContentCalendar()

  const scheduledPosts = posts.filter(p => p.post_status === 'scheduled').length
  const publishedPosts = posts.filter(p => p.post_status === 'published').length
  const draftPosts = posts.filter(p => !p.post_status || p.post_status === 'draft').length

  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome to DNAI Admin Dashboard</h2>
        <p className="text-blue-100">Manage your brands, content calendar, and analytics from here.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-2">Total Brands</div>
          <div className="text-3xl font-bold text-gray-900">
            {brandsLoading ? '...' : brands.length}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-2">Published Posts</div>
          <div className="text-3xl font-bold text-gray-900">
            {postsLoading ? '...' : publishedPosts}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-sm text-gray-600 mb-2">Scheduled Posts</div>
          <div className="text-3xl font-bold text-gray-900">
            {postsLoading ? '...' : scheduledPosts}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-2">Draft Posts</div>
          <div className="text-3xl font-bold text-gray-900">
            {postsLoading ? '...' : draftPosts}
          </div>
        </div>
      </div>

      {/* Recent Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Brands</h3>
          <div className="space-y-3">
            {brandsLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : brands.slice(0, 5).map((brand) => (
              <div key={brand.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded hover:bg-gray-100">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {brand.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                  <div className="text-xs text-gray-500">{brand.niche || 'No niche set'}</div>
                </div>
              </div>
            ))}
            {!brandsLoading && brands.length === 0 && (
              <div className="text-gray-500 text-sm">No brands yet. Create your first brand!</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                📅
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">New post scheduled</div>
                <div className="text-xs text-gray-500">5 minutes ago</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                ✓
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Post published successfully</div>
                <div className="text-xs text-gray-500">1 hour ago</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                🏢
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">New brand created</div>
                <div className="text-xs text-gray-500">3 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/brands"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-medium text-gray-900">Create New Brand</div>
            <div className="text-sm text-gray-500">Add a new brand profile</div>
          </a>
          
          <a
            href="/admin/content-calendar"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="font-medium text-gray-900">Schedule Post</div>
            <div className="text-sm text-gray-500">Plan your content</div>
          </a>
          
          <a
            href="/admin/analysis"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-gray-900">View Analytics</div>
            <div className="text-sm text-gray-500">Check performance</div>
          </a>
        </div>
      </div>
    </div>
  )
}