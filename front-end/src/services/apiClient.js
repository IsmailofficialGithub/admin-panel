/**
 * Centralized API Client for Backend Communication
 * All backend API calls should go through this client
 */

import axios from 'axios';
import { supabase } from '../lib/supabase/Production/client';

const API_BASE_URL = process.env.REACT_APP_Server_Url || 'http://localhost:5000/api';
/**
 * Token cache - updated by auth state listener
 */
let cachedToken = null;

/**
 * Try to get token from localStorage synchronously (fast!)
 */
const getTokenFromStorage = () => {
  try {
    // Debug: Log all localStorage keys
    console.log('🔍 Searching localStorage, total keys:', localStorage.length);
    
    // Check all localStorage keys for Supabase auth data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log('🔑 LocalStorage key:', key);
      
      // Look for Supabase auth keys (various formats)
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            console.log('📦 Parsed data from key:', key, parsed);
            
            // Try different token paths in Supabase storage structure
            const token = parsed?.access_token || 
                         parsed?.currentSession?.access_token ||
                         parsed?.[0]?.access_token ||
                         parsed?.session?.access_token;
            
            if (token) {
              console.log('✅ Found token in key:', key);
              return token;
            }
          }
        } catch (e) {
          // Skip invalid JSON
          console.warn('⚠️ Failed to parse key:', key);
        }
      }
    }
    console.log('❌ No token found in localStorage');
  } catch (error) {
    console.warn('⚠️ Error reading token from localStorage:', error);
  }
  return null;
};

// Initialize token from localStorage FIRST (synchronous)
cachedToken = getTokenFromStorage();
console.log('🔐 apiClient: Token from localStorage:', cachedToken ? 'Token found' : 'No token');

/**
 * Then update with fresh session and listen for auth changes
 */
const initializeAuth = async () => {
  try {
    // Get fresh session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    cachedToken = session?.access_token || null;
    console.log('🔐 apiClient: Token updated from session:', cachedToken ? 'Token present' : 'No token');
  } catch (error) {
    console.error('❌ apiClient: Error getting session:', error);
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    cachedToken = session?.access_token || null;
    console.log('🔐 apiClient: Token updated on auth change:', event, cachedToken ? 'Token present' : 'No token');
  });
};

// Initialize async updates
initializeAuth();

/**
 * Create axios instance with default config
 */
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor - Add auth token to all requests
 */
axiosInstance.interceptors.request.use(
  async (config) => {
    console.log('🔄 API Request:', config.method.toUpperCase(), config.url);
    
    // Try to get fresh token
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        cachedToken = session.access_token;
        config.headers.Authorization = `Bearer ${cachedToken}`;
        console.log('✅ Auth token added from session');
      } else if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
        console.log('✅ Auth token added from cache');
      } else {
        console.warn('⚠️ No cached token available');
      }
    } catch (error) {
      console.warn('⚠️ apiClient: Error getting token:', error);
      if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
      }
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally including account deactivation
 */
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.data);
    return response.data;
  },
  async (error) => {
    console.error('❌ API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle 403 Forbidden errors (account deactivated)
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || '';
      
      // Check if account is deactivated
      if (errorMessage.includes('deactivated') || errorMessage.includes('account has been deactivated')) {
        // Sign out and clear storage
        await supabase.auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 200));
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim();
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        });
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        
        throw new Error('Your account has been deactivated. Please contact the administrator.');
      }
    }
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'Request failed';
      console.error('API Error:', message);
      throw new Error(message);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error: No response from server');
      throw new Error('Network error. Please check if backend is running.');
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
      throw new Error(error.message);
    }
  }
);

/**
 * API Client Methods
 */
