import apiClient from '../../services/apiClient';

/**
 * Settings API functions
 */

/**
 * Get default reseller commission
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getDefaultCommission = async () => {
  try {
    const response = await apiClient.settings.getDefaultCommission();
    console.log('📥 Raw axios response from getDefaultCommission:', response);
    console.log('📥 Response.data:', response.data);
    console.log('📥 Response.data.data:', response.data?.data);
    
    // axios response structure: response.data = { success: true, data: { commissionRate: 11, ... } }
    // So response.data is already the backend response
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching default commission:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error response data:', error.response?.data);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch default commission'
    };
  }
};

/**
 * Update default reseller commission
 * @param {number} commissionRate - Commission rate (0-100)
 * @returns {Promise<{success: boolean, message?: string, data?: object, error?: string}>}
 */
export const updateDefaultCommission = async (commissionRate) => {
  try {
    const response = await apiClient.settings.updateDefaultCommission(commissionRate);
    console.log('📥 Raw response from updateDefaultCommission:', response);
    console.log('📥 Response data:', response.data);
    
    // Response.data should already contain { success, message, data }
    // But axios wraps it, so we need to extract it correctly
    if (response && response.data) {
      return response.data;
    }
    
    // If response structure is different, return it as is
    return response;
  } catch (error) {
    console.error('❌ Error updating default commission:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error response data:', error.response?.data);
    
    // Check if error response actually contains success
    if (error.response && error.response.data && error.response.data.success) {
      // Sometimes axios treats success responses as errors due to status codes
      return error.response.data;
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update default commission'
    };
  }
};

/**
 * Get reseller commission (effective commission)
 * @param {string} resellerId - Reseller user ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getResellerCommission = async (resellerId) => {
  try {
    const response = await apiClient.resellerCommission.getCommission(resellerId);
    console.log('📥 Raw axios response from getResellerCommission:', response);
    console.log('📥 Response.data:', response.data);
    
    // axios response structure: response.data = { success: true, data: { commissionRate: 11, ... } }
    if (response && response.data) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('❌ Error fetching reseller commission:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error response data:', error.response?.data);
    
    // Check if error response actually contains success
    if (error.response && error.response.data && error.response.data.success) {
      return error.response.data;
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch reseller commission'
    };
  }
};

/**
 * Set custom commission for a reseller
 * @param {string} resellerId - Reseller user ID
 * @param {number} commissionRate - Commission rate (0-100)
 * @returns {Promise<{success: boolean, message?: string, data?: object, error?: string}>}
 */
export const setResellerCommission = async (resellerId, commissionRate) => {
  try {
    const response = await apiClient.resellerCommission.setCommission(resellerId, commissionRate);
    console.log('📥 Raw axios response from setResellerCommission:', response);
    console.log('📥 Response.data:', response.data);
    
    // axios response structure: response.data = { success: true, message: '...', data: {...} }
    if (response && response.data) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('❌ Error setting reseller commission:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error response data:', error.response?.data);
    
    // Check if error response actually contains success
    if (error.response && error.response.data && error.response.data.success) {
      return error.response.data;
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to set reseller commission'
    };
  }
};

/**
 * Get reseller's own commission (for resellers viewing their own profile)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getMyCommission = async () => {
  try {
    const response = await apiClient.resellerCommission.getMyCommission();
    console.log('📥 Raw axios response from getMyCommission:', response);
    console.log('📥 Response.data:', response.data);
    
    if (response && response.data) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('❌ Error fetching my commission:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error response data:', error.response?.data);
    
    if (error.response && error.response.data && error.response.data.success) {
      return error.response.data;
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch my commission'
    };
  }
};

/**
 * Reset reseller commission to default
 * @param {string} resellerId - Reseller user ID
 * @returns {Promise<{success: boolean, message?: string, data?: object, error?: string}>}
 */
export const resetResellerCommission = async (resellerId) => {
  try {
    const response = await apiClient.resellerCommission.resetCommission(resellerId);
    console.log('📥 Raw axios response from resetResellerCommission:', response);
    console.log('📥 Response.data:', response.data);
    
    // axios response structure: response.data = { success: true, message: '...', data: {...} }
    if (response && response.data) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('❌ Error resetting reseller commission:', error);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error response data:', error.response?.data);
    
    // Check if error response actually contains success
    if (error.response && error.response.data && error.response.data.success) {
      return error.response.data;
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to reset reseller commission'
    };
  }
};

