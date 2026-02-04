// src/lib/hooks/useBrands.js
'use client'

import { useState, useEffect } from 'react'

export function useBrands() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/brands')
      const data = await response.json()
      
      if (response.ok) {
        setBrands(data.brands)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch brands')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  const createBrand = async (brandData) => {
    try {
      const response = await fetch('/api/admin/brands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        await fetchBrands()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to create brand' }
    }
  }

  const updateBrand = async (brandId, brandData) => {
    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        await fetchBrands()
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to update brand' }
    }
  }

  const deleteBrand = async (brandId) => {
    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        await fetchBrands()
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to delete brand' }
    }
  }

  const getBrandById = async (brandId) => {
  try {
    const response = await fetch(`/api/admin/brands/${brandId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch brand");
    }

    return { success: true, data: data.brand };
  } catch (error) {
    console.error("Error fetching brand:", error);
    return { success: false, error: error.message };
  }
};

  return { 
    brands, 
    loading, 
    error, 
    createBrand, 
    updateBrand, 
    deleteBrand, 
    refetch: fetchBrands ,
    getBrandById
  }
}