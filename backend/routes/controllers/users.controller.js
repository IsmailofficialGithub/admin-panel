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
import { hasRole } from '../../utils/roleUtils.js';

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
    // Filter for users that are NOT consumers or resellers
    // Since role is now an array (TEXT[]), we can't use .neq() directly
    // We'll fetch a larger batch and filter in memory, then apply pagination
    // This is a workaround until we can use an RPC function or view
    let query = supabase
      .from('auth_role_with_profiles')
      .select(USER_SELECT_FIELDS); // Don't get count yet, we'll calculate after filtering
    
    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order (but don't paginate yet - we'll do that after filtering)
    query = query.order('created_at', { ascending: false });
    
    // Fetch a larger batch to account for filtering (fetch up to 10x the limit)
    // This ensures we have enough results after filtering
    const fetchLimit = limitNum * 10;
    query = query.limit(fetchLimit);

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
    // 5. FILTER OUT CONSUMERS AND RESELLERS (in memory)
    // ========================================
    // Filter for users that have admin, user, or viewer roles (not consumer/reseller)
    const allowedRoles = ['admin', 'user', 'viewer'];
    const filteredUsers = (users || []).filter(user => {
      if (!user.role || !Array.isArray(user.role)) return false;
      // Check if user has any of the allowed roles AND doesn't have consumer/reseller
      const hasAllowedRole = user.role.some(role => allowedRoles.includes(role));
      const hasConsumerReseller = user.role.includes('consumer') || user.role.includes('reseller');
      return hasAllowedRole && !hasConsumerReseller;
    });

    // ========================================
    // 6. APPLY PAGINATION TO FILTERED RESULTS
    // ========================================
    const totalFiltered = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);

    // ========================================
    // 7. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedUsers = sanitizeArray(paginatedUsers);

    console.log(`✅ Found ${sanitizedUsers.length} users after filtering and pagination (Total filtered: ${totalFiltered}, Fetched: ${users?.length || 0})`);

    // ========================================
    // 8. RESPONSE STRUCTURE
    // ========================================
    const response = {
      success: true,
      count: sanitizedUsers.length,
      total: totalFiltered, // Total after filtering
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalFiltered / limitNum),
      hasMore: offset + limitNum < totalFiltered,
      data: sanitizedUsers,
      search: searchTerm || null
    };

    // ========================================
    // 8. CACHE THE RESPONSE
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
    let { email, password, full_name, role, roles, phone, country, city, referred_by, subscribed_products, trial_expiry_date } = req.body;

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

    // Validate roles - support both single role (backward compatibility) and roles array
    const validRoles = ['user', 'admin', 'consumer', 'reseller', 'viewer'];
    let userRoles = [];
    
    // If roles array is provided, use it; otherwise check for single role (backward compatibility)
    if (roles && Array.isArray(roles)) {
      userRoles = roles.map(r => r.toLowerCase()).filter(r => validRoles.includes(r));
      if (userRoles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `At least one valid role is required. Valid roles: ${validRoles.join(', ')}`
        });
      }
    } else if (role) {
      // Backward compatibility: single role
      const singleRole = role.toLowerCase();
      if (!validRoles.includes(singleRole)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      userRoles = [singleRole];
    } else {
      // Default to 'user' if no roles provided
      userRoles = ['user'];
    }
    
    // Remove duplicates
    userRoles = [...new Set(userRoles)];

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
    // Store first role in user_metadata for backward compatibility
    const createUserPayload = {
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: full_name || "",
        country: country || "",
        city: city || "",
        role: userRoles[0] || "user",
        roles: userRoles,
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

    // Get the user ID of who created this user (from token) - use as fallback if referred_by not provided
    const adminId = req.user && req.user.id ? req.user.id : null;
    
    // For consumer role: use provided referred_by, otherwise use admin creating the user
    // For other roles: use admin creating the user
    let finalReferredBy = adminId;
    if (userRoles.includes('consumer') && referred_by) {
      // Validate referred_by is a valid UUID if provided
      if (isValidUUID(referred_by)) {
        finalReferredBy = referred_by;
      } else {
        console.warn('⚠️ Invalid referred_by UUID provided, using admin ID instead');
      }
    }

    // Prepare profile data
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: userRoles, // Store as array
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: finalReferredBy || null,
    };

    // If roles include consumer, handle trial_expiry and account_status
    if (userRoles.includes('consumer')) {
      // Use provided trial_expiry_date if valid, otherwise default to 3 days from now
      if (trial_expiry_date) {
        const trialDate = new Date(trial_expiry_date);
        if (!isNaN(trialDate.getTime()) && trialDate >= new Date()) {
          profileData.trial_expiry = trialDate.toISOString();
          console.log('✅ Using provided trial expiry date:', profileData.trial_expiry);
        } else {
          // Invalid date, use default
          const trialExpiry = new Date();
          trialExpiry.setDate(trialExpiry.getDate() + 3);
          profileData.trial_expiry = trialExpiry.toISOString();
          console.log('⚠️ Invalid trial_expiry_date provided, using default 3-day trial:', profileData.trial_expiry);
        }
      } else {
        // No date provided, use default 3 days
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 3);
        profileData.trial_expiry = trialExpiry.toISOString();
        console.log('✅ Setting default 3-day trial for consumer:', profileData.trial_expiry);
      }
      profileData.account_status = 'active';
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

    // If consumer role and subscribed_products provided, store in user_product_access table
    if (userRoles.includes('consumer') && subscribed_products && Array.isArray(subscribed_products) && subscribed_products.length > 0) {
      try {
        // Validate all product IDs are valid UUIDs
        const validProductIds = subscribed_products.filter(productId => isValidUUID(productId));
        
        if (validProductIds.length > 0) {
          const productAccessRecords = validProductIds.map(productId => ({
            user_id: newUser.user.id,
            product_id: productId
          }));

          const productAccessPromise = supabaseAdmin
            .from('user_product_access')
            .insert(productAccessRecords);

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Product access insert timeout')), 5000)
          );

          await Promise.race([productAccessPromise, timeoutPromise]);
          console.log(`✅ Stored ${validProductIds.length} product access record(s) for consumer`);
        } else {
          console.warn('⚠️ No valid product IDs provided in subscribed_products');
        }
      } catch (productAccessError) {
        console.warn('⚠️ Failed to store product access (non-critical):', productAccessError?.message || productAccessError);
        // Don't fail the request, just log the error
      }
    }

    // Send custom welcome email
    try {
      await sendWelcomeEmail({
        email,
        full_name,
        password,
        role: userRoles.join(', ') || 'user'
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
        role: userRoles, // Return as array
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

    let { full_name, role, roles, phone, country, city } = req.body;
    
    console.log('📝 Update user - received data:', { 
      roles, 
      role,
      rolesType: typeof roles, 
      roleType: typeof role,
      isArray: Array.isArray(roles)
    });

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
    
    // Handle roles - support both single role (backward compatibility) and roles array
    if (roles !== undefined) {
      // Normalize roles to array
      let rolesArray = roles;
      if (!Array.isArray(roles)) {
        // If it's a string, convert to array
        if (typeof roles === 'string') {
          rolesArray = [roles];
        } else {
          console.warn('⚠️ Roles is not an array or string, checking single role field:', roles);
          // Fall through to check single role field
        }
      }
      
      if (Array.isArray(rolesArray)) {
      const validRoles = ['user', 'admin', 'consumer', 'reseller', 'viewer'];
        const userRoles = rolesArray.map(r => String(r).toLowerCase()).filter(r => validRoles.includes(r));
      if (userRoles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `At least one valid role is required. Valid roles: ${validRoles.join(', ')}`
        });
      }
        // Remove duplicates and set as array
      updateData.role = [...new Set(userRoles)];
        console.log('✅ Roles processed and set in updateData:', updateData.role);
      }
    }
    
    // Backward compatibility: single role field
    if (role && !updateData.role) {
      const validRoles = ['user', 'admin', 'consumer', 'reseller', 'viewer'];
      const singleRole = String(role).toLowerCase();
      if (!validRoles.includes(singleRole)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      updateData.role = [singleRole];
      console.log('✅ Single role processed and set in updateData:', updateData.role);
    }
    
    if (!updateData.role) {
      console.log('ℹ️ No roles provided in update request, keeping existing roles');
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
        role: ["reseller"], // Array for TEXT[]
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
        role: ["reseller"], // Array for TEXT[]
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
        role: ['reseller'] // Array for TEXT[]
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
        role: ['reseller'], // Array for TEXT[]
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
    if (hasRole(userProfile.role, 'admin') && account_status === 'deactive') {
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

