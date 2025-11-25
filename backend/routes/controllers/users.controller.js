import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../services/emailService.js';
import { generatePassword } from '../../utils/helpers.js';
import { logActivity, getActorInfo, getClientIp, getUserAgent } from '../../services/activityLogger.js';
import { cacheService } from '../../config/redis.js';
import {
  sanitizeString,
  isValidEmail,
  isValidSearchTerm,
  isValidUUID,
  isValidPhone,
  validatePagination,
  sanitizeObject,
  sanitizeArray
} from '../../utils/validation.js';

// Cache configuration
export const CACHE_TTL = 300; // 5 minutes
export const CACHE_KEYS = {
  ALL_USERS: (search, page, limit) => `users:list:${search || 'all'}_page${page}_limit${limit}`,
  USER_BY_ID: (id) => `users:id:${id}`,
};

// Query timeout in milliseconds
const QUERY_TIMEOUT = 10000; // 10 seconds

// Select only necessary fields for performance
const USER_SELECT_FIELDS = [
  'user_id',
  'email',
  'full_name',
  'role',
  'phone',
  'country',
  'city',
  'account_status',
  'created_at',
  'updated_at'
].join(',');

/**
 * Users Controller
 * Handles user-related operations
 */

/**
 * Get all users with search and pagination (admin only)
 * @route   GET /api/users?search=john&page=1&limit=50
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Pagination support (Performance)
 * 3. Field selection instead of * (Performance)
 * 4. Query timeout (Performance)
 * 5. Better error handling (Security)
 * 6. Data sanitization (Security)
 */
export const getAllUsers = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    const { search, page, limit } = req.query;

    // Validate and sanitize search input
    let searchTerm = '';
    if (search) {
      searchTerm = sanitizeString(search, 100);
      
      // Validate search term contains only safe characters
      if (!isValidSearchTerm(searchTerm)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid search term. Only alphanumeric characters, spaces, @, ., _, and - are allowed.'
        });
      }
    }

    // Validate pagination parameters
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    console.log('🔍 Searching users with:', { 
      search: searchTerm, 
      page: pageNum, 
      limit: limitNum 
    });

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.ALL_USERS(searchTerm, pageNum, limitNum);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for users list');
      return res.json(cachedData);
    }

    console.log('❌ Cache MISS for users list - fetching from database');

    // ========================================
    // 3. OPTIMIZED DATABASE QUERY
    // ========================================
    let query = supabase
      .from('auth_role_with_profiles')
      .select(USER_SELECT_FIELDS, { count: 'exact' }) // Get total count for pagination
      .neq('role', 'consumer')
      .neq('role', 'reseller');

    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1); // Pagination

    // Execute query with timeout protection
    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
    );

    const { data: users, error, count } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]);

    // ========================================
    // 4. ERROR HANDLING (Security)
    // ========================================
    if (error) {
      console.error('❌ Error fetching users:', error);
      // Don't expose internal error details to client (Security)
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to fetch users. Please try again.'
      });
    }

    // ========================================
    // 5. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedUsers = sanitizeArray(users || []);

    console.log(`✅ Found ${sanitizedUsers.length} users (Total: ${count})`);

    // ========================================
    // 6. RESPONSE STRUCTURE
    // ========================================
    const response = {
      success: true,
      count: sanitizedUsers.length,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
      hasMore: offset + limitNum < (count || 0),
      data: sanitizedUsers,
      search: searchTerm || null
    };

    // ========================================
    // 7. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    console.error('Get users error:', error);
    // Don't expose stack traces or internal errors (Security)
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request.'
    });
  }
};

/**
 * Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Field selection instead of * (Performance)
 * 3. Query timeout (Performance)
 * 4. Secure error handling (Security)
 * 5. Data sanitization (Security)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format'
      });
    }

    const cacheKey = CACHE_KEYS.USER_BY_ID(id);

    // Try to get from cache
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for user ${id}`);
      return res.json(cachedData);
    }

    console.log(`❌ Cache MISS for user ${id} - fetching from database`);

    // ========================================
    // 2. OPTIMIZED DATABASE QUERY
    // ========================================
    const queryPromise = supabase
      .from('auth_role_with_profiles')
      .select(USER_SELECT_FIELDS)
      .eq('user_id', id)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
    );

    const { data: user, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]);

    // ========================================
    // 3. ERROR HANDLING (Security)
    // ========================================
    if (error) {
      console.error('❌ Error fetching user:', error);
      // Don't expose internal error details
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // ========================================
    // 4. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedUser = sanitizeObject(user);

    const response = {
      success: true,
      data: sanitizedUser
    };

    // Cache the response
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request.'
    });
  }
};

/**
 * Create new user (admin only)
 * @route   POST /api/users
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Email format validation (Security)
 * 3. Phone number validation (Security)
 * 4. Secure error handling (Security)
 * 5. Data sanitization (Security)
 */
