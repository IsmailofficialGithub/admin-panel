/**
 * User Management API (Backend)
 * These functions call the backend API instead of Supabase directly
 */

import apiClient from '../../services/apiClient';

/**
 * Get all admin users
 * @returns {Promise<Array>} List of users
 */
export const getAdminUsers = async () => {
  try {
    const response = await apiClient.users.getAll();
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
 * @returns {Promise<Object>} Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await apiClient.users.create(userData);
    
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
 * Update user role and optionally full name
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @param {string} fullName - New full name (optional)
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserRole = async (userId, role, fullName = null) => {
  try {
    const updateData = { role };
    if (fullName) {
      updateData.full_name = fullName;
    }

    const response = await apiClient.users.update(userId, updateData);
    
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

