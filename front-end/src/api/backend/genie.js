/**
 * Genie API - Backend API client for Genie calls management
 */

import apiClient from '../../services/apiClient';

// =====================================================
// CALLS API
// =====================================================

/**
 * Get all calls with filters and pagination
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Paginated calls list
 */
export const getAllCalls = async (params = {}) => {
  try {
    const response = await apiClient.genie.getAllCalls(params);
    return response;
  } catch (error) {
    console.error('getAllCalls Error:', error);
    return { error: error.message };
  }
};

/**
 * Get call by ID
 * @param {string} id - Call ID
 * @returns {Promise<Object>} Call details
 */
export const getCallById = async (id) => {
  try {
    const response = await apiClient.genie.getCallById(id);
    return response;
  } catch (error) {
    console.error('getCallById Error:', error);
    return { error: error.message };
  }
};

/**
 * Get call statistics
 * @param {string} period - Period (today, week, month)
 * @returns {Promise<Object>} Call stats
 */
export const getCallStats = async (period = 'today') => {
  try {
    const response = await apiClient.genie.getCallStats(period);
    return response;
  } catch (error) {
    console.error('getCallStats Error:', error);
    return { error: error.message };
  }
};

/**
 * Update call lead status
 * @param {string} id - Call ID
 * @param {boolean} isLead - Lead status
 * @returns {Promise<Object>} Updated call
 */
export const updateCallLeadStatus = async (id, isLead) => {
  try {
    const response = await apiClient.genie.updateCallLeadStatus(id, isLead);
    return response;
  } catch (error) {
    console.error('updateCallLeadStatus Error:', error);
    return { error: error.message };
  }
};

// =====================================================
// CAMPAIGNS API
// =====================================================

/**
 * Get all campaigns with filters
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Paginated campaigns list
 */
export const getAllCampaigns = async (params = {}) => {
  try {
    const response = await apiClient.genie.getAllCampaigns(params);
    return response;
  } catch (error) {
    console.error('getAllCampaigns Error:', error);
    return { error: error.message };
  }
};

/**
 * Get campaign by ID
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Campaign details with calls
 */
export const getCampaignById = async (id) => {
  try {
    const response = await apiClient.genie.getCampaignById(id);
    return response;
  } catch (error) {
    console.error('getCampaignById Error:', error);
    return { error: error.message };
  }
};

/**
 * Create new campaign
 * @param {Object} data - Campaign data
 * @returns {Promise<Object>} Created campaign
 */
export const createCampaign = async (data) => {
  try {
    const response = await apiClient.genie.createCampaign(data);
    return response;
  } catch (error) {
    console.error('createCampaign Error:', error);
    return { error: error.message };
  }
};

/**
 * Update campaign
 * @param {string} id - Campaign ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated campaign
 */
export const updateCampaign = async (id, data) => {
  try {
    const response = await apiClient.genie.updateCampaign(id, data);
    return response;
  } catch (error) {
    console.error('updateCampaign Error:', error);
    return { error: error.message };
  }
};

/**
 * Cancel campaign
 * @param {string} id - Campaign ID
 * @returns {Promise<Object>} Result
 */
export const cancelCampaign = async (id) => {
  try {
    const response = await apiClient.genie.cancelCampaign(id);
    return response;
  } catch (error) {
    console.error('cancelCampaign Error:', error);
    return { error: error.message };
  }
};

// =====================================================
// LEADS API
// =====================================================

/**
 * Get all leads with filters
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Paginated leads list
 */
export const getAllLeads = async (params = {}) => {
  try {
    const response = await apiClient.genie.getAllLeads(params);
    return response;
  } catch (error) {
    console.error('getAllLeads Error:', error);
    return { error: error.message };
  }
};

/**
 * Get lead by ID
 * @param {string} id - Lead ID
 * @returns {Promise<Object>} Lead details
 */
export const getLeadById = async (id) => {
  try {
    const response = await apiClient.genie.getLeadById(id);
    return response;
  } catch (error) {
    console.error('getLeadById Error:', error);
    return { error: error.message };
  }
};

/**
 * Update lead
 * @param {string} id - Lead ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated lead
 */
export const updateLead = async (id, data) => {
  try {
    const response = await apiClient.genie.updateLead(id, data);
    return response;
  } catch (error) {
    console.error('updateLead Error:', error);
    return { error: error.message };
  }
};

/**
 * Delete lead
 * @param {string} id - Lead ID
 * @returns {Promise<Object>} Result
 */
export const deleteLead = async (id) => {
  try {
    const response = await apiClient.genie.deleteLead(id);
    return response;
  } catch (error) {
    console.error('deleteLead Error:', error);
    return { error: error.message };
  }
};

/**
 * Export leads to CSV
 * @param {Object} params - Filter parameters
 * @returns {Promise<Blob>} CSV file blob
 */
export const exportLeads = async (params = {}) => {
  try {
    const response = await apiClient.genie.exportLeads(params);
    return response;
  } catch (error) {
    console.error('exportLeads Error:', error);
    return { error: error.message };
  }
};

// =====================================================
// ANALYTICS API
// =====================================================

/**
 * Get call analytics data
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Analytics data
 */
export const getCallAnalytics = async (params = {}) => {
  try {
    const response = await apiClient.genie.getCallAnalytics(params);
    return response;
  } catch (error) {
    console.error('getCallAnalytics Error:', error);
    return { error: error.message };
  }
};

/**
 * Get conversion metrics
 * @param {string} period - Period (week, month, quarter)
 * @returns {Promise<Object>} Conversion metrics
 */
export const getConversionMetrics = async (period = 'month') => {
  try {
    const response = await apiClient.genie.getConversionMetrics(period);
    return response;
  } catch (error) {
    console.error('getConversionMetrics Error:', error);
    return { error: error.message };
  }
};

/**
 * Get bot performance metrics
 * @param {string} period - Period (week, month)
 * @returns {Promise<Object>} Bot performance data
 */
export const getBotPerformance = async (period = 'month') => {
  try {
    const response = await apiClient.genie.getBotPerformance(period);
    return response;
  } catch (error) {
    console.error('getBotPerformance Error:', error);
    return { error: error.message };
  }
};

// =====================================================
// SUPPORTING API
// =====================================================

/**
 * Get all bots
 * @returns {Promise<Object>} Bots list
 */
export const getAllBots = async () => {
  try {
    const response = await apiClient.genie.getAllBots();
    return response;
  } catch (error) {
    console.error('getAllBots Error:', error);
    return { error: error.message };
  }
};

/**
 * Get all contact lists
 * @returns {Promise<Object>} Contact lists
 */
export const getAllContactLists = async () => {
  try {
    const response = await apiClient.genie.getAllContactLists();
    return response;
  } catch (error) {
    console.error('getAllContactLists Error:', error);
    return { error: error.message };
  }
};

export default {
  // Calls
  getAllCalls,
  getCallById,
  getCallStats,
  updateCallLeadStatus,
  // Campaigns
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  cancelCampaign,
  // Leads
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  exportLeads,
  // Analytics
  getCallAnalytics,
  getConversionMetrics,
  getBotPerformance,
  // Supporting
  getAllBots,
  getAllContactLists,
};

