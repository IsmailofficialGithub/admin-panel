import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../services/emailService.js';
import { generatePassword } from '../../utils/helpers.js';
import { logActivity, getActorInfo, getClientIp, getUserAgent } from '../../services/activityLogger.js';

/**
 * Resellers Controller
 * Handles reseller-related operations
 */

/**
 * Get all resellers with search (admin only)
 * @route   GET /api/resellers?search=john
 * @access  Private (Admin)
 */
export const getAllResellers = async (req, res) => {
  try {
    const { search } = req.query;

    console.log('🔍 Searching resellers with:', { search });

    // Start building the query
    let query = supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('role', 'reseller');

    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      // Search in full_name and email
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false });

    const { data: resellers, error } = await query;

    if (error) {
      console.error('❌ Error fetching resellers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${resellers.length} resellers`);

    // Get default commission
    const { data: defaultSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    const defaultCommission = defaultSetting ? parseFloat(defaultSetting.setting_value) : 10.00;

    // Get commission data for all resellers
    const resellerIds = resellers.map(r => r.user_id);
    const { data: profilesWithCommission } = await supabaseAdmin
      .from('profiles')
      .select('user_id, commission_rate, commission_updated_at')
      .in('user_id', resellerIds);

    const commissionMap = new Map();
    if (profilesWithCommission) {
      profilesWithCommission.forEach(profile => {
        commissionMap.set(profile.user_id, {
          commission_rate: profile.commission_rate,
          commission_updated_at: profile.commission_updated_at
        });
      });
    }

    // Gather each reseller's referred customer count and commission
    const resellerWithCounts = await Promise.all(
      resellers.map(async function (reseller) {
        // For each reseller, count the number of users referred by them
        const { count, error: referredError } = await supabase
          .from('auth_role_with_profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('referred_by', reseller.user_id)
          .eq('role', 'consumer');

        // Get commission data
        const commissionData = commissionMap.get(reseller.user_id);
        const customCommission = commissionData?.commission_rate ? parseFloat(commissionData.commission_rate) : null;
        const effectiveCommission = customCommission !== null ? customCommission : defaultCommission;
        const commissionType = customCommission !== null ? 'custom' : 'default';

        // Use function syntax so `this` can work inside object if needed
        return Object.assign({}, reseller, {
          referred_count: referredError ? 0 : (typeof count === 'number' ? count : 0),
          commission_rate: effectiveCommission,
          commission_type: commissionType,
          custom_commission: customCommission,
          default_commission: defaultCommission,
          commission_updated_at: commissionData?.commission_updated_at || null
        });
      })
    );
    console.log("resellerWithCounts", resellerWithCounts);

    res.json({
      success: true,
      count: resellerWithCounts.length,
      data: resellerWithCounts,
      search: search || ''
    });
  } catch (error) {
    console.error('Get resellers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get all consumers referred by a specific user/reseller (admin only)
 * @route   GET /api/resellers/:id/referred-consumers
 * @access  Private (Admin)
 */
export const getReferredConsumers = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📋 Fetching referred consumers for user ID:', id);

    const { data: consumers, error } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('referred_by', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referred consumers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${consumers.length} consumers referred by user ${id}`);

    res.json({
      success: true,
      count: consumers.length,
      data: consumers
    });
  } catch (error) {
    console.error('Get referred consumers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get reseller by ID
 * @route   GET /api/resellers/:id
 * @access  Private (Admin)
 */
export const getResellerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: reseller, error } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    // Get default commission
    const { data: defaultSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    const defaultCommission = defaultSetting ? parseFloat(defaultSetting.setting_value) : 10.00;
    const customCommission = reseller.commission_rate ? parseFloat(reseller.commission_rate) : null;
    const effectiveCommission = customCommission !== null ? customCommission : defaultCommission;
    const commissionType = customCommission !== null ? 'custom' : 'default';

    res.json({
      success: true,
      data: {
        ...reseller,
        commission_rate: effectiveCommission,
        commission_type: commissionType,
        custom_commission: customCommission,
        default_commission: defaultCommission
      }
    });
  } catch (error) {
    console.error('Get reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create new reseller (admin only)
 * @route   POST /api/resellers
 * @access  Private (Admin)
 */
export const createReseller = async (req, res) => {
  try {
    const { email, password, full_name, phone, country, city } = req.body;

    // Validate input
    if (!email || !password || !full_name || !country || !city) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'FullName, Email, password, country, city are required'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Check if admin approval is required for new resellers
    const { getResellerSettings } = await import('../../utils/resellerSettings.js');
    const resellerSettings = await getResellerSettings();
    
    // If admin approval is required, set account_status to 'pending' instead of 'active'
    const accountStatus = resellerSettings.requireResellerApproval ? 'pending' : 'active';

    // Get the user ID of who created this reseller (from token)
    const referred_by = req.user && req.user.id ? req.user.id : null;

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        country: country || '',
        city: city || '',
        role: 'reseller'
      }
    };

    // Only include phone if it's defined
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: createError.message
      });
    }

    // Update user role in profiles table
    // commission_rate is NULL by default (new resellers use default commission)
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: 'reseller',
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: referred_by || null,
      commission_rate: null, // Explicitly set to NULL to use default
      commission_updated_at: null,
      account_status: accountStatus // Set based on approval requirement
    };

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([profileData]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password
      });
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: newUser.user.id,
      actionType: 'create',
      tableName: 'profiles',
      changedFields: profileData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'reseller',
        phone: phone || null,
        country: country || null,
        city: city || null,
      }
    });
  } catch (error) {
    console.error('Error creating reseller:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
  }
};

/**
 * Update reseller (admin only)
 * @route   PUT /api/resellers/:id
 * @access  Private (Admin)
 */
export const updateReseller = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, country, city } = req.body;

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

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update'
      });
    }

    console.log("updateData", updateData);

    // Get old data for logging changed fields
    const { data: oldReseller } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    const { data: updatedReseller, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'reseller')
      .select()
      .maybeSingle();

    console.log("updatedReseller", updatedReseller);

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    // Log activity - track changed fields
    const changedFields = {};
    Object.keys(updateData).forEach(key => {
      if (oldReseller && oldReseller[key] !== updateData[key]) {
        changedFields[key] = {
          old: oldReseller[key],
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

    res.json({
      success: true,
      message: 'Reseller updated successfully',
      data: updatedReseller,
      country: country || null,
      city: city || null,
      phone: phone || null,
    });
  } catch (error) {
    console.error('Update reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete reseller (admin only)
 * @route   DELETE /api/resellers/:id
 * @access  Private (Admin)
 */
export const deleteReseller = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reseller exists
    const { data: reseller, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (fetchError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
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
      changedFields: reseller || null,
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
      }
    }

    res.json({
      success: true,
      message: 'Reseller deleted successfully'
    });
  } catch (error) {
    console.error('Delete reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Reset reseller password (admin only)
 * @route   POST /api/resellers/:id/reset-password
 * @access  Private (Admin)
 */
export const resetResellerPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError) {
      console.error("Error fetching user from auth:", userError);
    }

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
    }

    res.json({
      success: true,
      message: 'Password reset successfully. Email sent to reseller.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get all consumers created by the logged-in reseller
 * @route   GET /api/resellers/my-consumers
 * @access  Private (Reseller)
 */
export const getMyConsumers = async (req, res) => {
  try {
    const resellerId = req.user.id;


    const { data: consumers, error } = await supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, phone, trial_expiry, referred_by, created_at, updated_at, country, city')
      .eq('role', 'consumer')
      .eq('referred_by', resellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consumers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${consumers.length} consumers for reseller ${resellerId}`);

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
      data: consumersWithProducts
    });
  } catch (error) {
    console.error('Get my consumers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create new consumer (referred by reseller)
 * @route   POST /api/resellers/my-consumers
 * @access  Private (Reseller)
 */
export const createMyConsumer = async (req, res) => {
  try {
    const resellerId = req.user.id;
    const { email, password, full_name, phone, trial_expiry_date, country, city, subscribed_products } = req.body;

    console.log('👤 Reseller creating consumer:', { resellerId, email, subscribed_products });

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'FullName, Email, password are required'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Check max consumers per reseller limit
    const { getResellerSettings } = await import('../../utils/resellerSettings.js');
    const resellerSettings = await getResellerSettings();
    
    if (resellerSettings.maxConsumersPerReseller !== null && resellerSettings.maxConsumersPerReseller > 0) {
      // Count current consumers for this reseller
      const { count: currentConsumerCount, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', resellerId)
        .eq('role', 'consumer');

      if (countError) {
        console.error('Error counting consumers:', countError);
      } else if (currentConsumerCount >= resellerSettings.maxConsumersPerReseller) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Maximum consumers limit reached. You can only have ${resellerSettings.maxConsumersPerReseller} consumer(s).`
        });
      }
    }

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'consumer',
        country: country || '',
        city: city || '',
      }
    };

    // Only include phone if it's defined
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(400).json({
        error: 'Bad Request',
        message: createError.message
      });
    }

    // Update user role in profiles table with referred_by set to reseller's ID
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: 'consumer',
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: resellerId
    };

    // Add trial_expiry if provided
    if (trial_expiry_date) {
      profileData.trial_expiry = new Date(trial_expiry_date);
    }

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([profileData]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: newUser.user.id,
      actionType: 'create',
      tableName: 'profiles',
      changedFields: profileData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Store product access in user_product_access table
    if (subscribed_products && Array.isArray(subscribed_products) && subscribed_products.length > 0) {
      try {
        const productAccessRecords = subscribed_products.map(productId => ({
          user_id: newUser.user.id,
          product_id: productId
        }));

        const { error: productAccessError } = await supabaseAdmin
          .from('user_product_access')
          .insert(productAccessRecords);

        if (productAccessError) {
          console.error('Error inserting product access:', productAccessError);
          // Don't fail the request, just log the error
        } else {
          console.log(`✅ Stored ${productAccessRecords.length} product access records in user_product_access`);
        }
      } catch (productAccessErr) {
        console.error('Error storing product access:', productAccessErr);
        // Don't fail the request if product access storage fails
      }
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email,
        password,
        full_name
      });
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    console.log('✅ Consumer created successfully by reseller:', resellerId);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'consumer',
        referred_by: resellerId
      },
      message: 'Consumer created successfully'
    });
  } catch (error) {
    console.error('Create consumer error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update consumer created by reseller
 * @route   PUT /api/resellers/my-consumers/:id
 * @access  Private (Reseller)
 */
export const updateMyConsumer = async (req, res) => {
  try {
    const { id } = req.params;
    const resellerId = req.user.id;
    const { full_name, phone, trial_expiry_date, country, city } = req.body;

    console.log('📝 Reseller updating consumer:', { resellerId, consumerId: id });

    // First, verify that this consumer belongs to this reseller
    const { data: consumer, error: checkError } = await supabase
      .from('profiles')
      .select('referred_by, role')
      .eq('user_id', id)
      .single();

    if (checkError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Check ownership
    if (consumer.referred_by !== resellerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update consumers you created'
      });
    }

    // Check role
    if (consumer.role !== 'consumer') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only update consumers'
      });
    }

    // Get old data for logging changed fields
    const { data: oldConsumer } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (city !== undefined) updateData.city = city;
    if (trial_expiry_date !== undefined) {
      if (trial_expiry_date) {
        updateData.trial_expiry = new Date(trial_expiry_date);
      } else {
        updateData.trial_expiry = null;
      }
    }

    // Extract subscribed_products from request body if provided
    const { subscribed_products } = req.body;
    console.log('subscribed_products', subscribed_products);

    if (Object.keys(updateData).length === 0 && subscribed_products === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update'
      });
    }

    const { data: updatedConsumer, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating consumer:', error);
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

    console.log('✅ Consumer updated successfully');

    res.json({
      success: true,
      user: updatedConsumer,
      message: 'Consumer updated successfully'
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
 * Delete consumer created by reseller
 * @route   DELETE /api/resellers/my-consumers/:id
 * @access  Private (Reseller)
 */
export const deleteMyConsumer = async (req, res) => {
  try {
    const { id } = req.params;
    const resellerId = req.user.id;

    console.log('🗑️ Reseller deleting consumer:', { resellerId, consumerId: id });

    // First, verify that this consumer belongs to this reseller
    const { data: consumer, error: checkError } = await supabase
      .from('profiles')
      .select('referred_by, role')
      .eq('user_id', id)
      .single();

    if (checkError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Check ownership
    if (consumer.referred_by !== resellerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete consumers you created'
      });
    }

    // Check role
    if (consumer.role !== 'consumer') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only delete consumers'
      });
    }

    // Get full consumer data before deletion for logging
    const { data: fullConsumer } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    // Log activity BEFORE deletion to avoid foreign key constraint violation
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'delete',
      tableName: 'profiles',
      changedFields: fullConsumer || consumer || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Delete from profiles table
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', id);

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete consumer profile'
      });
    }

    // Delete from auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return res.status(500).json({
        error: 'Partial Delete',
        message: 'Consumer profile deleted but auth deletion failed'
      });
    }

    console.log('✅ Consumer deleted successfully');

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
 * Reset password for consumer created by reseller
 * @route   POST /api/resellers/my-consumers/:id/reset-password
 * @access  Private (Reseller)
 */
export const resetMyConsumerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const resellerId = req.user.id;

    console.log('🔑 Reseller resetting consumer password:', { resellerId, consumerId: id });

    // First, verify that this consumer belongs to this reseller
    const { data: consumer, error: checkError } = await supabase
      .from('profiles')
      .select('referred_by, role, full_name')
      .eq('user_id', id)
      .single();

    if (checkError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Check ownership
    if (consumer.referred_by !== resellerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only reset passwords for consumers you created'
      });
    }

    // Check role
    if (consumer.role !== 'consumer') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only reset password for consumers'
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
      console.error('Error updating password:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to reset password'
      });
    }

    // Get user email for sending reset email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);

    // Send password reset email
    if (authUser?.user?.email) {
      try {
        await sendPasswordResetEmail({
          email: authUser.user.email,
          new_password: newPassword,
          full_name: consumer.full_name || 'User'
        });
        console.log('✅ Password reset email sent with generated password');
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    console.log('✅ Password reset successfully');

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

/**
 * Create new consumer (admin only)
 * @route   POST /api/resellers/create-consumer
 * @access  Private (Admin)
 */
export const createConsumerAdmin = async (req, res) => {
  try {
    const { email, password, full_name, phone, trial_expiry_date, country, city, referred_by, subscribed_products } = req.body;

    console.log('👤 Admin creating consumer:', { email, referred_by, subscribed_products });

    // Validate input
    if (!email || !password || !full_name || !country || !city) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'FullName, Email, password, country, city are required'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Get referred_by from request body or from token (whoever is creating this consumer)
    let finalReferredBy = referred_by;
    
    // If referred_by is not provided in body, use the creator's ID from token
    if (!finalReferredBy && req.user && req.user.id) {
      finalReferredBy = req.user.id;
    }

    // If referred_by is provided, verify the reseller exists (only if explicitly provided in body)
    let isReferredByReseller = false;
    if (referred_by && referred_by !== req.user?.id) {
      const { data: reseller, error: resellerError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', referred_by)
        .eq('role', 'reseller')
        .single();

      if (resellerError || !reseller) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid referred_by: Reseller not found'
        });
      }
      isReferredByReseller = true;
    }

    // Check max consumers per reseller limit if referred_by is a reseller
    if (isReferredByReseller) {
      const { getResellerSettings } = await import('../../utils/resellerSettings.js');
      const resellerSettings = await getResellerSettings();
      
      if (resellerSettings.maxConsumersPerReseller !== null && resellerSettings.maxConsumersPerReseller > 0) {
        // Count current consumers for this reseller
        const { count: currentConsumerCount, error: countError } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', referred_by)
          .eq('role', 'consumer');

        if (countError) {
          console.error('Error counting consumers:', countError);
        } else if (currentConsumerCount >= resellerSettings.maxConsumersPerReseller) {
          return res.status(403).json({
            error: 'Forbidden',
            message: `Maximum consumers limit reached for this reseller. The reseller can only have ${resellerSettings.maxConsumersPerReseller} consumer(s).`
          });
        }
      }
    }

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'consumer',
        country: country || '',
        city: city || '',
      }
    };

    // Only include phone if it's defined
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: createError.message
      });
    }

    // Update user role in profiles table
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: 'consumer',
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: finalReferredBy || null,
    };

    // Add trial_expiry if provided
    if (trial_expiry_date) {
      profileData.trial_expiry = new Date(trial_expiry_date);
    }

    // Note: subscribed_products is NOT stored in profiles table
    // It's only stored in user_product_access table (see below)

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([profileData]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: newUser.user.id,
      actionType: 'create',
      tableName: 'profiles',
      changedFields: profileData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Store product access in user_product_access table
    if (subscribed_products && Array.isArray(subscribed_products) && subscribed_products.length > 0) {
      try {
        const productAccessRecords = subscribed_products.map(productId => ({
          user_id: newUser.user.id,
          product_id: productId
        }));

        const { error: productAccessError } = await supabaseAdmin
          .from('user_product_access')
          .insert(productAccessRecords);

        if (productAccessError) {
          console.error('Error inserting product access:', productAccessError);
          // Don't fail the request, just log the error
        } else {
          console.log(`✅ Stored ${productAccessRecords.length} product access records in user_product_access`);
        }
      } catch (productAccessErr) {
        console.error('Error storing product access:', productAccessErr);
        // Don't fail the request if product access storage fails
      }
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password
      });
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
    }

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'consumer',
        phone: phone || null,
        country: country || null,
        city: city || null,
      }
    });
  } catch (error) {
    console.error('Error creating consumer:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
  }
};

/**
 * Update reseller account status (admin only)
 * @route   PATCH /api/resellers/:id/account-status
 * @access  Private (Admin)
 */
export const updateResellerAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { account_status } = req.body;

    // Validate account_status
    const validStatuses = ['active', 'deactive'];
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

    console.log(`🔄 Updating reseller ${id} account status to:`, account_status);

    // Check if reseller exists
    const { data: resellerProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (fetchError || !resellerProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    // Update account_status in profiles table
    const { data: updatedReseller, error: updateError } = await supabase
      .from('profiles')
      .update({
        account_status: account_status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .eq('role', 'reseller')
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating reseller account status:', updateError);
      return res.status(400).json({
        error: 'Bad Request',
        message: updateError.message
      });
    }

    console.log(`✅ Reseller account status updated successfully`);

    res.json({
      success: true,
      message: `Reseller account status updated to ${account_status}`,
      data: updatedReseller
    });
  } catch (error) {
    console.error('Update reseller account status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};



/**
 * Get all referred resellers (reseller can see their own, admin sees all)
 * @route   GET /api/resellers/referred-resellers
 * @access  Private (Reseller and Admin)
 */
export const getAllReferredResellers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', currentUserId)
      .single();

    const isAdmin = currentUserProfile?.role === 'admin';

    // Build query
    let query = supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('role', 'reseller');

    // If reseller, only show their referred resellers
    if (!isAdmin) {
      query = query.eq('referred_by', currentUserId);
    }

    const { data: resellers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referred resellers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      count: resellers.length,
      data: resellers
    });
  } catch (error) {
    console.error('Get all referred resellers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get reseller's own resellers
 * @route   GET /api/resellers/my-resellers
 * @access  Private (Reseller)
 */
export const getMyResellers = async (req, res) => {
  try {
    const resellerId = req.user.id;
    const { search } = req.query;

    console.log('🔍 Fetching my resellers with:', { resellerId, search });

    // 1️⃣ Build query: get sub-resellers referred by this reseller
    let query = supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('role', 'reseller')
      .eq('referred_by', resellerId);

    // Optional search
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false });

    const { data: resellers, error } = await query;

    if (error) {
      console.error('❌ Error fetching my resellers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${resellers.length} sub-resellers for reseller ${resellerId}`);

    // 2️⃣ Get default commission
    const { data: defaultSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    const defaultCommission = defaultSetting ? parseFloat(defaultSetting.setting_value) : 10.00;

    // 3️⃣ Get custom commission info for all found sub-resellers
    const resellerIds = resellers.map(r => r.user_id);
    const { data: profilesWithCommission } = await supabaseAdmin
      .from('profiles')
      .select('user_id, commission_rate, commission_updated_at')
      .in('user_id', resellerIds);

    const commissionMap = new Map();
    if (profilesWithCommission) {
      profilesWithCommission.forEach(profile => {
        commissionMap.set(profile.user_id, {
          commission_rate: profile.commission_rate,
          commission_updated_at: profile.commission_updated_at
        });
      });
    }

    // 4️⃣ Build enriched reseller data
    const resellerWithCounts = await Promise.all(
      resellers.map(async (reseller) => {
        // Count consumers referred by this sub-reseller
        const { count, error: referredError } = await supabase
          .from('auth_role_with_profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('referred_by', reseller.user_id)
          .eq('role', 'consumer');

        // Commission info
        const commissionData = commissionMap.get(reseller.user_id);
        const customCommission = commissionData?.commission_rate ? parseFloat(commissionData.commission_rate) : null;
        const effectiveCommission = customCommission !== null ? customCommission : defaultCommission;
        const commissionType = customCommission !== null ? 'custom' : 'default';

        // Attach everything
        return {
          ...reseller,
          referred_count: referredError ? 0 : (typeof count === 'number' ? count : 0),
          commission_rate: effectiveCommission,
          commission_type: commissionType,
          custom_commission: customCommission,
          default_commission: defaultCommission,
          commission_updated_at: commissionData?.commission_updated_at || null
        };
      })
    );

    // 5️⃣ Response
    res.json({
      success: true,
      count: resellerWithCounts.length,
      data: resellerWithCounts,
      search: search || ''
    });

  } catch (error) {
    console.error('Get my resellers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};


/**
 * Get reseller by ID (reseller can only see their own resellers)
 * @route   GET /api/resellers/my-resellers/:id
 * @access  Private (Reseller)
 */
export const getMyResellerById = async (req, res) => {
  try {
    const { id } = req.params;
    const resellerId = req.user.id;

    // Verify this reseller belongs to the current reseller
    const { data: reseller, error: checkError } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .eq('referred_by', resellerId)
      .single();

    if (checkError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found or you do not have permission to view it'
      });
    }

    res.json({
      success: true,
      data: reseller
    });
  } catch (error) {
    console.error('Get my reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update reseller (reseller can only update their own resellers)
 * @route   PUT /api/resellers/my-resellers/:id
 * @access  Private (Reseller)
 */
export const updateMyReseller = async (req, res) => {
  try {
    const { id } = req.params;
    const resellerId = req.user.id;
    const { full_name, phone, country, city } = req.body;

    // Verify this reseller belongs to the current reseller
    const { data: reseller, error: checkError } = await supabase
      .from('profiles')
      .select('referred_by, role')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (checkError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    if (reseller.referred_by !== resellerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update resellers you created'
      });
    }

    // Validate required fields
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

    // Get old data for logging
    const { data: oldReseller } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    const { data: updatedReseller, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'reseller')
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    // Log activity
    const changedFields = {};
    Object.keys(updateData).forEach(key => {
      if (oldReseller && oldReseller[key] !== updateData[key]) {
        changedFields[key] = {
          old: oldReseller[key],
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

    res.json({
      success: true,
      message: 'Reseller updated successfully',
      data: updatedReseller
    });
  } catch (error) {
    console.error('Update my reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create reseller (reseller can create other resellers)
 * @route   POST /api/resellers/my-resellers
 * @access  Private (Reseller)
 */
export const createMyReseller = async (req, res) => {
  try {
    const resellerId = req.user.id;
    const { email, password, full_name, phone, country, city } = req.body;

    // Validate input
    if (!email || !password || !full_name || !country || !city) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'FullName, Email, password, country, city are required'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Check if admin approval is required for new resellers
    const { getResellerSettings } = await import('../../utils/resellerSettings.js');
    const resellerSettings = await getResellerSettings();
    
    // If admin approval is required, set account_status to 'pending' instead of 'active'
    const accountStatus = resellerSettings.requireResellerApproval ? 'pending' : 'active';

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        country: country || '',
        city: city || '',
        role: 'reseller'
      }
    };

    // Only include phone if it's defined
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: createError.message
      });
    }

    // Update user role in profiles table with referred_by set to reseller's ID
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: 'reseller',
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: resellerId, // Set to current reseller
      commission_rate: null,
      commission_updated_at: null,
      account_status: accountStatus
    };

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([profileData]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password
      });
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: newUser.user.id,
      actionType: 'create',
      tableName: 'profiles',
      changedFields: profileData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'reseller',
        phone: phone || null,
        country: country || null,
        city: city || null,
      }
    });
  } catch (error) {
    console.error('Error creating reseller:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
  }
};

/**
 * Delete reseller (reseller can only delete their own resellers)
 * @route   DELETE /api/resellers/my-resellers/:id
 * @access  Private (Reseller)
 */
export const deleteMyReseller = async (req, res) => {
  try {
    const { id } = req.params;
    const resellerId = req.user.id;

    // Verify this reseller belongs to the current reseller
    const { data: reseller, error: checkError } = await supabase
      .from('profiles')
      .select('referred_by, role')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (checkError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    if (reseller.referred_by !== resellerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete resellers you created'
      });
    }

    // Get full reseller data before deletion for logging
    const { data: fullReseller } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    // Log activity BEFORE deletion
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'delete',
      tableName: 'profiles',
      changedFields: fullReseller || reseller || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Delete from profiles table
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', id);

    if (deleteProfileError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: deleteProfileError.message
      });
    }

    // Delete from auth
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.error('Error deleting user from auth:', authError);
      }
    }

    res.json({
      success: true,
      message: 'Reseller deleted successfully'
    });
  } catch (error) {
    console.error('Delete my reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

