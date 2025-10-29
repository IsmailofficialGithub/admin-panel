/**
 * Reseller Management API (Backend)
 * These functions call the backend API instead of Supabase directly
 */

import apiClient from '../../services/apiClient';

/**
 * Get all resellers with optional search
 * @param {Object} filters - Filter options
 * @param {string} filters.search - Search term for name/email
 * @returns {Promise<Array>} List of resellers
 */
export const getResellers = async (filters = {}) => {
  try {
    const { search } = filters;
    const params = new URLSearchParams();
    
    if (search && search.trim() !== '') {
      params.append('search', search.trim());
    }
    
    const queryString = params.toString();
    const response = await apiClient.resellers.getAll(queryString ? `?${queryString}` : '');
    // Backend returns { success: true, count: X, data: [...] }
    // Extract the resellers array from response.data
    return response.data || [];
  } catch (error) {
    console.error('getResellers Error:', error);
    return { error: error.message };
  }
};

/**
 * Get reseller by ID
 * @param {string} resellerId - Reseller ID
 * @returns {Promise<Object>} Reseller data
 */
export const getResellerById = async (resellerId) => {
  try {
    const response = await apiClient.resellers.getById(resellerId);
    return response;
  } catch (error) {
    console.error('getResellerById Error:', error);
    return { error: error.message };
  }
};

/**
 * Create new reseller
 * @param {Object} resellerData - Reseller data
 * @param {string} resellerData.email - Reseller email
 * @param {string} resellerData.password - Reseller password
 * @param {string} resellerData.full_name - Reseller full name
 * @param {string} resellerData.country - Reseller country (optional)
 * @param {string} resellerData.city - Reseller city (optional)
 * @param {string} resellerData.phone - Reseller phone (optional)
 * @returns {Promise<Object>} Created reseller data
 */
export const createReseller = async (resellerData) => {
  try {
    const response = await apiClient.resellers.create({
      email: resellerData.email,
      password: resellerData.password,
      full_name: resellerData.full_name,
      country: resellerData.country || null,
      city: resellerData.city || null,
      phone: resellerData.phone || null,
      role: 'reseller'
    });
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message || 'Reseller created successfully'
      };
    }
    
    return { error: 'Failed to create reseller' };
  } catch (error) {
    console.error('createReseller Error:', error);
    return { error: error.message };
  }
};

/**
 * Update reseller
 * @param {string} resellerId - Reseller ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.full_name - Full name (optional)
 * @param {string} updateData.country - Country (optional)
 * @param {string} updateData.city - City (optional)
 * @param {string} updateData.phone - Phone number (optional)
 * @returns {Promise<Object>} Updated reseller data
 */
export const updateReseller = async (resellerId, updateData) => {
  try {
    // Clean up the update data - only send fields that are provided
    const cleanedData = {};
    
    if (updateData.full_name !== undefined) cleanedData.full_name = updateData.full_name;
    if (updateData.country !== undefined) cleanedData.country = updateData.country;
    if (updateData.city !== undefined) cleanedData.city = updateData.city;
    if (updateData.phone !== undefined) cleanedData.phone = updateData.phone;
    
    const response = await apiClient.resellers.update(resellerId, cleanedData);
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message
      };
    }
    
    return { error: 'Failed to update reseller' };
  } catch (error) {
    console.error('updateReseller Error:', error);
    return { error: error.message };
  }
};

/**
 * Delete reseller
 * @param {string} resellerId - Reseller ID
 * @returns {Promise<Object>} Success status
 */
export const deleteReseller = async (resellerId) => {
  try {
    const response = await apiClient.resellers.delete(resellerId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to delete reseller' };
  } catch (error) {
    console.error('deleteReseller Error:', error);
    return { error: error.message };
  }
};

/**
 * Reset reseller password
 * @param {string} resellerId - Reseller ID
 * @returns {Promise<Object>} Success status
 */
export const resetResellerPassword = async (resellerId) => {
  try {
    const response = await apiClient.resellers.resetPassword(resellerId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to reset password' };
  } catch (error) {
    console.error('resetResellerPassword Error:', error);
    return { error: error.message };
  }
};

export default {
  getResellers,
  getResellerById,
  createReseller,
  updateReseller,
  deleteReseller,
  resetResellerPassword
};

