import { supabaseAdmin } from '../../config/database.js';
import multer from 'multer';

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
    }
  },
});

/**
 * Upload payment proof file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} originalName - Original file name
 * @param {string} userId - User ID who submitted the payment
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadPaymentProof(fileBuffer, mimetype, originalName, userId, invoiceId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}-${sanitizedName}`;
  const filePath = `${userId}/${invoiceId}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from('payment-proofs')
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file to Supabase Storage:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Try to get public URL first (if bucket is public)
  const { data: urlData } = supabaseAdmin.storage
    .from('payment-proofs')
    .getPublicUrl(filePath);

  // If bucket is private, generate signed URL instead
  // Try to generate signed URL (works for both public and private buckets)
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 31536000); // 1 year expiry

  if (signedUrlError) {
    // If signed URL generation fails, fall back to public URL
    console.warn('Failed to generate signed URL, using public URL:', signedUrlError);
    return {
      url: urlData.publicUrl,
      path: filePath,
      fileName: originalName
    };
  }

  // Use signed URL (works for private buckets)
  return {
    url: signedUrlData.signedUrl,
    path: filePath,
    fileName: originalName
  };
}

/**
 * Submit payment for an invoice
 * @route   POST /api/invoices/:id/payments
 * @access  Private (Admin, Reseller, Consumer)
 */
export const submitPayment = async (req, res) => {
  try {
    const { id: invoiceId } = req.params;
    const userId = req.user.id;
    const userRole = req.userProfile?.role;

    // Validate invoice exists
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, receiver_id, sender_id, status, total_amount')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found'
      });
    }

    // Check permissions: Admin can submit for any invoice, 
    // Reseller can submit for their invoices, 
    // Consumer can submit for their own invoices
    if (userRole === 'consumer') {
      if (invoice.receiver_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only submit payments for your own invoices'
        });
      }
    } else if (userRole === 'reseller') {
      if (invoice.sender_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only submit payments for invoices you created'
        });
      }
    }

    // Validate invoice status
    if (invoice.status === 'paid') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invoice is already paid'
      });
    }

    // Get payment data from request body
    const {
      payment_mode,
      payment_date,
      amount,
      notes,
      // Bank Transfer fields
      bank_name,
      account_number,
      transaction_reference,
      utr_number,
      // Online Payment fields
      transaction_id,
      payment_gateway,
      // Card fields
      card_last_four,
      cardholder_name,
      // Cheque fields
      cheque_number,
      cheque_bank_name
    } = req.body;

    // Validate required fields
    if (!payment_mode || !payment_date || !amount) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment mode, payment date, and amount are required'
      });
    }

    // Get paid_by from authentication token (the logged-in user)
    // This is the person who actually paid/submitted the payment
    const paidBy = userId;

    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payment amount'
      });
    }

    // Handle file upload if present
    let proofFileUrl = null;
    let proofFileName = null;
    let proofFilePath = null;

    if (req.file) {
      try {
        const uploadResult = await uploadPaymentProof(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          userId,
          invoiceId
        );
        proofFileUrl = uploadResult.url;
        proofFileName = uploadResult.fileName;
        proofFilePath = uploadResult.path;
      } catch (uploadError) {
        console.error('Error uploading payment proof:', uploadError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: `Failed to upload payment proof: ${uploadError.message}`
        });
      }
    }

    // Prepare payment data
    const paymentData = {
      invoice_id: invoiceId,
      payment_mode,
      payment_date,
      amount: paymentAmount,
      notes: notes || null,
      // Bank Transfer fields
      bank_name: bank_name || null,
      account_number: account_number || null,
      transaction_reference: transaction_reference || null,
      utr_number: utr_number || null,
      // Online Payment fields
      transaction_id: transaction_id || null,
      payment_gateway: payment_gateway || payment_mode,
      // Card fields
      card_last_four: card_last_four || null,
      cardholder_name: cardholder_name || null,
      // Cheque fields
      cheque_number: cheque_number || null,
      cheque_bank_name: cheque_bank_name || null,
      // File fields
      proof_file_url: proofFileUrl,
      proof_file_name: proofFileName,
      // Metadata
      submitted_by: userId,
      paid_by: paidBy, // Who actually paid (from authentication token - the logged-in user)
      status: 'pending' // Default status, admin can approve later
    };

    // Insert payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('invoice_payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Error creating payment record:', paymentError);
      
      // If file was uploaded but payment record failed, delete the file
      if (proofFilePath) {
        await supabaseAdmin.storage
          .from('payment-proofs')
          .remove([proofFilePath]);
      }

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create payment record: ' + (paymentError?.message || 'Unknown error')
      });
    }

    // Update invoice status to 'under_review' when payment is submitted
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ 
        status: 'under_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .in('status', ['unpaid', 'pending']); // Update if unpaid or pending (from old trigger)
    
    if (updateError) {
      console.error('Error updating invoice status:', updateError);
      // Don't fail the payment submission if status update fails
    }

    return res.status(201).json({
      success: true,
      message: 'Payment submitted successfully',
      data: {
        payment_id: payment.id,
        invoice_id: invoiceId,
        status: payment.status,
        message: 'Payment submitted and awaiting approval'
      }
    });

  } catch (error) {
    console.error('Error submitting payment:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to submit payment'
    });
  }
};

