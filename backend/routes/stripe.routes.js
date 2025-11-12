import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
} from './controllers/stripe.controller.js';

const router = express.Router();

/**
 * @route   POST /api/stripe/create-payment-intent
 * @desc    Create Stripe payment intent
 * @access  Public (requires encrypted data)
 */
router.post('/create-payment-intent', createPaymentIntent);

/**
 * @route   POST /api/stripe/confirm-payment
 * @desc    Confirm payment and update invoice
 * @access  Public
 */
router.post('/confirm-payment', confirmPayment);

export default router;

