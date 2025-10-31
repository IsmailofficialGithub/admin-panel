import express from 'express';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from './controllers/products.controller.js';

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products (admin, reseller, consumer)
 * @access  Private (Admin/Reseller/Consumer)
 */
router.get('/', authenticate, requireRole(['admin','reseller','consumer']), getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID (admin, reseller, consumer)
 * @access  Private (Admin/Reseller/Consumer)
 */
router.get('/:id', authenticate, requireRole(['admin','reseller','consumer']), getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
