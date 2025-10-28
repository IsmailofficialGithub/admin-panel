/**
 * Consumer Management API (Backend)
 * These functions call the backend API instead of Supabase directly
 */

import apiClient from '../../services/apiClient';

/**
 * Get all consumers
 * @returns {Promise<Array>} List of consumers
 */
export const getConsumers = async () => {
  try {
    const response = await apiClient.consumers.getAll();
    // Backend returns { success: true, count: X, data: [...] }
    // Extract the consumers array from response.data
    return response.data || [];
  } catch (error) {
    console.error('getConsumers Error:', error);
    return { error: error.message };
  }
};

/**
 * Get consumer by ID
 * @param {string} consumerId - Consumer ID
 * @returns {Promise<Object>} Consumer data
 */
export const getConsumerById = async (consumerId) => {
  try {
    const response = await apiClient.consumers.getById(consumerId);
    return response;
  } catch (error) {
    console.error('getConsumerById Error:', error);
    return { error: error.message };
  }
};

/**
 * Create new consumer
 * @param {Object} consumerData - Consumer data
 * @param {string} consumerData.email - Consumer email
 * @param {string} consumerData.password - Consumer password
 * @param {string} consumerData.full_name - Consumer full name
 * @param {string} consumerData.phone - Consumer phone (optional)
 * @param {string} consumerData.trial_expiry_date - Trial expiry date (optional)
 * @returns {Promise<Object>} Created consumer data
 */
export const createConsumer = async (consumerData) => {
  try {
    // Use the resalers endpoint for creating consumers
    const response = await apiClient.resalers.createConsumer({
      email: consumerData.email,
      password: consumerData.password,
      full_name: consumerData.full_name,
      phone: consumerData.phone || null,
      trial_expiry_date: consumerData.trial_expiry_date || null,
      role: 'consumer'
    });
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message || 'Consumer created successfully'
      };
    }
    
    return { error: 'Failed to create consumer' };
  } catch (error) {
    console.error('createConsumer Error:', error);
    return { error: error.message };
  }
};

/**
 * Update consumer
 * @param {string} consumerId - Consumer ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.full_name - Full name
 * @param {string} updateData.phone - Phone number
 * @returns {Promise<Object>} Updated consumer data
 */
export const updateConsumer = async (consumerId, updateData) => {
  try {
    const response = await apiClient.consumers.update(consumerId, updateData);
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message
      };
    }
    
    return { error: 'Failed to update consumer' };
  } catch (error) {
    console.error('updateConsumer Error:', error);
    return { error: error.message };
  }
};

/**
 * Delete consumer
 * @param {string} consumerId - Consumer ID
 * @returns {Promise<Object>} Success status
 */
export const deleteConsumer = async (consumerId) => {
  try {
    const response = await apiClient.consumers.delete(consumerId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to delete consumer' };
  } catch (error) {
    console.error('deleteConsumer Error:', error);
    return { error: error.message };
  }
};

/**
 * Reset consumer password
 * @param {string} consumerId - Consumer ID
 * @returns {Promise<Object>} Success status
 */
export const resetConsumerPassword = async (consumerId) => {
  try {
    const response = await apiClient.consumers.resetPassword(consumerId);
    
    if (response.success) {
      return {
        success: true,
        message: response.message
      };
    }
    
    return { error: 'Failed to reset password' };
  } catch (error) {
    console.error('resetConsumerPassword Error:', error);
    return { error: error.message };
  }
};

export default {
  getConsumers,
  getConsumerById,
  createConsumer,
  updateConsumer,
  deleteConsumer,
  resetConsumerPassword
};

