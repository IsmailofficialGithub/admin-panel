import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getDefaultCommission,
  updateDefaultCommission,
  getResellerSettings,
  updateResellerSettings
} from './controllers/settings.controller.js';

const router = express.Router();

/**
 * @route   GET /api/settings/default-commission
 * @desc    Get default reseller commission
 * @access  Private (Admin)
 */
router.get('/default-commission', authenticate, requireAdmin, getDefaultCommission);

/**
 * @route   PUT /api/settings/default-commission
 * @desc    Update default reseller commission
 * @access  Private (Admin)
 */
router.put('/default-commission', authenticate, requireAdmin, updateDefaultCommission);

/**
 * @route   GET /api/settings/reseller
 * @desc    Get all reseller settings
 * @access  Private (Admin)
 */
router.get('/reseller', authenticate, requireAdmin, getResellerSettings);

/**
 * @route   PUT /api/settings/reseller
 * @desc    Update all reseller settings
 * @access  Private (Admin)
 */
router.put('/reseller', authenticate, requireAdmin, updateResellerSettings);

export default router;

