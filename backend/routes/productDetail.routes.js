import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getProductDetail,
  getProductDashboard,
  getProductUsers,
  getProductTables,
  getTableDetails
} from './controllers/productDetail.controller.js';
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../utils/apiOptimization.js';

const rateLimitMiddleware = createRateLimitMiddleware('product-detail', 100);

const router = express.Router();

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get product detail with database info (admin only)
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getProductDetail);

/**
 * @route   GET /api/admin/products/:id/dashboard
 * @desc    Get product dashboard data (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/dashboard', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getProductDashboard);

/**
 * @route   GET /api/admin/products/:id/users
 * @desc    Get product users (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/users', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getProductUsers);

/**
 * @route   GET /api/admin/products/:id/tables
 * @desc    Get all tables in product database (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/tables', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getProductTables);

/**
 * @route   GET /api/admin/products/:id/tables/:tableName
 * @desc    Get table details (admin only)
 * @access  Private (Admin)
 */
router.get('/:id/tables/:tableName', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, getTableDetails);

export default router;

