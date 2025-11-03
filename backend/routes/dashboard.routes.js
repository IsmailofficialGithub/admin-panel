import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getDashboardStats, getResellerStats } from './controllers/dashboard.controller.js';

const router = express.Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, requireAdmin, getDashboardStats);

/**
 * @route   GET /api/dashboard/reseller-stats
 * @desc    Get reseller business statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/reseller-stats', authenticate, requireAdmin, getResellerStats);

export default router;

