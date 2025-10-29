import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../services/emailService.js';
import { generatePassword } from '../../utils/helpers.js';

/**
 * Users Controller
 * Handles user-related operations
 */

/**
 * Get all users with search (admin only)
 * @route   GET /api/users?search=john
 * @access  Private (Admin)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;

    console.log('🔍 Searching users with:', { search });

    // Start building the query
    let query = supabase
      .from('auth_role_with_profiles')
      .select('*')
      .neq('role', 'consumer')
      .neq('role', 'reseller');

    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      // Search in full_name and email
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order by created_at
    query = query.order('created_at', { ascending: false });

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Error fetching users:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${users.length} users`);

    res.json({
      success: true,
      count: users.length,
      data: users,
      search: search || ''
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('auth_role_with_profiles')
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
};

/**
 * Create new user (admin only)
 * @route   POST /api/users
 * @access  Private (Admin)
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, full_name, role, phone, country, city } = req.body;

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

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: full_name || "",
        country: country || "",
        city: city || "",
        role: role || "user",
      }
    };

    // Only include phone if it's defined
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

    // Update user role in profiles table
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([{
        user_id: newUser.user.id,
        full_name,
        role: role || 'user',
        phone: phone || null,
        country: country || null,
        city: city || null,
      }]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Send custom welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password
      });
      console.log('✅ Custom welcome email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
    }

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        country: country || null,
        city: city || null,
        role: role || 'user',
        phone: phone || null,
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Internal server error'
    });
  }
};

/**
 * Update user (admin only)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, phone, country, city } = req.body;

    // Validate required fields for update
    if (!country || !city || !phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Country, city, and phone are required'
      });
    }

    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (role) updateData.role = role.toLowerCase();
    updateData.phone = phone;
    updateData.country = country;
    updateData.city = city;

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
};

/**
 * Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res) => {
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
};

/**
 * Reset user password (admin only)
 * @route   POST /api/users/:id/reset-password
 * @access  Private (Admin)
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id", id);

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Generate new password
    const newPassword = generatePassword(12);

    // Get user from Supabase Auth
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError) {
      console.error("Error fetching user from auth:", userError);
    }

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

    console.log("profile.email", profile.email);
    console.log("profile.full_name", profile.full_name);
    console.log("newPassword", newPassword);

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
};

/**
 * Create reseller (admin only)
 * @route   POST /api/users/create-reseller
 * @access  Private (Admin)
 */
export const createReseller = async (req, res) => {
  try {
    const { email, password, full_name, role, phone, country, city } = req.body;

    // Validate input
    if (!email || !password || !full_name || !country || !city) {
      return res.status(400).json({
        error: "Bad Request",
        message: "FullName, Email, password, country, city are required",
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: "Configuration Error",
        message: "Admin client not configured",
      });
    }

    // The admin who is sending this request (as "referred_by")
    const referred_by = req.user && req.user.id ? req.user.id : null;

    // Create user with Supabase Admin
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "",
        role: "reseller",
        country: country || "",
        city: city || "",
        referred_by: referred_by || "",
      },
    };

    // Only include phone if it's defined
    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        ...createUserPayload,
        email_confirm: true
      });

    // Explicitly verify the user
    if (newUser?.user && !createError) {
      await supabaseAdmin.auth.admin.updateUserById(newUser.user.id, { email_confirm: true });
    }

    if (createError) {
      return res.status(400).json({
        error: "Bad Request",
        message: createError.message,
      });
    }

    // Update user role in profiles table
    const { error: insertError } = await supabaseAdmin.from("profiles").upsert([
      {
        user_id: newUser.user.id,
        full_name,
        role: "reseller",
        phone: phone || null,
        country: country || null,
        city: city || null,
        referred_by: referred_by || null
      },
    ]);

    if (insertError) {
      console.error("Error inserting profile:", insertError);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "User created but profile insert failed",
      });
    }

    // Send custom welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password,
      });
      console.log("✅ Custom welcome email sent to:", email);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
    }

    res.status(201).json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: role || "user",
        country: country || null,
        city: city || null,
        phone: phone || null,
        referred_by: referred_by || null
      }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Internal server error",
    });
  }
};

