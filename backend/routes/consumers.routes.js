import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getAllConsumers,
  getConsumerById,
  updateConsumer,
  deleteConsumer,
  resetConsumerPassword,
  updateConsumerAccountStatus
} from './controllers/consumers.controller.js';

const router = express.Router();

/**
 * @route   GET /api/consumers
 * @desc    Get all consumers (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, getAllConsumers);

/**
 * @route   GET /api/consumers/:id
 * @desc    Get consumer by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, getConsumerById);

/**
 * @route   PUT /api/consumers/:id
 * @desc    Update consumer (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, updateConsumer);

/**
 * @route   DELETE /api/consumers/:id
 * @desc    Delete consumer (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteConsumer);

/**
 * @route   POST /api/consumers/:id/reset-password
 * @desc    Reset consumer password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, resetConsumerPassword);

/**
 * @route   PATCH /api/consumers/:id/account-status
 * @desc    Update consumer account status (admin only)
 * @access  Private (Admin)
 */
router.patch('/:id/account-status', authenticate, requireAdmin, updateConsumerAccountStatus);

export default router;
