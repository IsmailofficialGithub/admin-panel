import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendPasswordResetEmail } from '../../services/emailService.js';
import { generatePassword } from '../../utils/helpers.js';

/**
 * Consumers Controller
 * Handles consumer-related operations
 */

/**
 * Get all consumers with filters (admin only)
 * @route   GET /api/consumers?account_status=active&search=john
 * @access  Private (Admin)
 */
export const getAllConsumers = async (req, res) => {
  try {
    const { account_status, search } = req.query;

    console.log('🔍 Filtering consumers with:', { account_status, search });

    // Start building the query
    let query = supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('role', 'consumer');

    // Filter by account_status if provided
    if (account_status && account_status !== 'all') {
      query = query.eq('account_status', account_status);
      console.log('✅ Filtering by account_status:', account_status);
    }

    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      // Search in full_name and email
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false });

    const { data: consumers, error } = await query;

    if (error) {
      console.error('❌ Error fetching consumers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }


    res.json({
      success: true,
      count: consumers.length,
      data: consumers,
      filters: {
        account_status: account_status || 'all',
        search: search || ''
      }
    });
  } catch (error) {
    console.error('Get consumers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get consumer by ID
 * @route   GET /api/consumers/:id
 * @access  Private (Admin)
 */
export const getConsumerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: consumer, error } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    res.json({
      success: true,
      data: consumer
    });
  } catch (error) {
    console.error('Get consumer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update consumer (admin only)
 * @route   PUT /api/consumers/:id
 * @access  Private (Admin)
 */
export const updateConsumer = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, trial_expiry_date, country, city, subscribed_products } = req.body;

    // Validate required fields for update
    if (!country || !city || !phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Country, city, and phone are required'
      });
    }

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    updateData.phone = phone;
    updateData.country = country;
    updateData.city = city;
    if (trial_expiry_date !== undefined) {
      // Convert to timestamp if provided
      if (trial_expiry_date) {
        updateData.trial_expiry = new Date(trial_expiry_date);
      } else {
        updateData.trial_expiry = null;
      }
    }
    // Handle subscribed_products (array of product UUIDs)
    if (subscribed_products !== undefined) {
      updateData.subscribed_products = subscribed_products || [];
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update'
      });
    }

    console.log("updateData", updateData);

    const { data: updatedConsumer, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'consumer')
      .select()
      .maybeSingle();
      
    console.log("updatedConsumer", updatedConsumer);

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Consumer updated successfully',
      data: updatedConsumer
    });
  } catch (error) {
    console.error('Update consumer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete consumer (admin only)
 * @route   DELETE /api/consumers/:id
 * @access  Private (Admin)
 */
export const deleteConsumer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if consumer exists
    const { data: consumer, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    if (fetchError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Delete from profiles table first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', id);

    if (profileError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: profileError.message
      });
    }

    // Delete from auth using admin client
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      if (authError) {
        console.error('Error deleting user from auth:', authError);
        // Continue anyway since profile is deleted
      }
    }

    res.json({
      success: true,
      message: 'Consumer deleted successfully'
    });
  } catch (error) {
    console.error('Delete consumer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update consumer account status (admin only)
 * @route   PATCH /api/consumers/:id/account-status
 * @access  Private (Admin)
 */
export const updateConsumerAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { account_status, trial_expiry_date } = req.body;

    // Validate account_status
    const validStatuses = ['active', 'deactive', 'expired_subscription'];
    if (!account_status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'account_status is required'
      });
    }

    if (!validStatuses.includes(account_status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid account_status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`🔄 Updating consumer ${id} account status to:`, account_status);

    // Prepare update data
    const updateData = { account_status };

    // Handle trial_expiry based on account status
    if (account_status === 'expired_subscription') {
      // Set trial_expiry to current date to mark as expired
      updateData.trial_expiry = new Date().toISOString();
      console.log('📅 Setting trial_expiry to current date (expired)');
    } else if (account_status === 'active') {
      // If trial_expiry_date is provided, use it; otherwise extend by 30 days
      if (trial_expiry_date) {
        updateData.trial_expiry = trial_expiry_date;
        console.log('📅 Setting trial_expiry to provided date:', trial_expiry_date);
      } else {
        // Extend trial by 30 days from now
        const extendedDate = new Date();
        extendedDate.setDate(extendedDate.getDate() + 30);
        updateData.trial_expiry = extendedDate.toISOString();
        console.log('📅 Extending trial_expiry by 30 days:', updateData.trial_expiry);
      }
    } else if (account_status === 'deactive') {
      // Keep trial_expiry as is for deactive status
      console.log('📅 Keeping existing trial_expiry for deactive status');
    }

    // Update account_status and trial_expiry in profiles table
    const { data: updatedConsumer, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'consumer')
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating account status:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    if (!updatedConsumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    console.log('✅ Account status updated successfully:', updatedConsumer);

    res.json({
      success: true,
      message: `Consumer account status updated to ${account_status}`,
      data: updatedConsumer
    });
  } catch (error) {
    console.error('Update account status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Reset consumer password (admin only)
 * @route   POST /api/consumers/:id/reset-password
 * @access  Private (Admin)
 */
export const resetConsumerPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError) {
      console.error("Error fetching user from auth:", userError);
    }

    // Assume email and full_name may be under user.user_metadata
    const profile = {
      email: user?.user?.email,
      full_name: user?.user?.user_metadata?.full_name || user?.user?.email?.split('@')[0]
    };

    if (!profile || !profile.email || !profile.full_name) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email or full name not found'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { password: newPassword }
    );

    if (updateError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: updateError.message
      });
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: profile.email,
        full_name: profile.full_name,
        new_password: newPassword
      });
      console.log('✅ Password reset email sent to:', profile.email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
      // Continue anyway - password is reset
    }

    res.json({
      success: true,
      message: 'Password reset successfully. Email sent to consumer.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

