import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendPasswordResetEmail, sendTrialPeriodChangeEmail, sendTrialExtensionEmail } from '../../services/emailService.js';
import { generatePassword } from '../../utils/helpers.js';
import { logActivity, getActorInfo, getClientIp, getUserAgent } from '../../services/activityLogger.js';

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

    // Fetch product access for all consumers
    const consumersWithProducts = await Promise.all(
      consumers.map(async (consumer) => {
        try {
          const { data: productAccess, error: productError } = await supabase
            .from('user_product_access')
            .select('product_id')
            .eq('user_id', consumer.user_id);

          if (productError) {
            console.error(`Error fetching products for consumer ${consumer.user_id}:`, productError);
            return {
              ...consumer,
              subscribed_products: []
            };
          }

          // Extract product IDs into array
          const productIds = productAccess?.map(pa => pa.product_id) || [];
          
          return {
            ...consumer,
            subscribed_products: productIds
          };
        } catch (err) {
          console.error(`Error processing consumer ${consumer.user_id}:`, err);
          return {
            ...consumer,
            subscribed_products: []
          };
        }
      })
    );

    res.json({
      success: true,
      count: consumersWithProducts.length,
      data: consumersWithProducts,
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

    // Fetch product access for this consumer
    try {
      const { data: productAccess, error: productError } = await supabase
        .from('user_product_access')
        .select('product_id')
        .eq('user_id', id);

      if (productError) {
        console.error(`Error fetching products for consumer ${id}:`, productError);
        consumer.subscribed_products = [];
      } else {
        // Extract product IDs into array
        consumer.subscribed_products = productAccess?.map(pa => pa.product_id) || [];
      }
    } catch (err) {
      console.error(`Error processing product access for consumer ${id}:`, err);
      consumer.subscribed_products = [];
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
    
    console.log('subscribed_products received:', subscribed_products);

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
    // Note: subscribed_products is NOT stored in profiles table anymore
    // It's only stored in user_product_access table (see below)

    if (Object.keys(updateData).length === 0 && subscribed_products === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update'
      });
    }

    console.log("updateData", updateData);

    // Get current consumer data before update to compare trial_expiry
    const { data: currentConsumer, error: fetchError } = await supabase
      .from('auth_role_with_profiles')
      .select('email, full_name, trial_expiry')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    if (fetchError) {
      console.error('Error fetching consumer before update:', fetchError);
    }

    // Get old data for logging changed fields
    const { data: oldConsumer } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const oldTrialExpiry = currentConsumer?.trial_expiry || null;

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

    // Log activity - track changed fields
    const changedFields = {};
    Object.keys(updateData).forEach(key => {
      if (oldConsumer && oldConsumer[key] !== updateData[key]) {
        changedFields[key] = {
          old: oldConsumer[key],
          new: updateData[key]
        };
      }
    });

    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'update',
      tableName: 'profiles',
      changedFields: changedFields,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Update product access in user_product_access table
    if (subscribed_products !== undefined) {
      try {
        // First, delete all existing product access for this user
        const { error: deleteError } = await supabase
          .from('user_product_access')
          .delete()
          .eq('user_id', id);

        if (deleteError) {
          console.error('Error deleting existing product access:', deleteError);
        } else {
          console.log('✅ Deleted existing product access records');
        }

        // Then insert new product access records if any products are provided
        if (Array.isArray(subscribed_products) && subscribed_products.length > 0) {
          const productAccessRecords = subscribed_products.map(productId => ({
            user_id: id,
            product_id: productId
          }));

          const { error: insertError } = await supabase
            .from('user_product_access')
            .insert(productAccessRecords);

          if (insertError) {
            console.error('Error inserting product access:', insertError);
            // Don't fail the request, just log the error
          } else {
            console.log(`✅ Stored ${productAccessRecords.length} product access records`);
          }
        }
      } catch (productAccessErr) {
        console.error('Error updating product access:', productAccessErr);
        // Don't fail the request if product access update fails
      }
    }

    // Send email if trial_expiry_date was changed
    if (trial_expiry_date !== undefined && currentConsumer) {
      const newTrialExpiry = updatedConsumer?.trial_expiry || null;
      
      // Check if trial_expiry actually changed
      const oldDate = oldTrialExpiry ? new Date(oldTrialExpiry).toISOString() : null;
      const newDate = newTrialExpiry ? new Date(newTrialExpiry).toISOString() : null;
      
      if (oldDate !== newDate && currentConsumer.email && currentConsumer.full_name) {
        try {
          await sendTrialPeriodChangeEmail({
            email: currentConsumer.email,
            full_name: currentConsumer.full_name,
            old_trial_date: oldDate || 'Not set',
            new_trial_date: newDate || 'Not set',
          });
          console.log('✅ Trial period change email sent to:', currentConsumer.email);
        } catch (emailError) {
          console.error('❌ Error sending trial period change email:', emailError);
          // Continue anyway - don't fail the update if email fails
        }
      }
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

    // Log activity BEFORE deletion to avoid foreign key constraint violation
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'delete',
      tableName: 'profiles',
      changedFields: consumer || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

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

    // Fetch consumer to check created_at for trial validation
    const { data: consumer, error: fetchError } = await supabase
      .from('profiles')
      .select('created_at, trial_expiry')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    if (fetchError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Prepare update data
    const updateData = { account_status };

    // Handle trial_expiry based on account status
    if (account_status === 'expired_subscription') {
      // Set trial_expiry to current date to mark as expired
      updateData.trial_expiry = new Date().toISOString();
      console.log('📅 Setting trial_expiry to current date (expired)');
    } else if (account_status === 'active') {
      // If trial_expiry_date is provided, use it
      if (trial_expiry_date) {
        // Validate: trial_expiry cannot exceed 7 days from created_at
        const createdAt = new Date(consumer.created_at);
        const maxTrialDate = new Date(createdAt);
        maxTrialDate.setDate(maxTrialDate.getDate() + 7);
        
        const requestedExpiryDate = new Date(trial_expiry_date);
        
        if (requestedExpiryDate > maxTrialDate) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Trial cannot be extended beyond 7 days from account creation date'
          });
        }
        
        updateData.trial_expiry = trial_expiry_date;
        console.log('📅 Setting trial_expiry to provided date:', trial_expiry_date);
      } else {
        // Return error if no trial_expiry_date is provided for active status
        return res.status(400).json({
          error: 'Bad Request',
          message: 'trial_expiry_date is required when setting status to active'
        });
      }
    } else if (account_status === 'deactive') {
      // Keep trial_expiry as is for deactive status
      console.log('📅 Keeping existing trial_expiry for deactive status');
    }

    // Get consumer email and full_name for email notification
    const { data: consumerInfo, error: infoError } = await supabase
      .from('auth_role_with_profiles')
      .select('email, full_name, trial_expiry')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    if (infoError) {
      console.error('Error fetching consumer info:', infoError);
    }

    // Store old trial_expiry for email (from consumer fetched earlier or from consumerInfo)
    const oldTrialExpiry = consumerInfo?.trial_expiry || consumer?.trial_expiry || null;

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

    // Send trial extension email if status is 'active' and trial was extended
    if (account_status === 'active' && trial_expiry_date && consumerInfo) {
      const newTrialExpiry = updatedConsumer?.trial_expiry || null;
      
      if (oldTrialExpiry && newTrialExpiry && consumerInfo.email && consumerInfo.full_name) {
        try {
          // Calculate extension days
          const oldDate = new Date(oldTrialExpiry);
          const newDate = new Date(newTrialExpiry);
          const extensionDays = Math.ceil((newDate - oldDate) / (1000 * 60 * 60 * 24));
          
          if (extensionDays > 0) {
            await sendTrialExtensionEmail({
              email: consumerInfo.email,
              full_name: consumerInfo.full_name,
              new_trial_date: newTrialExpiry,
              extension_days: extensionDays,
            });
            console.log('✅ Trial extension email sent to:', consumerInfo.email);
          } else if (oldTrialExpiry !== newTrialExpiry) {
            // Trial period changed but not extended (could be reduced or set for first time)
            await sendTrialPeriodChangeEmail({
              email: consumerInfo.email,
              full_name: consumerInfo.full_name,
              old_trial_date: oldTrialExpiry,
              new_trial_date: newTrialExpiry,
            });
            console.log('✅ Trial period change email sent to:', consumerInfo.email);
          }
        } catch (emailError) {
          console.error('❌ Error sending trial email:', emailError);
          // Continue anyway - don't fail the update if email fails
        }
      } else if (!oldTrialExpiry && newTrialExpiry && consumerInfo.email && consumerInfo.full_name) {
        // First time setting trial expiry
        try {
          await sendTrialPeriodChangeEmail({
            email: consumerInfo.email,
            full_name: consumerInfo.full_name,
            old_trial_date: 'Not set',
            new_trial_date: newTrialExpiry,
          });
          console.log('✅ Trial period set email sent to:', consumerInfo.email);
        } catch (emailError) {
          console.error('❌ Error sending trial email:', emailError);
        }
      }
    }

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

