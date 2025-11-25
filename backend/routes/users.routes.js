import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  createReseller,
  updateUserAccountStatus,
  rateLimitMiddleware,
  sanitizeInputMiddleware
} from './controllers/users.controller.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, deleteUser);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, resetUserPassword);

/**
 * @route   POST /api/users/create-reseller
 * @desc    Create reseller (admin only)
 * @access  Private (Admin)
 */
router.post('/create-reseller', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, createReseller);

/**
 * @route   PATCH /api/users/:id/account-status
 * @desc    Update user account status (admin only)
 * @access  Private (Admin)
 */
router.patch('/:id/account-status', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, updateUserAccountStatus);

export default router;
