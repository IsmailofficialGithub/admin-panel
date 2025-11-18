import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getProductDetail,
  getProductDashboard,
  getProductUsers,
  getProductTables,
  getTableDetails
} from './controllers/productDetail.controller.js';

const router = express.Router();

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get product detail with database info (admin only)
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, getProductDetail);

/**
 * @route   GET /api/admin/products/:id/dashboard
 * @desc    Get product dashboard data (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/dashboard', authenticate, requireAdmin, getProductDashboard);

/**
 * @route   GET /api/admin/products/:id/users
 * @desc    Get product users (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/users', authenticate, requireAdmin, getProductUsers);

/**
 * @route   GET /api/admin/products/:id/tables
 * @desc    Get all tables in product database (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/tables', authenticate, requireAdmin, getProductTables);

/**
 * @route   GET /api/admin/products/:id/tables/:tableName
 * @desc    Get table details (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/tables/:tableName', authenticate, requireAdmin, getTableDetails);

export default router;

