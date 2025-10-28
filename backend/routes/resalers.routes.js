import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { supabase, supabaseAdmin } from '../config/database.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { generatePassword } from '../utils/helpers.js';

const router = express.Router();

/**
 * @route   GET /api/resalers
 * @desc    Get all resalers (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: resalers, error } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('role', 'resaler')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      count: resalers.length,
      data: resalers
    });
  } catch (error) {
    console.error('Get resalers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * ==========================================
 * RESALER'S OWN CONSUMERS MANAGEMENT ROUTES
 * (Must come BEFORE /:id routes)
 * ==========================================
 */

/**
 * @route   GET /api/resalers/my-consumers
 * @desc    Get all consumers created by the logged-in resaler
 * @access  Private (Resaler)
 */
router.get('/my-consumers', authenticate, async (req, res) => {
  try {
    const resalerId = req.user.id; // Get resaler's user ID from auth middleware
    
    console.log('📋 Fetching consumers for resaler:', resalerId);

    const { data: consumers, error } = await supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, phone, trial_expiry, referred_by, created_at, updated_at')
      .eq('role', 'consumer')
      .eq('referred_by', resalerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consumers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${consumers.length} consumers for resaler ${resalerId}`);

    res.json({
      success: true,
      count: consumers.length,
      data: consumers
    });
  } catch (error) {
    console.error('Get my consumers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/resalers/my-consumers
 * @desc    Create new consumer (referred by resaler)
 * @access  Private (Resaler)
 */
router.post('/my-consumers', authenticate, async (req, res) => {
  try {
    const resalerId = req.user.id; // Get resaler's user ID from auth middleware
    const { email, password, full_name, phone, trial_expiry_date } = req.body;

    console.log('👤 Resaler creating consumer:', { resalerId, email });

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

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'consumer'
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

    // Update user role in profiles table with referred_by set to resaler's ID
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: 'consumer',
      phone: phone || null,
      referred_by: resalerId // SET REFERRED_BY TO RESALER'S ID
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
      // Don't fail the request if email fails
    }

    console.log('✅ Consumer created successfully by resaler:', resalerId);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'consumer',
        referred_by: resalerId
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
});

/**
 * @route   PUT /api/resalers/my-consumers/:id
 * @desc    Update consumer created by resaler
 * @access  Private (Resaler)
 */
router.put('/my-consumers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const resalerId = req.user.id;
    const { full_name, phone, trial_expiry_date } = req.body;

    console.log('📝 Resaler updating consumer:', { resalerId, consumerId: id });

    // First, verify that this consumer belongs to this resaler
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
    if (consumer.referred_by !== resalerId) {
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

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (trial_expiry_date !== undefined) {
      // Convert to timestamp if provided
      if (trial_expiry_date) {
        updateData.trial_expiry = new Date(trial_expiry_date);
      } else {
        updateData.trial_expiry = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
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
});

/**
 * @route   DELETE /api/resalers/my-consumers/:id
 * @desc    Delete consumer created by resaler
 * @access  Private (Resaler)
 */
router.delete('/my-consumers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const resalerId = req.user.id;

    console.log('🗑️ Resaler deleting consumer:', { resalerId, consumerId: id });

    // First, verify that this consumer belongs to this resaler
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
    if (consumer.referred_by !== resalerId) {
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
      // Profile is already deleted, but auth deletion failed
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
});

/**
 * @route   POST /api/resalers/my-consumers/:id/reset-password
 * @desc    Reset password for consumer created by resaler
 * @access  Private (Resaler)
 */
router.post('/my-consumers/:id/reset-password', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const resalerId = req.user.id;

    console.log('🔑 Resaler resetting consumer password:', { resalerId, consumerId: id });

    // First, verify that this consumer belongs to this resaler
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
    if (consumer.referred_by !== resalerId) {
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
          password: newPassword,
          full_name: consumer.full_name || 'User'
        });
        console.log('✅ Password reset email sent');
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request if email fails
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
});

/**
 * @route   GET /api/resalers/:id
 * @desc    Get resaler by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: resaler, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'resaler')
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Resaler not found'
      });
    }

    res.json({
      success: true,
      data: resaler
    });
  } catch (error) {
    console.error('Get resaler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/resalers
 * @desc    Create new resaler (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

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

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'resaler'
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
      role: 'resaler',
      phone: phone || null,
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
      // Continue anyway - user is created
    }

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'resaler'
      }
    });
    } catch (error) {
        console.error('Error creating resaler:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/resalers/:id
 * @desc    Update resaler (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update'
      });
    }

    console.log("updateData", updateData);

    const { data: updatedResaler, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'resaler')
      .select()
      .maybeSingle();
      
    console.log("updatedResaler", updatedResaler);

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Resaler updated successfully',
      data: updatedResaler
    });
  } catch (error) {
    console.error('Update resaler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/resalers/:id
 * @desc    Delete resaler (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if resaler exists
    const { data: resaler, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'resaler')
      .single();

    if (fetchError || !resaler) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Resaler not found'
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
      message: 'Resaler deleted successfully'
    });
  } catch (error) {
    console.error('Delete resaler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/resalers/:id/reset-password
 * @desc    Reset resaler password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
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
      message: 'Password reset successfully. Email sent to resaler.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/resalers/create-consumer
 * @desc    Create new consumer (admin only)
 * @access  Private (Admin)
 */
router.post('/create-consumer', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, phone, trial_expiry_date } = req.body;

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

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'consumer'
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
      phone: phone || null
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

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email,
        password,
        full_name
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'consumer'
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
});

/**
 * ==========================================
 * RESALER'S OWN CONSUMERS MANAGEMENT ROUTES
 * ==========================================
 */

/**
 * @route   GET /api/resalers/my-consumers
 * @desc    Get all consumers created by the logged-in resaler
 * @access  Private (Resaler)
 */
router.get('/my-consumers', authenticate, async (req, res) => {
  try {
    const resalerId = req.user.id; // Get resaler's user ID from auth middleware
    
    console.log('📋 Fetching consumers for resaler:', resalerId);

    const { data: consumers, error } = await supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, phone, trial_expiry, referred_by, created_at, updated_at')
      .eq('role', 'consumer')
      .eq('referred_by', resalerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consumers:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${consumers.length} consumers for resaler ${resalerId}`);

    res.json({
      success: true,
      count: consumers.length,
      data: consumers
    });
  } catch (error) {
    console.error('Get my consumers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/resalers/my-consumers
 * @desc    Create new consumer (referred by resaler)
 * @access  Private (Resaler)
 */
router.post('/my-consumers', authenticate, async (req, res) => {
  try {
    const resalerId = req.user.id; // Get resaler's user ID from auth middleware
    const { email, password, full_name, phone, trial_expiry_date } = req.body;

    console.log('👤 Resaler creating consumer:', { resalerId, email });

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

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: 'consumer'
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

    // Update user role in profiles table with referred_by set to resaler's ID
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: 'consumer',
      phone: phone || null,
      referred_by: resalerId // SET REFERRED_BY TO RESALER'S ID
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
      // Don't fail the request if email fails
    }

    console.log('✅ Consumer created successfully by resaler:', resalerId);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: 'consumer',
        referred_by: resalerId
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
});

/**
 * @route   PUT /api/resalers/my-consumers/:id
 * @desc    Update consumer created by resaler
 * @access  Private (Resaler)
 */
router.put('/my-consumers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const resalerId = req.user.id;
    const { full_name, phone, trial_expiry_date } = req.body;

    console.log('📝 Resaler updating consumer:', { resalerId, consumerId: id });

    // First, verify that this consumer belongs to this resaler
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
    if (consumer.referred_by !== resalerId) {
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

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (trial_expiry_date !== undefined) {
      // Convert to timestamp if provided
      if (trial_expiry_date) {
        updateData.trial_expiry = new Date(trial_expiry_date);
      } else {
        updateData.trial_expiry = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
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
});

/**
 * @route   DELETE /api/resalers/my-consumers/:id
 * @desc    Delete consumer created by resaler
 * @access  Private (Resaler)
 */
router.delete('/my-consumers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const resalerId = req.user.id;

    console.log('🗑️ Resaler deleting consumer:', { resalerId, consumerId: id });

    // First, verify that this consumer belongs to this resaler
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
    if (consumer.referred_by !== resalerId) {
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
      // Profile is already deleted, but auth deletion failed
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
});

/**
 * @route   POST /api/resalers/my-consumers/:id/reset-password
 * @desc    Reset password for consumer created by resaler
 * @access  Private (Resaler)
 */
router.post('/my-consumers/:id/reset-password', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const resalerId = req.user.id;

    console.log('🔑 Resaler resetting consumer password:', { resalerId, consumerId: id });

    // First, verify that this consumer belongs to this resaler
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
    if (consumer.referred_by !== resalerId) {
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
          password: newPassword,
          full_name: consumer.full_name || 'User'
        });
        console.log('✅ Password reset email sent');
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request if email fails
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
});

export default router;
