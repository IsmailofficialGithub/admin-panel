import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/permissions.js';
import {
  getAllConsumers,
  getConsumerById,
  updateConsumer,
  deleteConsumer,
  resetConsumerPassword,
  updateConsumerAccountStatus,
  grantLifetimeAccess,
  revokeLifetimeAccess,
  rateLimitMiddleware,
  sanitizeInputMiddleware
} from './controllers/consumers.controller.js';

const router = express.Router();

/**
 * @route   GET /api/consumers
 * @desc    Get all consumers (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getAllConsumers);

/**
 * @route   GET /api/consumers/:id
 * @desc    Get consumer by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getConsumerById);

/**
 * @route   PUT /api/consumers/:id
 * @desc    Update consumer (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, updateConsumer);

/**
 * @route   DELETE /api/consumers/:id
 * @desc    Delete consumer (admin only, requires consumers.delete permission)
 * @access  Private (Admin with consumers.delete permission)
 */
router.delete('/:id', authenticate, requireAdmin, requirePermission('consumers.delete'), rateLimitMiddleware, sanitizeInputMiddleware, deleteConsumer);

/**
 * @route   POST /api/consumers/:id/reset-password
 * @desc    Reset consumer password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, resetConsumerPassword);

/**
 * @route   PATCH /api/consumers/:id/account-status
 * @desc    Update consumer account status (admin only)
 * @access  Private (Admin with consumers.update permission)
 */
router.patch('/:id/account-status', authenticate, requireAdmin, requirePermission('consumers.update'), rateLimitMiddleware, sanitizeInputMiddleware, updateConsumerAccountStatus);

/**
 * @route   POST /api/consumers/:id/grant-lifetime-access
 * @desc    Grant lifetime access to consumer (admin only, requires consumers.grant_lifetime_access permission)
 * @access  Private (Admin with consumers.grant_lifetime_access or consumers.manage_lifetime_access permission)
 */
router.post('/:id/grant-lifetime-access', authenticate, requireAdmin, requireAnyPermission(['consumers.grant_lifetime_access', 'consumers.manage_lifetime_access']), rateLimitMiddleware, sanitizeInputMiddleware, grantLifetimeAccess);

/**
 * @route   POST /api/consumers/:id/revoke-lifetime-access
 * @desc    Revoke lifetime access from consumer (admin only, requires consumers.revoke_lifetime_access permission)
 * @access  Private (Admin with consumers.revoke_lifetime_access or consumers.manage_lifetime_access permission)
 */
router.post('/:id/revoke-lifetime-access', authenticate, requireAdmin, requireAnyPermission(['consumers.revoke_lifetime_access', 'consumers.manage_lifetime_access']), rateLimitMiddleware, sanitizeInputMiddleware, revokeLifetimeAccess);

export default router;
