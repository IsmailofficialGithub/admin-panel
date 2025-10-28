import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { supabase, supabaseAdmin } from '../config/database.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { generatePassword } from '../utils/helpers.js';

const router = express.Router();

/**
 * @route   GET /api/consumers
 * @desc    Get all consumers (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: consumers, error } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('role', 'consumer')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      count: consumers.length,
      data: consumers
    });
  } catch (error) {
    console.error('Get consumers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/consumers/:id
 * @desc    Get consumer by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: consumer, error } = await supabase
      .from('profiles')
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
});

/**
 * @route   PUT /api/consumers/:id
 * @desc    Update consumer (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, trial_expiry_date } = req.body;

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
});

/**
 * @route   DELETE /api/consumers/:id
 * @desc    Delete consumer (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
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
});

/**
 * @route   POST /api/consumers/:id/reset-password
 * @desc    Reset consumer password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    c

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
});

export default router;

