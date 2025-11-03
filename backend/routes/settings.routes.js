import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getDefaultCommission,
  updateDefaultCommission
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

export default router;

