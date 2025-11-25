import express from 'express';
import { getActivityLogs, getActivityLogById } from './controllers/activityLogs.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../utils/apiOptimization.js';

const rateLimitMiddleware = createRateLimitMiddleware('activity-logs', 100);

const router = express.Router();

// @route GET /api/activity-logs
// @desc  Get all activity logs with filters (admin only)
// @access Private (Admin)
router.get('/', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getActivityLogs);

// @route GET /api/activity-logs/:id
// @desc  Get activity log by ID (admin only)
// @access Private (Admin)
router.get('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getActivityLogById);

export default router;

