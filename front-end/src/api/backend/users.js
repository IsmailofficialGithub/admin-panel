/**
 * User Management API (Backend)
 * These functions call the backend API instead of Supabase directly
 */

import apiClient from '../../services/apiClient';

/**
 * Get all admin users with optional search
 * @param {Object} filters - Filter options
 * @param {string} filters.search - Search term for name/email
 * @returns {Promise<Array>} List of users
 */
export const getAdminUsers = async (filters = {}) => {
  try {
    const { search } = filters;
    const params = new URLSearchParams();
    
    if (search && search.trim() !== '') {
      params.append('search', search.trim());
    }
    
    const queryString = params.toString();
    const response = await apiClient.users.getAll(queryString ? `?${queryString}` : '');
    // Backend returns { success: true, count: X, data: [...] }
    // Extract the users array from response.data
    return response.data || [];
  } catch (error) {
    console.error('getAdminUsers Error:', error);
    return { error: error.message };
  }
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export const getUserById = async (userId) => {
  try {
    const response = await apiClient.users.getById(userId);
    return response;
  } catch (error) {
    console.error('getUserById Error:', error);
    return { error: error.message };
  }
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.full_name - User full name
 * @param {string} userData.role - User role (admin, user, viewer, consumer)
 * @param {string} userData.country - User country (optional)
 * @param {string} userData.city - User city (optional)
 * @param {string} userData.phone - User phone (optional)
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.users.create({
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
      role: userData.role,
      country: userData.country || null,
      city: userData.city || null,
      phone: userData.phone || null
    });
    
    if (response.success) {
      return {
        success: true,
        user: response.user, // Fixed: response.user instead of response.data.user
        message: response.message
      };
    }
    
    return { error: 'Failed to create user' };
  } catch (error) {
    console.error('createUser Error:', error);
    return { error: error.message };
  }
};

/**
 * Update user - supports role, full name, country, city, and phone
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.role - New role (optional)
 * @param {string} updateData.full_name - New full name (optional)
 * @param {string} updateData.country - New country (optional)
 * @param {string} updateData.city - New city (optional)
 * @param {string} updateData.phone - New phone (optional)
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserRole = async (userId, updateData) => {
  try {
    // Clean up the update data - only send fields that are provided
    const cleanedData = {};
    
    if (updateData.role !== undefined) cleanedData.role = updateData.role;
    if (updateData.full_name !== undefined) cleanedData.full_name = updateData.full_name;
    if (updateData.country !== undefined) cleanedData.country = updateData.country;
    if (updateData.city !== undefined) cleanedData.city = updateData.city;
    if (updateData.phone !== undefined) cleanedData.phone = updateData.phone;

    const response = await apiClient.users.update(userId, cleanedData);
    
    if (response.success) {
      return {
        success: true,
        user: response.data, // This is correct - update returns data directly
        message: response.message
      };
    }
    
    return { error: 'Failed to update user' };
  } catch (error) {
    console.error('updateUserRole Error:', error);
    return { error: error.message };
  }
};

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success status
 */
export const deleteUser = async (userId) => {
  try {
    const response = await apiClient.users.delete(userId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to delete user' };
  } catch (error) {
    console.error('deleteUser Error:', error);
    return { error: error.message };
  }
};

/**
 * Reset user password
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Success status with email
 */
export const resetUserPassword = async (userId) => {
  try {
    const response = await apiClient.users.resetPassword(userId);
    
    if (response.success) {
      return {
        success: true,
        email: response.email,
        message: response.message
      };
    }
    
    return { error: 'Failed to reset password' };
  } catch (error) {
    console.error('resetUserPassword Error:', error);
    return { error: error.message };
  }
};

export default {
  getAdminUsers,
  getUserById,
  createUser,
  updateUserRole,
  deleteUser,
  resetUserPassword
};