const apiClient = {
  // ==================== AUTH ====================
  auth: {
    /**
     * Get current user info
     */
    me: () => axiosInstance.get('/auth/me'),

    /**
     * Logout
     */
    logout: () => axiosInstance.post('/auth/logout'),
  },

  // ==================== USERS ====================
  users: {
    /**
     * Get all users with optional search
     */
    getAll: (queryString = '') => axiosInstance.get(`/users${queryString}`),

    /**
     * Get user by ID
     */
    getById: (id) => axiosInstance.get(`/users/${id}`),

    /**
     * Create new user
     */
    create: (userData) => axiosInstance.post('/users', userData),

    /**
     * Update user
     */
    update: (id, userData) => axiosInstance.put(`/users/${id}`, userData),

    /**
     * Delete user
     */
    delete: (id) => axiosInstance.delete(`/users/${id}`),

    /**
     * Reset user password
     */
    resetPassword: (id) => axiosInstance.post(`/users/${id}/reset-password`),

    /**
     * Update user account status
     */
    updateAccountStatus: (id, account_status) => axiosInstance.patch(`/users/${id}/account-status`, { account_status }),
  },

  // ==================== CONSUMERS ====================
  consumers: {
    /**
     * Get all consumers with optional filters
     */
    getAll: (queryString = '') => axiosInstance.get(`/consumers${queryString}`),

    /**
     * Get consumer by ID
     */
    getById: (id) => axiosInstance.get(`/consumers/${id}`),

    /**
     * Create new consumer
     */
    create: (consumerData) => axiosInstance.post('/consumers', consumerData),

    /**
     * Update consumer
     */
    update: (id, consumerData) => axiosInstance.put(`/consumers/${id}`, consumerData),

    /**
     * Delete consumer
     */
    delete: (id) => axiosInstance.delete(`/consumers/${id}`),

    /**
     * Reset consumer password
     */
    resetPassword: (id) => axiosInstance.post(`/consumers/${id}/reset-password`),

    /**
     * Update consumer account status
     */
    updateAccountStatus: (id, account_status, trial_expiry_date = null) => {
      const payload = { account_status };
      if (trial_expiry_date) {
        payload.trial_expiry_date = trial_expiry_date;
      }
      return axiosInstance.patch(`/consumers/${id}/account-status`, payload);
    },
  },

  // ==================== RESELLERS ====================
  resellers: {
    /**
     * Get all resellers with optional search
     */
    getAll: (queryString = '') => axiosInstance.get(`/resellers${queryString}`),

    /**
     * Get reseller by ID
     */
    getById: (id) => axiosInstance.get(`/resellers/${id}`),

    /**
     * Create new reseller
     */
    create: (resellerData) => axiosInstance.post('/resellers', resellerData),

    /**
     * Update reseller
     */
    update: (id, resellerData) => axiosInstance.put(`/resellers/${id}`, resellerData),

    /**
     * Delete reseller
     */
    delete: (id) => axiosInstance.delete(`/resellers/${id}`),

    /**
     * Reset reseller password
     */
    resetPassword: (id) => axiosInstance.post(`/resellers/${id}/reset-password`),

    /**
     * Update reseller account status
     */
    updateAccountStatus: (id, account_status) => axiosInstance.patch(`/resellers/${id}/account-status`, { account_status }),

    /**
     * Get referred consumers by reseller ID
     */
    getReferredConsumers: (id) => axiosInstance.get(`/resellers/${id}/referred-consumers`),

    /**
     * Create new consumer (via reseller endpoint) - Legacy
     */
    createConsumer: (consumerData) => axiosInstance.post('/resellers/create-consumer', consumerData),

    // ========== RESELLER'S OWN CONSUMERS ==========
    
    /**
     * Get all consumers created by the logged-in reseller
     */
    getMyConsumers: () => axiosInstance.get('/resellers/my-consumers'),

    /**
     * Create new consumer (as reseller)
     */
    createMyConsumer: (consumerData) => axiosInstance.post('/resellers/my-consumers', consumerData),

    /**
     * Update consumer (as reseller)
     */
    updateMyConsumer: (id, consumerData) => axiosInstance.put(`/resellers/my-consumers/${id}`, consumerData),

    /**
     * Delete consumer (as reseller)
     */
    deleteMyConsumer: (id) => axiosInstance.delete(`/resellers/my-consumers/${id}`),

    /**
     * Reset consumer password (as reseller)
     */
    resetMyConsumerPassword: (id) => axiosInstance.post(`/resellers/my-consumers/${id}/reset-password`),
  },

  // ==================== PRODUCTS ====================
  products: {
    /**
     * Get all products
     */
    getAll: () => axiosInstance.get('/products'),

    /**
     * Get product by ID
     */
    getById: (id) => axiosInstance.get(`/products/${id}`),

    /**
     * Create new product
     */
    create: (productData) => axiosInstance.post('/products', productData),

    /**
     * Update product
     */
    update: (id, productData) => axiosInstance.put(`/products/${id}`, productData),

    /**
     * Delete product
     */
    delete: (id) => axiosInstance.delete(`/products/${id}`),
  },

  // ==================== INVOICES ====================
  invoices: {
    /**
     * Get all invoices (admin only)
     */
    getAll: (queryString = '') => axiosInstance.get(`/invoices${queryString}`),

    /**
     * Get invoices for reseller (reseller only)
     */
    getMyInvoices: (queryString = '') => axiosInstance.get(`/invoices/my-invoices${queryString}`),

    /**
     * Get consumer's accessed products with prices for invoice creation
     */
    getConsumerProducts: (consumerId) => axiosInstance.get(`/invoices/consumer/${consumerId}/products`),

    /**
     * Get invoices for a specific consumer
     */
    getConsumerInvoices: (consumerId) => axiosInstance.get(`/invoices/consumer/${consumerId}`),

    /**
     * Create invoice with invoice items
     */
    create: (invoiceData) => axiosInstance.post('/invoices', invoiceData),
  },

  // ==================== DASHBOARD ====================
  dashboard: {
    /**
     * Get dashboard statistics (admin only)
     */
    getStats: () => axiosInstance.get('/dashboard/stats'),

    /**
     * Get reseller business statistics (admin only)
     */
    getResellerStats: (queryString = '') => axiosInstance.get(`/dashboard/reseller-stats${queryString}`),
  },

  // ==================== ACTIVITY LOGS ====================
  activityLogs: {
    /**
     * Get all activity logs with optional filters
     */
    getAll: (queryString = '') => axiosInstance.get(`/activity-logs${queryString}`),

    /**
     * Get activity log by ID
     */
    getById: (id) => axiosInstance.get(`/activity-logs/${id}`),
  },

  // ==================== SETTINGS ====================
  settings: {
    /**
     * Get default reseller commission
     */
    getDefaultCommission: () => axiosInstance.get('/settings/default-commission'),

    /**
     * Update default reseller commission
     */
    updateDefaultCommission: (commissionRate) => axiosInstance.put('/settings/default-commission', { commissionRate }),
  },

  // ==================== RESELLER COMMISSION ====================
  resellerCommission: {
    /**
     * Get reseller's own commission (effective commission) - for resellers viewing their own
     */
    getMyCommission: () => axiosInstance.get('/resellers/my-commission'),

    /**
     * Get reseller commission (effective commission) - for admins viewing any reseller
     */
    getCommission: (resellerId) => axiosInstance.get(`/resellers/${resellerId}/commission`),

    /**
     * Set custom commission for reseller
     */
    setCommission: (resellerId, commissionRate) => axiosInstance.put(`/resellers/${resellerId}/commission`, { commissionRate }),

    /**
     * Reset reseller commission to default
     */
    resetCommission: (resellerId) => axiosInstance.delete(`/resellers/${resellerId}/commission`),
  },
};

export default apiClient;
export { axiosInstance };

