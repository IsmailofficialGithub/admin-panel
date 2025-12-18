import { createClient } from '../../lib/supabase/Production/client';

const API_URL = process.env.REACT_APP_Server_Url || 'http://localhost:5000/api';

/**
 * Get all packages
 * @param {Object} params - Query parameters (page, limit, productId)
 * @returns {Promise<Object>} Packages data
 */
export const getAllPackages = async (params = {}) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/packages?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to fetch packages' };
    }

    return { success: true, data: data.data || [] };
  } catch (error) {
    console.error('Get packages error:', error);
    return { error: 'Failed to fetch packages' };
  }
};

/**
 * Get packages by product ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Packages data
 */
export const getPackagesByProduct = async (productId) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/packages/product/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to fetch packages' };
    }

    return { success: true, data: data.data || [] };
  } catch (error) {
    console.error('Get packages by product error:', error);
    return { error: 'Failed to fetch packages' };
  }
};

/**
 * Get package by ID
 * @param {string} id - Package ID
 * @returns {Promise<Object>} Package data
 */
export const getPackageById = async (id) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/packages/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to fetch package' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Get package error:', error);
    return { error: 'Failed to fetch package' };
  }
};

/**
 * Create new package
 * @param {Object} packageData - Package data
 * @returns {Promise<Object>} Created package data
 */
export const createPackage = async (packageData) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/packages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(packageData)
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to create package' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Create package error:', error);
    return { error: 'Failed to create package' };
  }
};

/**
 * Update package
 * @param {string} id - Package ID
 * @param {Object} packageData - Package data
 * @returns {Promise<Object>} Updated package data
 */
export const updatePackage = async (id, packageData) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/packages/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(packageData)
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to update package' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Update package error:', error);
    return { error: 'Failed to update package' };
  }
};

/**
 * Delete package
 * @param {string} id - Package ID
 * @returns {Promise<Object>} Deletion result
 */
export const deletePackage = async (id) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/packages/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to delete package' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete package error:', error);
    return { error: 'Failed to delete package' };
  }
};

