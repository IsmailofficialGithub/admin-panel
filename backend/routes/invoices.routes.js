import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getConsumerProductsForInvoice,
  getAllInvoices,
  getMyInvoices,
  createInvoice,
  getConsumerInvoices
} from './controllers/invoices.controller.js';

const router = express.Router();

/**
 * @route   GET /api/invoices/consumer/:consumerId/products
 * @desc    Get consumer's accessed products with prices for invoice creation
 * @access  Private (Admin or Reseller)
 */
router.get(
  '/consumer/:consumerId/products',
  (req, res, next) => {
    console.log('📥 Invoice route hit:', req.method, req.path);
    console.log('📥 Params:', req.params);
    next();
  },
  authenticate,
  requireRole(['admin', 'reseller']),
  getConsumerProductsForInvoice
);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireRole(['admin']),
  getAllInvoices
);

// Alias to support /api/invoices/invoices (some clients expect this path)
router.get(
  '/invoices',
  authenticate,
  requireRole(['admin']),
  getAllInvoices
);

/**
 * @route   GET /api/invoices/my-invoices
 * @desc    Get invoices for reseller's referred consumers
 * @access  Private (Reseller)
 */
router.get(
  '/my-invoices',
  authenticate,
  requireRole(['reseller']),
  getMyInvoices
);

/**
 * @route   GET /api/invoices/consumer/:consumerId
 * @desc    Get invoices for a specific consumer
 * @access  Private (Admin or Reseller)
 */
router.get(
  '/consumer/:consumerId',
  authenticate,
  requireRole(['admin', 'reseller']),
  getConsumerInvoices
);

/**
 * @route   POST /api/invoices
 * @desc    Create invoice with invoice items
 * @access  Private (Admin or Reseller)
 */
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'reseller']),
  createInvoice
);

export default router;

