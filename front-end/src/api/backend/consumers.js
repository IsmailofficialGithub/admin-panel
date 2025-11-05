/**
 * Consumer Management API (Backend)
 * These functions call the backend API instead of Supabase directly
 */

import apiClient from '../../services/apiClient';

/**
 * Get all consumers with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.account_status - Account status filter (active, deactive, expired_subscription, all)
 * @param {string} filters.search - Search term for name/email
 * @returns {Promise<Array>} List of consumers
 */
export const getConsumers = async (filters = {}) => {
  try {
    const { account_status, search } = filters;
    const params = new URLSearchParams();
    
    if (account_status && account_status !== 'all') {
      params.append('account_status', account_status);
    }
    
    if (search && search.trim() !== '') {
      params.append('search', search.trim());
    }
    
    const queryString = params.toString();
    const url = queryString ? `/consumers?${queryString}` : '/consumers';
    
    const response = await apiClient.consumers.getAll(queryString ? `?${queryString}` : '');
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
 * @param {string} consumerData.country - Consumer country (required)
 * @param {string} consumerData.city - Consumer city (required)
 * @param {string} consumerData.phone - Consumer phone (optional)
 * @param {string} consumerData.trial_expiry_date - Trial expiry date (optional)
 * @returns {Promise<Object>} Created consumer data
 */
export const createConsumer = async (consumerData) => {
  try {
    // Use the resellers endpoint for creating consumers
    const requestData = {
      email: consumerData.email,
      password: consumerData.password,
      full_name: consumerData.full_name,
      country: consumerData.country,
      city: consumerData.city,
      phone: consumerData.phone || null,
      trial_expiry_date: consumerData.trial_expiry_date || null,
      role: 'consumer'
    };
    
    // Add subscribed_products if provided
    if (consumerData.subscribed_products !== undefined) {
      requestData.subscribed_products = consumerData.subscribed_products || [];
    }
    
    console.log('createConsumer sending data:', requestData);
    
    const response = await apiClient.resellers.createConsumer(requestData);
    
    if (response.success) {
      return {
        success: true,
        user: response.user,
        message: response.message || 'Consumer created successfully'
      };
    }
    
    // Extract error message from response
    const errorMessage = response.message || response.error || 'Failed to create consumer';
    return { success: false, error: errorMessage };
  } catch (error) {
    console.error('createConsumer Error:', error);
    // Extract error message from various possible locations
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create consumer';
    return { success: false, error: errorMessage };
  }
};

/**
 * Update consumer
 * @param {string} consumerId - Consumer ID
 * @param {Object} updateData - Data to update
 * @param {string} updateData.full_name - Full name (optional)
 * @param {string} updateData.country - Country (optional)
 * @param {string} updateData.city - City (optional)
 * @param {string} updateData.phone - Phone number (optional)
 * @param {string} updateData.trial_expiry_date - Trial expiry date (optional)
 * @returns {Promise<Object>} Updated consumer data
 */
export const updateConsumer = async (consumerId, updateData) => {
  try {
    // Clean up the update data - only send fields that are provided
    const cleanedData = {};
    
    if (updateData.full_name !== undefined) cleanedData.full_name = updateData.full_name;
    if (updateData.country !== undefined) cleanedData.country = updateData.country;
    if (updateData.city !== undefined) cleanedData.city = updateData.city;
    if (updateData.phone !== undefined) cleanedData.phone = updateData.phone;
    if (updateData.trial_expiry_date !== undefined) cleanedData.trial_expiry_date = updateData.trial_expiry_date;
    if (updateData.subscribed_products !== undefined) cleanedData.subscribed_products = updateData.subscribed_products;
    
    console.log('updateConsumer sending data:', cleanedData);
    
    const response = await apiClient.consumers.update(consumerId, cleanedData);
    
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

/**
 * Update consumer account status
 * @param {string} consumerId - Consumer ID
 * @param {string} accountStatus - New account status (active, deactive, expired_subscription)
 * @returns {Promise<Object>} Success status
 */
export const updateConsumerAccountStatus = async (consumerId, accountStatus, trialExpiryDate = null) => {
  try {
    const response = await apiClient.consumers.updateAccountStatus(consumerId, accountStatus, trialExpiryDate);
    
    if (response.success) {
      return {
        success: true,
        message: response.message,
        data: response.data
      };
    }
    
    return { error: 'Failed to update account status' };
  } catch (error) {
    console.error('updateConsumerAccountStatus Error:', error);
    return { error: error.message };
  }
};

export default {
  getConsumers,
  getConsumerById,
  createConsumer,
  updateConsumer,
  deleteConsumer,
  resetConsumerPassword,
  updateConsumerAccountStatus
};