export const createUser = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    let { email, password, full_name, role, phone, country, city } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !country || !city) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'FullName, Email, password, country, city are required'
      });
    }

    // Sanitize and validate email
    email = email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Sanitize full_name
    full_name = sanitizeString(full_name, 255);
    if (!full_name || full_name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Full name must be at least 2 characters long'
      });
    }

    // Sanitize country and city
    country = sanitizeString(country, 100);
    city = sanitizeString(city, 100);

    // Validate and sanitize phone if provided
    if (phone) {
      phone = phone.trim();
      if (!isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid phone number format'
        });
      }
    }

    // Validate role
    const validRoles = ['user', 'admin', 'consumer'];
    if (role && !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    role = role ? role.toLowerCase() : 'user';

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long'
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
      console.error('❌ Error creating user:', createError);
      // Don't expose internal error details
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to create user. Please check your input and try again.'
      });
    }

    // Get the user ID of who created this user (from token)
    const referred_by = req.user && req.user.id ? req.user.id : null;

    // Prepare profile data
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: role || 'user',
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: referred_by || null,
    };

    // If role is consumer, set trial_expiry to 3 days from now and account_status to active
    if (role === 'consumer') {
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 3);
      profileData.trial_expiry = trialExpiry.toISOString();
      profileData.account_status = 'active';
      console.log('✅ Setting 3-day trial for consumer:', profileData.trial_expiry);
    }

    // Update user role in profiles table
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([profileData]);

    if (insertError) {
      console.error('❌ Error inserting profile:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Send custom welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password,
        role: role || 'user'
      });
      console.log('✅ Custom welcome email sent to:', email);
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

    // Invalidate cache - clear all users list cache
    await cacheService.delByPattern('users:list:*');
    console.log('✅ Cache invalidated for users list');

    // ========================================
    // RESPONSE (Sanitized)
    // ========================================
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
    console.error('❌ Error creating user:', error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while creating the user.'
    });
  }
};

/**
 * Update user (admin only)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. UUID validation (Security)
 * 3. Phone validation (Security)
 * 4. Secure error handling (Security)
 * 5. Query timeout (Performance)
 */
export const updateUser = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format'
      });
    }

    let { full_name, role, phone, country, city } = req.body;

    // Validate required fields for update
    if (!country || !city || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Country, city, and phone are required'
      });
    }

    // ========================================
    // 2. SANITIZATION & VALIDATION
    // ========================================
    const updateData = {};
    
    if (full_name) {
      full_name = sanitizeString(full_name, 255);
      if (full_name.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Full name must be at least 2 characters long'
        });
      }
      updateData.full_name = full_name;
    }
    
    if (role) {
      const validRoles = ['user', 'admin', 'consumer'];
      if (!validRoles.includes(role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      updateData.role = role.toLowerCase();
    }
    
    // Validate and sanitize phone
    phone = phone.trim();
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid phone number format'
      });
    }
    updateData.phone = phone;
    
    // Sanitize country and city
    updateData.country = sanitizeString(country, 100);
    updateData.city = sanitizeString(city, 100);

    // ========================================
    // 3. DATABASE QUERY WITH TIMEOUT
    // ========================================
    // Get old data for logging changed fields
    const oldUserPromise = supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
    );

    const { data: oldUser } = await Promise.race([oldUserPromise, timeoutPromise]);

    const updatePromise = supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .select()
      .single();

    const { data: updatedUser, error } = await Promise.race([
      updatePromise,
      timeoutPromise
    ]);

    if (error) {
      console.error('❌ Error updating user:', error);
      // Don't expose internal error details
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to update user. Please try again.'
      });
    }

    // Log activity - track changed fields
    const changedFields = {};
    Object.keys(updateData).forEach(key => {
      if (oldUser && oldUser[key] !== updateData[key]) {
        changedFields[key] = {
          old: oldUser[key],
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

    // Invalidate cache
    await cacheService.del(CACHE_KEYS.USER_BY_ID(id));
    await cacheService.delByPattern('users:list:*');
    console.log('✅ Cache invalidated for user update');

    // ========================================
    // 4. DATA SANITIZATION
    // ========================================
    const sanitizedUser = sanitizeObject(updatedUser);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: sanitizedUser
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while updating the user.'
    });
  }
};

