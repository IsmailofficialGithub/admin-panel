import express from 'express';
import {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  getActiveOffer
} from './controllers/offers.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/offers
 * @desc    Get all offers with pagination and filters
 * @access  Private (Admin or Reseller) - Read-only for resellers
 */
router.get('/', authenticate, requireRole(['admin', 'reseller']), getAllOffers);

/**
 * @route   GET /api/offers/active/:date?
 * @desc    Get active offer for a specific date (or current date)
 * @access  Private (Admin or Reseller)
 */
router.get('/active/:date?', authenticate, requireRole(['admin', 'reseller']), getActiveOffer);

/**
 * @route   GET /api/offers/:id
 * @desc    Get a single offer by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireRole(['admin']), getOfferById);

/**
 * @route   POST /api/offers
 * @desc    Create a new offer
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireRole(['admin']), createOffer);

/**
 * @route   PUT /api/offers/:id
 * @desc    Update an offer
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireRole(['admin']), updateOffer);

/**
 * @route   DELETE /api/offers/:id
 * @desc    Delete an offer
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireRole(['admin']), deleteOffer);

export default router;

