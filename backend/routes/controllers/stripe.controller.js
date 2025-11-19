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

    // Create payment intent with international bank transfer support
    // By not specifying payment_method_types, Stripe Payment Element will automatically
    // show all available payment methods (cards, bank transfers for all countries, etc.)
    // based on the customer's location and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      // Let Stripe automatically detect and show available payment methods
      // This includes: cards, US ACH, SEPA (EU), Bacs (UK), and other international bank transfers
      // Payment Element will show appropriate methods based on customer location
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always', // Allow redirects for bank transfers that require it
      },
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

    // Check payment status - handle both succeeded and processing (bank transfers)
    const paymentStatus = paymentIntent.status;
    
    if (paymentStatus === 'succeeded' || paymentStatus === 'processing') {
      console.log(`[${paymentStatus === 'succeeded' ? 'success' : 'info'}] Payment ${paymentStatus}:`, {
        paymentIntentId,
        invoice_id,
        invoice_number,
        amount: paymentIntent.amount / 100,
        payment_method_type: paymentIntent.payment_method_types?.[0] || 'card',
      });

      // Determine payment mode based on payment method type
      // Get the actual payment method used (if available)
      const paymentMethodId = paymentIntent.payment_method;
      let paymentMethodType = 'card'; // default
      let isBankTransfer = false;
      
      // Check if it's a bank transfer based on status or payment method
      if (paymentStatus === 'processing') {
        // Processing status usually indicates bank transfer
        isBankTransfer = true;
      } else if (paymentMethodId) {
        // Retrieve payment method to check type
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
          paymentMethodType = paymentMethod.type;
          // Bank transfer types: us_bank_account, customer_balance, or country-specific methods
          isBankTransfer = paymentMethod.type === 'us_bank_account' || 
                          paymentMethod.type === 'customer_balance' ||
                          paymentMethod.type === 'link'; // Link can be used for bank transfers
        } catch (pmError) {
          console.error('Error retrieving payment method:', pmError);
          // Fallback: check payment intent payment method types
          const pmTypes = paymentIntent.payment_method_types || [];
          isBankTransfer = pmTypes.some(type => 
            type === 'us_bank_account' || 
            type === 'customer_balance' ||
            paymentStatus === 'processing'
          );
        }
      } else {
        // Fallback: check payment intent payment method types
        const pmTypes = paymentIntent.payment_method_types || [];
        isBankTransfer = pmTypes.some(type => 
          type === 'us_bank_account' || 
          type === 'customer_balance'
        ) || paymentStatus === 'processing';
      }
      
      // For succeeded payments, mark invoice as paid immediately
      // For processing (bank transfers), invoice stays under_review until payment completes
      if (paymentStatus === 'succeeded') {
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
      } else if (paymentStatus === 'processing') {
        // Bank transfer is processing - set invoice to under_review
        const { error: updateError } = await supabaseAdmin
          .from('invoices')
          .update({ 
            status: 'under_review',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice_id)
          .in('status', ['unpaid', 'pending']);

        if (updateError) {
          console.error('Error updating invoice status:', updateError);
        }
      }

      // Create payment record in invoice_payments table
      const paymentRecord = {
        invoice_id,
        payment_mode: isBankTransfer ? 'bank_transfer' : 'online_payment',
        payment_gateway: 'stripe',
        amount: paymentIntent.amount / 100,
        payment_date: new Date().toISOString(),
        transaction_id: paymentIntent.id,
        status: paymentStatus === 'succeeded' ? 'approved' : 'pending', // Processing payments are pending
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
        message: paymentStatus === 'succeeded' 
          ? 'Payment confirmed successfully' 
          : 'Bank transfer payment is being processed',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentStatus,
          amount: paymentIntent.amount / 100,
          payment_method_type: paymentMethodType,
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

