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
  updateUserAccountStatus
} from './controllers/users.controller.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteUser);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, resetUserPassword);

/**
 * @route   POST /api/users/create-reseller
 * @desc    Create reseller (admin only)
 * @access  Private (Admin)
 */
router.post('/create-reseller', authenticate, requireAdmin, createReseller);

/**
 * @route   PATCH /api/users/:id/account-status
 * @desc    Update user account status (admin only)
 * @access  Private (Admin)
 */
router.patch('/:id/account-status', authenticate, requireAdmin, updateUserAccountStatus);

export default router;
