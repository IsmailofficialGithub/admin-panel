import express from 'express';
import {
  createPayPalOrder,
  capturePayPalPayment,
} from './controllers/paypal.controller.js';

const router = express.Router();

/**
 * @route   POST /api/paypal/create-order
 * @desc    Create PayPal order
 * @access  Public (requires encrypted data)
 */
router.post('/create-order', createPayPalOrder);

/**
 * @route   POST /api/paypal/capture-payment
 * @desc    Capture PayPal payment
 * @access  Public
 */
router.post('/capture-payment', capturePayPalPayment);

export default router;

