import Stripe from 'stripe';
import { supabaseAdmin } from '../../config/database.js';
import { decryptPaymentData } from '../../utils/encryption.js';
import { logActivity, getActorInfo, getClientIp, getUserAgent } from '../../services/activityLogger.js';

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Create payment intent for Stripe
 * @route   POST /api/stripe/create-payment-intent
 * @access  Public (but requires encrypted data)
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const { encryptedData } = req.body;

    if (!encryptedData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Encrypted payment data is required'
      });
    }

    // Decrypt payment data
    let paymentData;
    try {
      paymentData = decryptPaymentData(encryptedData);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or corrupted payment data'
      });
    }

    const { amount, invoice_id, user_id, invoice_number } = paymentData;

    // Validate required fields
    if (!amount || !invoice_id || !user_id || !invoice_number) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required payment information'
      });
    }

    // Validate invoice exists and belongs to user
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    console.log('invoice', invoice);

    if (invoiceError || !invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found'
      });
    }

    // Verify invoice belongs to user
    // if (invoice.consumer_id !== user_id) {
    //   return res.status(403).json({
    //     error: 'Forbidden',
    //     message: 'Invoice does not belong to this user'
    //   });
    // }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invoice is already paid',
        invoice_status: 'paid'
      });
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    if (amountInCents <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payment amount'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        invoice_id,
        user_id,
        invoice_number,
      },
      description: `Payment for invoice ${invoice_number}`,
    });


    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to create payment intent'
    });
  }
};

/**
 * Confirm payment and update invoice
 * @route   POST /api/stripe/confirm-payment
 * @access  Public
 */
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, encryptedData } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment intent not found'
      });
    }

    // Decrypt payment data to get invoice info
    let paymentData;
    try {
      paymentData = encryptedData ? decryptPaymentData(encryptedData) : paymentIntent.metadata;
    } catch (decryptError) {
      // If decryption fails, use metadata from payment intent
      paymentData = paymentIntent.metadata;
    }

    const { invoice_id, user_id, invoice_number } = paymentData;

    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      console.log('[success] Payment succeeded:', {
        paymentIntentId,
        invoice_id,
        invoice_number,
        amount: paymentIntent.amount / 100,
      });

      // Update invoice status to paid
      const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('Error updating invoice status:', updateError);
      }

      // Create payment record in invoice_payments table
      const paymentRecord = {
        invoice_id,
        payment_mode: 'online_payment',
        payment_gateway: 'stripe',
        amount: paymentIntent.amount / 100,
        payment_date: new Date().toISOString(),
        transaction_id: paymentIntent.id,
        status: 'approved',
        paid_by: user_id,
        submitted_by: user_id,
        reviewed_by: null,
        reviewed_at: null,
      };

      const { error: paymentRecordError } = await supabaseAdmin
        .from('invoice_payments')
        .insert([paymentRecord]);

      if (paymentRecordError) {
        console.error('Error creating payment record:', paymentRecordError);
      }

      // Log activity
      // Note: targetId is set to null because activity_logs.target_id has FK to profiles,
      // but we're updating an invoice, not a profile. The invoice_id is stored in changedFields.
      try {
        await logActivity({
          actorId: user_id,
          actorRole: 'consumer',
          targetId: null, // Set to null since target is invoice, not profile
          actionType: 'update',
          tableName: 'invoices',
          changedFields: { 
            status: 'paid',
            invoice_id: invoice_id, // Store invoice ID in changedFields instead
            invoice_number: invoice_number
          },
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
        });
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
        },
      });
    } else if (paymentIntent.status === 'requires_payment_method') {
      console.log('[fail] Payment requires payment method:', paymentIntentId);
      res.status(400).json({
        error: 'Payment Failed',
        message: 'Payment method is required',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      });
    } else if (paymentIntent.status === 'canceled') {
      console.log('[fail] Payment canceled:', paymentIntentId);
      res.status(400).json({
        error: 'Payment Canceled',
        message: 'Payment was canceled',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      });
    } else {
      console.log('[fail] Payment failed with status:', paymentIntent.status, paymentIntentId);
      res.status(400).json({
        error: 'Payment Failed',
        message: `Payment status: ${paymentIntent.status}`,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
      });
    }
  } catch (error) {
    console.error('[fail] Error confirming payment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to confirm payment'
    });
  }
};

