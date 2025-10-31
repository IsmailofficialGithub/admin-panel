import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getDashboardStats } from './controllers/dashboard.controller.js';

const router = express.Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, requireAdmin, getDashboardStats);

export default router;

