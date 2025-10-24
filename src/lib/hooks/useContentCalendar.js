// src/lib/hooks/useContentCalendar.js
'use client'

import { useState, useEffect } from 'react'

export function useContentCalendar(brandId = null) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const url = brandId 
        ? `/api/admin/content-calendar?brand_id=${brandId}`
        : '/api/admin/content-calendar'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setPosts(data.posts)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [brandId])

  const createPost = async (postData) => {
    try {
      const response = await fetch('/api/admin/content-calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        await fetchPosts()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to create post' }
    }
  }

  const updatePost = async (postId, postData) => {
    try {
      const response = await fetch(`/api/admin/content-calendar/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        await fetchPosts()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to update post' }
    }
  }

  const deletePost = async (postId) => {
    try {
      const response = await fetch(`/api/admin/content-calendar/${postId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchPosts()
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to delete post' }
    }
  }

  return { 
    posts, 
    loading, 
    error, 
    createPost, 
    updatePost, 
    deletePost, 
    refetch: fetchPosts 
  }
}