import express from 'express';
import { getActivityLogs, getActivityLogById } from './controllers/activityLogs.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route GET /api/activity-logs
// @desc  Get all activity logs with filters (admin only)
// @access Private (Admin)
router.get('/', authenticate, requireAdmin, getActivityLogs);

// @route GET /api/activity-logs/:id
// @desc  Get activity log by ID (admin only)
// @access Private (Admin)
router.get('/:id', authenticate, requireAdmin, getActivityLogById);

export default router;

