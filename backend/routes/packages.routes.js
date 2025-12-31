import express from 'express';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';
import {
  getAllPackages,
  getPackagesByProduct,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  rateLimitMiddleware,
  sanitizeInputMiddleware
} from './controllers/packages.controller.js';

const router = express.Router();

/**
 * @route   GET /api/packages
 * @desc    Get all packages (admin, reseller, consumer, support)
 * @access  Private (Admin/Reseller/Consumer/Support)
 */
router.get('/', authenticate, requireRole(['admin','reseller','consumer','support']), rateLimitMiddleware, sanitizeInputMiddleware, getAllPackages);

/**
 * @route   GET /api/packages/product/:productId
 * @desc    Get packages by product ID (admin, reseller, consumer, support)
 * @access  Private (Admin/Reseller/Consumer/Support)
 */
router.get('/product/:productId', authenticate, requireRole(['admin','reseller','consumer','support']), rateLimitMiddleware, sanitizeInputMiddleware, getPackagesByProduct);

/**
 * @route   GET /api/packages/:id
 * @desc    Get package by ID (admin, reseller, consumer, support)
 * @access  Private (Admin/Reseller/Consumer/Support)
 */
router.get('/:id', authenticate, requireRole(['admin','reseller','consumer','support']), rateLimitMiddleware, sanitizeInputMiddleware, getPackageById);

/**
 * @route   POST /api/packages
 * @desc    Create new package (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, createPackage);

/**
 * @route   PUT /api/packages/:id
 * @desc    Update package (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, updatePackage);

/**
 * @route   DELETE /api/packages/:id
 * @desc    Delete package (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, rateLimitMiddleware, sanitizeInputMiddleware, deletePackage);

export default router;

