import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { supabase, supabaseAdmin } from '../config/database.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { generatePassword } from '../utils/helpers.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('auth_role_with_profiles')
      .select('*')
      .neq('role', 'consumer')
      .neq('role', 'resaler')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;

    // Validate input - matching Next.js validation
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

    // Create user with Supabase Admin - matching Next.js implementation
    const createUserPayload = {
      email,
      password,
      email_confirm: true, // Confirm email automatically
      user_metadata: { 
        full_name: full_name || ""
      }
    };

    // Only include phone if it's defined (matching Next.js logic)
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: createError.message
      });
    }

    // Update user role in profiles table - matching Next.js implementation
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([{
        user_id: newUser.user.id, // use the new auth user's ID
        full_name,
        role: role || 'user', // default role if not provided
        phone: phone || null
      }]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Send custom welcome email - matching Next.js implementation
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password
      });
      console.log('✅ Custom welcome email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
      // Continue anyway - user is created
    }

    // Return response matching Next.js format
    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: role || 'user'
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin only)
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, phone } = req.body;

    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (role) updateData.role = role.toLowerCase();
    if (phone !== undefined) updateData.phone = phone || null; // Allow clearing phone by passing empty string

    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Delete user with Supabase Admin
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id", id)

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Generate new password
    const newPassword = generatePassword(12);

    // Get user profile for email
    // Get user from Supabase Auth (not profiles)
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError) {
      console.error("Error fetching user from auth:", userError);
    }

    // Assume email and full_name may be under user.user_metadata
    const profile = {
      email: user?.user?.email,
      full_name: user?.user?.user_metadata?.full_name || user?.user?.email?.split('@')[0]
    };


    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Update user password
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

    console.log("profile.email", profile.email)
    console.log("profile.full_name", profile.full_name)
    console.log("newPassword", newPassword)
    // Send password reset email (non-blocking)
    sendPasswordResetEmail({
      email: profile.email,
      full_name: profile.full_name || profile.email.split('@')[0],
      new_password: newPassword
    }).catch(err => console.error('Email send error:', err));

    res.json({
      success: true,
      message: 'Password reset successfully',
      email: profile.email
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});


// create resaler and only admin can create resaler

/**
 * @route   POST /api/users/create-resaler
 * @desc    Create resaler (admin only)
 * @access  Private (Admin)
 */
router.post("/create-resaler", authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;

    // Validate input - matching Next.js validation
    if (!email || !password || !full_name) {
      return res.status(400).json({
        error: "Bad Request",
        message: "FullName, Email, password are required",
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: "Configuration Error",
        message: "Admin client not configured",
      });
    }

    // Create user with Supabase Admin - matching Next.js implementation
    const createUserPayload = {
      email,
      password,
      email_confirm: true, // Confirm email automatically
      user_metadata: {
        full_name: full_name || "",
        role: "resaler",
      },
    };

    // Only include phone if it's defined (matching Next.js logic)
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        ...createUserPayload,
        email_confirm: true
      });

    // Explicitly verify the user (bypass email confirmation so user is "verified" instantly)
    if (newUser?.user && !createError) {
      await supabaseAdmin.auth.admin.updateUserById(newUser.user.id, { email_confirm: true });
    }

    if (createError) {
      return res.status(400).json({
        error: "Bad Request",
        message: createError.message,
      });
    }

    // Update user role in profiles table - matching Next.js implementation
    const { error: insertError } = await supabaseAdmin.from("profiles").upsert([
      {
        user_id: newUser.user.id, // use the new auth user's ID
        full_name,
        role: 'resaler', // default role if not provided
        phone: phone || null,
      },
    ]);

    if (insertError) {
      console.error("Error inserting profile:", insertError);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "User created but profile insert failed",
      });
    }

    // Send custom welcome email - matching Next.js implementation
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password,
      });
      console.log("✅ Custom welcome email sent to:", email);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
      // Continue anyway - user is created
    }

    // Return response matching Next.js format
    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: role || "user",
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Internal server error",
    });
  }
});




export default router;

