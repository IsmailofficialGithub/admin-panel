import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getAllResellers,
  getResellerById,
  createReseller,
  updateReseller,
  deleteReseller,
  resetResellerPassword,
  getMyConsumers,
  createMyConsumer,
  updateMyConsumer,
  deleteMyConsumer,
  resetMyConsumerPassword,
  createConsumerAdmin,
  getReferredConsumers
} from './controllers/resellers.controller.js';

const router = express.Router();

/**
 * @route   GET /api/resellers
 * @desc    Get all resellers (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, getAllResellers);

/**
 * ==========================================
 * RESELLER'S OWN CONSUMERS MANAGEMENT ROUTES
 * (Must come BEFORE /:id routes)
 * ==========================================
 */

/**
 * @route   GET /api/resellers/my-consumers
 * @desc    Get all consumers created by the logged-in reseller
 * @access  Private (Reseller)
 */
router.get('/my-consumers', authenticate, getMyConsumers);

/**
 * @route   POST /api/resellers/my-consumers
 * @desc    Create new consumer (referred by reseller)
 * @access  Private (Reseller)
 */
router.post('/my-consumers', authenticate, createMyConsumer);

/**
 * @route   PUT /api/resellers/my-consumers/:id
 * @desc    Update consumer created by reseller
 * @access  Private (Reseller)
 */
router.put('/my-consumers/:id', authenticate, updateMyConsumer);

/**
 * @route   DELETE /api/resellers/my-consumers/:id
 * @desc    Delete consumer created by reseller
 * @access  Private (Reseller)
 */
router.delete('/my-consumers/:id', authenticate, deleteMyConsumer);

/**
 * @route   POST /api/resellers/my-consumers/:id/reset-password
 * @desc    Reset password for consumer created by reseller
 * @access  Private (Reseller)
 */
router.post('/my-consumers/:id/reset-password', authenticate, resetMyConsumerPassword);

/**
 * @route   POST /api/resellers/create-consumer
 * @desc    Create new consumer (admin only)
 * @access  Private (Admin)
 */
router.post('/create-consumer', authenticate, requireAdmin, createConsumerAdmin);

/**
 * ==========================================
 * RESELLER MANAGEMENT ROUTES
 * ==========================================
 */

/**
 * @route   GET /api/resellers/:id/referred-consumers
 * @desc    Get all consumers referred by a specific user/reseller (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/referred-consumers', authenticate, requireAdmin, getReferredConsumers);

/**
 * @route   GET /api/resellers/:id
 * @desc    Get reseller by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, getResellerById);

/**
 * @route   POST /api/resellers
 * @desc    Create new reseller (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, createReseller);

/**
 * @route   PUT /api/resellers/:id
 * @desc    Update reseller (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, updateReseller);

/**
 * @route   DELETE /api/resellers/:id
 * @desc    Delete reseller (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteReseller);

/**
 * @route   POST /api/resellers/:id/reset-password
 * @desc    Reset reseller password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, resetResellerPassword);

export default router;