/**
 * Get payments for an invoice
 * @route   GET /api/invoices/:id/payments
 * @access  Private (Admin, Reseller, Consumer)
 */
export const getInvoicePayments = async (req, res) => {
  try {
    const { id: invoiceId } = req.params;
    const userId = req.user.id;
    const userRole = req.userProfile?.role;

    // Validate invoice exists and user has access
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, receiver_id, sender_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found'
      });
    }

    // Check permissions
    if (userRole === 'consumer' && invoice.receiver_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    } else if (userRole === 'reseller' && invoice.sender_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }

    // Get payments for this invoice
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('invoice_payments')
      .select(`
        id,
        payment_mode,
        payment_date,
        amount,
        notes,
        bank_name,
        account_number,
        transaction_reference,
        utr_number,
        transaction_id,
        payment_gateway,
        card_last_four,
        cardholder_name,
        cheque_number,
        cheque_bank_name,
        proof_file_url,
        proof_file_name,
        status,
        submitted_by,
        paid_by,
        reviewed_by,
        reviewed_at,
        review_notes,
        created_at,
        updated_at
      `)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch payments'
      });
    }

    // Enrich with user data from auth_role_with_profiles view
    const userIds = new Set();
    (payments || []).forEach(payment => {
      if (payment.submitted_by) userIds.add(payment.submitted_by);
      if (payment.paid_by) userIds.add(payment.paid_by);
      if (payment.reviewed_by) userIds.add(payment.reviewed_by);
    });

    const userIdsArray = Array.from(userIds);
    let userProfiles = [];
    
    if (userIdsArray.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('auth_role_with_profiles')
        .select('user_id, email, full_name, role')
        .in('user_id', userIdsArray);
      
      userProfiles = profiles || [];
    }

    // Create maps for quick lookup
    const userMap = new Map(userProfiles.map(p => [p.user_id, {
      full_name: p.full_name,
      email: p.email,
      role: p.role
    }]));

    // Enrich payments with user data and generate signed URLs for proof files
    const enrichedPayments = await Promise.all((payments || []).map(async (payment) => {
      let proofFileUrl = payment.proof_file_url;
      
      // If proof file exists, try to generate a signed URL
      if (payment.proof_file_url) {
        try {
          // Extract file path from URL or use stored path
          // URL format: https://project.supabase.co/storage/v1/object/public/bucket/path
          // or: https://project.supabase.co/storage/v1/object/sign/bucket/path?token=...
          let filePath = null;
          
          // Try to extract path from URL
          const urlMatch = payment.proof_file_url.match(/\/storage\/v1\/object\/(public|sign)\/([^\/]+)\/(.+)$/);
          if (urlMatch) {
            filePath = urlMatch[3];
          } else if (payment.proof_file_url.includes('/payment-proofs/')) {
            // Extract path after /payment-proofs/
            const pathMatch = payment.proof_file_url.match(/\/payment-proofs\/(.+)$/);
            if (pathMatch) {
              filePath = pathMatch[1];
            }
          }
          
          if (filePath) {
            // Generate signed URL (works for both public and private buckets)
            const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
              .from('payment-proofs')
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (!signedUrlError && signedUrlData) {
              proofFileUrl = signedUrlData.signedUrl;
            }
          }
        } catch (error) {
          console.error('Error generating signed URL for payment proof:', error);
          // Keep original URL if signed URL generation fails
        }
      }
      
      return {
        ...payment,
        proof_file_url: proofFileUrl,
        submitted_by_user: payment.submitted_by ? userMap.get(payment.submitted_by) || null : null,
        paid_by_user: payment.paid_by ? userMap.get(payment.paid_by) || null : null,
        reviewed_by_user: payment.reviewed_by ? userMap.get(payment.reviewed_by) || null : null
      };
    }));

    return res.status(200).json({
      success: true,
      data: enrichedPayments
    });

  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch payments'
    });
  }
};

/**
 * Approve or reject a payment (Admin only)
 * @route   PATCH /api/invoices/payments/:paymentId
 * @access  Private (Admin)
 */
export const reviewPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    const userRole = req.userProfile?.role;

    // Only admin can review payments
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const { status, review_notes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // Get payment and invoice
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('invoice_payments')
      .select('id, invoice_id, amount')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment not found'
      });
    }

    // Update payment status
    const updateData = {
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes: review_notes || null
    };

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('invoice_payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError || !updatedPayment) {
      console.error('Error updating payment:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update payment status'
      });
    }

    // If payment is approved, update invoice status to 'paid'
    if (status === 'approved') {
      await supabaseAdmin
        .from('invoices')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.invoice_id);
    }

    return res.status(200).json({
      success: true,
      message: `Payment ${status} successfully`,
      data: updatedPayment
    });

  } catch (error) {
    console.error('Error reviewing payment:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to review payment'
    });
  }
};

// Export multer upload middleware
export { upload };

