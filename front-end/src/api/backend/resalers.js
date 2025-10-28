/**
 * Resaler Management API (Backend)
 * These functions call the backend API instead of Supabase directly
 */

import apiClient from '../../services/apiClient';

/**
 * Get all resalers
 * @returns {Promise<Array>} List of resalers
 */
export const getResalers = async () => {
  try {
    const response = await apiClient.resalers.getAll();
    // Backend returns { success: true, count: X, data: [...] }
    // Extract the resalers array from response.data
    return response.data || [];
  } catch (error) {
    console.error('getResalers Error:', error);
    return { error: error.message };
  }
};

/**
 * Get resaler by ID
 * @param {string} resalerId - Resaler ID
 * @returns {Promise<Object>} Resaler data
 */
export const getResalerById = async (resalerId) => {
  try {
    const response = await apiClient.resalers.getById(resalerId);
    return response;
  } catch (error) {
    console.error('getResalerById Error:', error);
    return { error: error.message };
  }
};

/**
 * Create new resaler
 * @param {Object} resalerData - Resaler data
 * @param {string} resalerData.email - Resaler email
 * @param {string} resalerData.password - Resaler password
 * @param {string} resalerData.full_name - Resaler full name
 * @param {string} resalerData.phone - Resaler phone (optional)
 * @returns {Promise<Object>} Created resaler data
 */
export const createResaler = async (resalerData) => {
  try {
    const response = await apiClient.resalers.create({
      email: resalerData.email,
      password: resalerData.password,
      full_name: resalerData.full_name,
      phone: resalerData.phone || null,
      role: 'resaler'
    });
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message || 'Resaler created successfully'
      };
    }
    
    return { error: 'Failed to create resaler' };
  } catch (error) {
    console.error('createResaler Error:', error);
    return { error: error.message };
  }
};

/**
 * Update resaler
 * @param {string} resalerId - Resaler ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.full_name - Full name
 * @param {string} updateData.phone - Phone number
 * @returns {Promise<Object>} Updated resaler data
 */
export const updateResaler = async (resalerId, updateData) => {
  try {
    const response = await apiClient.resalers.update(resalerId, updateData);
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message
      };
    }
    
    return { error: 'Failed to update resaler' };
  } catch (error) {
    console.error('updateResaler Error:', error);
    return { error: error.message };
  }
};

/**
 * Delete resaler
 * @param {string} resalerId - Resaler ID
 * @returns {Promise<Object>} Success status
 */
export const deleteResaler = async (resalerId) => {
  try {
    const response = await apiClient.resalers.delete(resalerId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to delete resaler' };
  } catch (error) {
    console.error('deleteResaler Error:', error);
    return { error: error.message };
  }
};

/**
 * Reset resaler password
 * @param {string} resalerId - Resaler ID
 * @returns {Promise<Object>} Success status
 */
export const resetResalerPassword = async (resalerId) => {
  try {
    const response = await apiClient.resalers.resetPassword(resalerId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to reset password' };
  } catch (error) {
    console.error('resetResalerPassword Error:', error);
    return { error: error.message };
  }
};

export default {
  getResalers,
  getResalerById,
  createResaler,
  updateResaler,
  deleteResaler,
  resetResalerPassword
};

