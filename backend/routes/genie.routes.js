import express from 'express';
import { authenticate, loadUserProfile } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import {
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
  // Middleware
  rateLimitMiddleware,
  sanitizeInputMiddleware
} from './controllers/genie.controller.js';

const router = express.Router();

// =====================================================
// CALLS ROUTES
// =====================================================

/**
 * @route   GET /api/genie/calls/stats
 * @desc    Get call statistics
 * @access  Private (genie.view)
 * NOTE: Must be before /calls/:id to avoid route conflict
 */
router.get(
  '/calls/stats',
  authenticate,
  loadUserProfile,
  requirePermission('genie.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getCallStats
);

/**
 * @route   GET /api/genie/calls
 * @desc    Get all calls with filters and pagination
 * @access  Private (genie.calls.view)
 */
router.get(
  '/calls',
  authenticate,
  loadUserProfile,
  requirePermission('genie.calls.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllCalls
);

/**
 * @route   GET /api/genie/calls/:id
 * @desc    Get call by ID
 * @access  Private (genie.calls.read)
 */
router.get(
  '/calls/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.calls.read'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getCallById
);

/**
 * @route   PATCH /api/genie/calls/:id/lead
 * @desc    Update call lead status
 * @access  Private (genie.calls.update)
 */
router.patch(
  '/calls/:id/lead',
  authenticate,
  loadUserProfile,
  requirePermission('genie.calls.update'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  updateCallLeadStatus
);

// =====================================================
// CAMPAIGNS ROUTES
// =====================================================

/**
 * @route   GET /api/genie/campaigns
 * @desc    Get all campaigns
 * @access  Private (genie.campaigns.view)
 */
router.get(
  '/campaigns',
  authenticate,
  loadUserProfile,
  requirePermission('genie.campaigns.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllCampaigns
);

/**
 * @route   GET /api/genie/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private (genie.campaigns.read)
 */
router.get(
  '/campaigns/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.campaigns.read'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getCampaignById
);

/**
 * @route   POST /api/genie/campaigns
 * @desc    Create new campaign
 * @access  Private (genie.campaigns.create)
 */
router.post(
  '/campaigns',
  authenticate,
  loadUserProfile,
  requirePermission('genie.campaigns.create'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  createCampaign
);

/**
 * @route   PATCH /api/genie/campaigns/:id
 * @desc    Update campaign
 * @access  Private (genie.campaigns.update)
 */
router.patch(
  '/campaigns/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.campaigns.update'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  updateCampaign
);

/**
 * @route   DELETE /api/genie/campaigns/:id
 * @desc    Cancel/delete campaign
 * @access  Private (genie.campaigns.delete)
 */
router.delete(
  '/campaigns/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.campaigns.delete'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  cancelCampaign
);

// =====================================================
// LEADS ROUTES
// =====================================================

/**
 * @route   GET /api/genie/leads/export
 * @desc    Export leads to CSV
 * @access  Private (genie.leads.export)
 * NOTE: Must be before /leads/:id to avoid route conflict
 */
router.get(
  '/leads/export',
  authenticate,
  loadUserProfile,
  requirePermission('genie.leads.export'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  exportLeads
);

/**
 * @route   GET /api/genie/leads
 * @desc    Get all leads
 * @access  Private (genie.leads.view)
 */
router.get(
  '/leads',
  authenticate,
  loadUserProfile,
  requirePermission('genie.leads.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllLeads
);

/**
 * @route   GET /api/genie/leads/:id
 * @desc    Get lead by ID
 * @access  Private (genie.leads.read)
 */
router.get(
  '/leads/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.leads.read'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getLeadById
);

/**
 * @route   PATCH /api/genie/leads/:id
 * @desc    Update lead
 * @access  Private (genie.leads.update)
 */
router.patch(
  '/leads/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.leads.update'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  updateLead
);

/**
 * @route   DELETE /api/genie/leads/:id
 * @desc    Delete lead
 * @access  Private (genie.leads.delete)
 */
router.delete(
  '/leads/:id',
  authenticate,
  loadUserProfile,
  requirePermission('genie.leads.delete'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  deleteLead
);

// =====================================================
// ANALYTICS ROUTES
// =====================================================

/**
 * @route   GET /api/genie/analytics/calls
 * @desc    Get call analytics data
 * @access  Private (genie.analytics.view)
 */
router.get(
  '/analytics/calls',
  authenticate,
  loadUserProfile,
  requirePermission('genie.analytics.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getCallAnalytics
);

/**
 * @route   GET /api/genie/analytics/conversion
 * @desc    Get conversion metrics
 * @access  Private (genie.analytics.view)
 */
router.get(
  '/analytics/conversion',
  authenticate,
  loadUserProfile,
  requirePermission('genie.analytics.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getConversionMetrics
);

/**
 * @route   GET /api/genie/analytics/bots
 * @desc    Get bot performance metrics
 * @access  Private (genie.analytics.view)
 */
router.get(
  '/analytics/bots',
  authenticate,
  loadUserProfile,
  requirePermission('genie.analytics.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getBotPerformance
);

// =====================================================
// SUPPORTING ROUTES
// =====================================================

/**
 * @route   GET /api/genie/bots
 * @desc    Get all bots
 * @access  Private (genie.view)
 */
router.get(
  '/bots',
  authenticate,
  loadUserProfile,
  requirePermission('genie.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllBots
);

/**
 * @route   GET /api/genie/contact-lists
 * @desc    Get all contact lists
 * @access  Private (genie.view)
 */
router.get(
  '/contact-lists',
  authenticate,
  loadUserProfile,
  requirePermission('genie.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllContactLists
);

export default router;