/**
 * Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const deleteUser = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // ========================================
    // 2. GET USER DATA WITH TIMEOUT
    // ========================================
    const getUserPromise = supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
    );

    const { data: deletedUser } = await Promise.race([getUserPromise, timeoutPromise]);

    // Log activity BEFORE deletion to avoid foreign key constraint violation
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'delete',
      tableName: 'profiles',
      changedFields: deletedUser || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // ========================================
    // 3. DELETE USER WITH TIMEOUT
    // ========================================
    const deletePromise = supabaseAdmin.auth.admin.deleteUser(id);
    const deleteTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Delete operation timeout')), QUERY_TIMEOUT)
    );

    const { error } = await Promise.race([deletePromise, deleteTimeoutPromise]);

    if (error) {
      console.error('❌ Error deleting user:', error);
      // Don't expose internal error details
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to delete user. Please try again.'
      });
    }

    // Invalidate cache
    await cacheService.del(CACHE_KEYS.USER_BY_ID(id));
    await cacheService.delByPattern('users:list:*');
    console.log('✅ Cache invalidated for user deletion');

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the user.'
    });
  }
};

/**
 * Reset user password (admin only)
 * @route   POST /api/users/:id/reset-password
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const resetUserPassword = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Generate new password
    const newPassword = generatePassword(12);

    // ========================================
    // 2. GET USER WITH TIMEOUT
    // ========================================
    const getUserPromise = supabaseAdmin.auth.admin.getUserById(id);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
    );

    const { data: user, error: userError } = await Promise.race([
      getUserPromise,
      timeoutPromise
    ]);

    if (userError) {
      console.error("❌ Error fetching user from auth:", userError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    if (!user?.user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const profile = {
      email: user.user.email,
      full_name: user.user.user_metadata?.full_name || user.user.email?.split('@')[0]
    };

    // ========================================
    // 3. UPDATE PASSWORD WITH TIMEOUT
    // ========================================
    const updatePromise = supabaseAdmin.auth.admin.updateUserById(
      id,
      { password: newPassword }
    );

    const { error: updateError } = await Promise.race([
      updatePromise,
      timeoutPromise
    ]);

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      // Don't expose internal error details
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to reset password. Please try again.'
      });
    }

    // Send password reset email (non-blocking)
    sendPasswordResetEmail({
      email: profile.email,
      full_name: profile.full_name || profile.email.split('@')[0],
      new_password: newPassword
    }).catch(err => console.error('❌ Email send error:', err));

    // Invalidate cache for this user
    await cacheService.del(CACHE_KEYS.USER_BY_ID(id));
    console.log('✅ Cache invalidated for password reset');

    res.json({
      success: true,
      message: 'Password reset successfully',
      email: profile.email
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while resetting the password.'
    });
  }
};

/**
 * Create reseller (admin only)
 * @route   POST /api/users/create-reseller
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Email format validation (Security)
 * 3. Phone validation (Security)
 * 4. Secure error handling (Security)
 */
