import apiClient from '../../services/apiClient';

/**
 * Dashboard API functions
 */

/**
 * Get dashboard statistics (admin only)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.dashboard.getStats();
    console.log('📊 Dashboard API Response:', response);
    
    // Axios response structure: response.data contains the server response
    // Server response: { success: true, data: {...} }
    const apiResponse = response.data;
    
    // If the response already has success and data, return it as is
    if (apiResponse && apiResponse.success !== undefined && apiResponse.data) {
      return apiResponse;
    }
    
    // If response.data is the data directly (without wrapper)
    if (apiResponse && !apiResponse.success && !apiResponse.error) {
      return {
        success: true,
        data: apiResponse
      };
    }
    
    return apiResponse;
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch dashboard stats'
    };
  }
};

