import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
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
 * @desc    Get all products
 * @access  Private (Admin only)
 */
router.get('/', authenticate, requireAdmin, getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get a single product by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, requireAdmin, getProductById);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Admin only)
 */
router.post('/', authenticate, requireAdmin, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;