export const createReseller = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    let { email, password, full_name, role, phone, country, city } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !country || !city) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "FullName, Email, password, country, city are required",
      });
    }

    // Sanitize and validate email
    email = email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Sanitize full_name
    full_name = sanitizeString(full_name, 255);
    if (!full_name || full_name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Full name must be at least 2 characters long'
      });
    }

    // Sanitize country and city
    country = sanitizeString(country, 100);
    city = sanitizeString(city, 100);

    // Validate and sanitize phone if provided
    if (phone) {
      phone = phone.trim();
      if (!isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid phone number format'
        });
      }
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: "Configuration Error",
        message: "Admin client not configured",
      });
    }

    // Check if admin approval is required for new resellers
    const { getResellerSettings } = await import('../../utils/resellerSettings.js');
    const resellerSettings = await getResellerSettings();
    
    // If admin approval is required, set account_status to 'pending' instead of 'active'
    const accountStatus = resellerSettings.requireResellerApproval ? 'pending' : 'active';

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
      console.error('❌ Error creating reseller:', createError);
      // Don't expose internal error details
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Failed to create reseller. Please check your input and try again.",
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
        referred_by: referred_by || null,
        account_status: accountStatus // Set based on approval requirement
      },
    ]);

    if (insertError) {
      console.error("❌ Error inserting profile:", insertError);
      return res.status(500).json({
        success: false,
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
        role: 'reseller'
      });
      console.log("✅ Custom welcome email sent to:", email);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: newUser.user.id,
      actionType: 'create',
      tableName: 'profiles',
      changedFields: {
        user_id: newUser.user.id,
        full_name,
        role: 'reseller',
        phone: phone || null,
        country: country || null,
        city: city || null,
        referred_by: referred_by || null
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Invalidate cache - clear all users list cache
    await cacheService.delByPattern('users:list:*');
    console.log('✅ Cache invalidated for reseller creation');

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
    console.error("❌ Error creating reseller:", error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "An error occurred while creating the reseller.",
    });
  }
};

/**
 * Update user account status (admin only)
 * @route   PATCH /api/users/:id/account-status
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format, status validation)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const updateUserAccountStatus = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    const { account_status } = req.body;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format'
      });
    }

    // Validate account_status
    const validStatuses = ['active', 'deactive'];
    if (!account_status) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'account_status is required'
      });
    }

    if (!validStatuses.includes(account_status)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid account_status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`🔄 Updating user ${id} account status to:`, account_status);

    // ========================================
    // 2. CHECK USER WITH TIMEOUT
    // ========================================
    const getUserPromise = supabase
      .from('profiles')
      .select('role, account_status')
      .eq('user_id', id)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
    );

    const { data: userProfile, error: fetchError } = await Promise.race([
      getUserPromise,
      timeoutPromise
    ]);

    if (fetchError || !userProfile) {
      console.error('❌ Error fetching user profile:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating another admin
    if (userProfile.role === 'admin' && account_status === 'deactive') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Cannot deactivate admin account'
      });
    }

    // ========================================
    // 3. UPDATE STATUS WITH TIMEOUT
    // ========================================
    const updatePromise = supabase
      .from('profiles')
      .update({
        account_status: account_status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .select()
      .single();

    const { data: updatedUser, error: updateError } = await Promise.race([
      updatePromise,
      timeoutPromise
    ]);

    if (updateError) {
      console.error('❌ Error updating user account status:', updateError);
      // Don't expose internal error details
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to update account status. Please try again.'
      });
    }

    console.log(`✅ User account status updated successfully`);

    // ========================================
    // 4. DATA SANITIZATION
    // ========================================
    const sanitizedUser = sanitizeObject(updatedUser);

    // Invalidate cache
    await cacheService.del(CACHE_KEYS.USER_BY_ID(id));
    await cacheService.delByPattern('users:list:*');
    console.log('✅ Cache invalidated for account status update');

    res.json({
      success: true,
      message: `User account status updated to ${account_status}`,
      data: sanitizedUser
    });
  } catch (error) {
    console.error('❌ Update user account status error:', error);
    // Don't expose internal errors
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while updating the account status.'
    });
  }
};

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per user
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    const rateLimitKey = `rate_limit:users:${userId}`;
    const requests = await cacheService.get(rateLimitKey) || 0;
    
    if (requests >= 100) { // 100 requests per minute
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }

    await cacheService.set(rateLimitKey, requests + 1, 60); // 60 seconds TTL
    next();
  } catch (error) {
    // If rate limiting fails, allow request (fail open)
    console.error('❌ Rate limit error:', error);
    next();
  }
};

/**
 * Input sanitization middleware
 * Additional layer of protection
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const sanitizeInputMiddleware = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          // Remove HTML tags
          req.query[key] = req.query[key].replace(/<[^>]*>/g, '');
          // Trim whitespace
          req.query[key] = req.query[key].trim();
        }
      });
    }

    // Sanitize body parameters
    if (req.body && typeof req.body === 'object') {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          // Remove HTML tags
          req.body[key] = req.body[key].replace(/<[^>]*>/g, '');
          // Trim whitespace
          req.body[key] = req.body[key].trim();
        }
      });
    }

    next();
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    next();
  }
};

