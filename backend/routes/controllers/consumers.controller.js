import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendPasswordResetEmail, sendTrialPeriodChangeEmail, sendTrialExtensionEmail } from '../../services/emailService.js';
import { generatePassword } from '../../utils/helpers.js';
import { logActivity, getActorInfo, getClientIp, getUserAgent } from '../../services/activityLogger.js';
import { cacheService } from '../../config/redis.js';
import {
  sanitizeString,
  isValidUUID,
  isValidPhone,
  validatePagination,
  sanitizeObject,
  sanitizeArray
} from '../../utils/validation.js';
import {
  executeWithTimeout,
  createCacheKey,
  CONSUMER_SELECT_FIELDS,
  handleApiError,
  validateAndSanitizeSearch,
  createPaginatedResponse,
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../../utils/apiOptimization.js';

// Export middleware for use in routes
export const rateLimitMiddleware = createRateLimitMiddleware('consumers', 100);
export { sanitizeInputMiddleware };

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_KEYS = {
  ALL_CONSUMERS: (search, status, page, limit) => `consumers:list:${search || 'all'}:${status || 'all'}_page${page}_limit${limit}`,
  CONSUMER_BY_ID: (id) => `consumers:id:${id}`,
};

/**
 * Consumers Controller
 * Handles consumer-related operations
 */

/**
 * Get all consumers with filters and pagination (admin only)
 * @route   GET /api/consumers?account_status=active&search=john&page=1&limit=50
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Pagination support (Performance)
 * 3. Field selection instead of * (Performance)
 * 4. Query timeout (Performance)
 * 5. Better error handling (Security)
 * 6. Data sanitization (Security)
 * 7. Redis caching (Performance)
 */
export const getAllConsumers = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    const { account_status, search, page, limit } = req.query;

    // Validate and sanitize search input
    const searchTerm = validateAndSanitizeSearch(search, 100);
    if (search && !searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid search term. Only alphanumeric characters, spaces, @, ., _, and - are allowed.'
      });
    }

    // Validate account_status
    const validStatuses = ['active', 'deactive', 'expired_subscription', 'all'];
    const statusFilter = account_status && validStatuses.includes(account_status) ? account_status : 'all';

    // Validate pagination parameters
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    console.log('🔍 Filtering consumers with:', { account_status: statusFilter, search: searchTerm, page: pageNum, limit: limitNum });

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.ALL_CONSUMERS(searchTerm || '', statusFilter, pageNum, limitNum);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for consumers list');
      return res.json(cachedData);
    }

    console.log('❌ Cache MISS for consumers list - fetching from database');

    // ========================================
    // 3. OPTIMIZED DATABASE QUERY
    // ========================================
    let query = supabase
      .from('auth_role_with_profiles')
      .select(CONSUMER_SELECT_FIELDS, { count: 'exact' })
      .eq('role', 'consumer');

    // Filter by account_status if provided
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('account_status', statusFilter);
      console.log('✅ Filtering by account_status:', statusFilter);
    }

    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      console.log('✅ Searching for:', searchTerm);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Execute query with timeout protection
    const { data: consumers, error, count } = await executeWithTimeout(query);

    // ========================================
    // 4. ERROR HANDLING (Security)
    // ========================================
    if (error) {
      console.error('❌ Error fetching consumers:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to fetch consumers. Please try again.'
      });
    }

    // ========================================
    // 5. FETCH PRODUCT ACCESS (with timeout)
    // ========================================
    const consumersWithProducts = await Promise.all(
      (consumers || []).map(async (consumer) => {
        try {
          const productAccessPromise = supabase
            .from('user_product_access')
            .select('product_id')
            .eq('user_id', consumer.user_id);

          const { data: productAccess, error: productError } = await executeWithTimeout(productAccessPromise, 5000);

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

    // ========================================
    // 6. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedConsumers = sanitizeArray(consumersWithProducts);

    // ========================================
    // 7. RESPONSE STRUCTURE
    // ========================================
    const response = createPaginatedResponse(sanitizedConsumers, count, pageNum, limitNum, searchTerm);
    response.filters = {
      account_status: statusFilter,
      search: searchTerm || ''
    };

    // ========================================
    // 8. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching consumers.');
  }
};

/**
 * Get consumer by ID (admin only)
 * @route   GET /api/consumers/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Field selection instead of * (Performance)
 * 3. Query timeout (Performance)
 * 4. Secure error handling (Security)
 * 5. Data sanitization (Security)
 * 6. Redis caching (Performance)
 */
export const getConsumerById = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }

    const cacheKey = CACHE_KEYS.CONSUMER_BY_ID(id);

    // Try to get from cache
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for consumer ${id}`);
      return res.json(cachedData);
    }

    console.log(`❌ Cache MISS for consumer ${id} - fetching from database`);

    // ========================================
    // 2. OPTIMIZED DATABASE QUERY
    // ========================================
    const queryPromise = supabase
      .from('auth_role_with_profiles')
      .select(CONSUMER_SELECT_FIELDS)
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const { data: consumer, error } = await executeWithTimeout(queryPromise);

    // ========================================
    // 3. ERROR HANDLING (Security)
    // ========================================
    if (error || !consumer) {
      console.error('❌ Error fetching consumer:', error);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // ========================================
    // 4. FETCH PRODUCT ACCESS (with timeout)
    // ========================================
    try {
      const productAccessPromise = supabase
        .from('user_product_access')
        .select('product_id')
        .eq('user_id', id);

      const { data: productAccess, error: productError } = await executeWithTimeout(productAccessPromise, 5000);

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

    // ========================================
    // 5. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedConsumer = sanitizeObject(consumer);

    const response = {
      success: true,
      data: sanitizedConsumer
    };

    // Cache the response
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching the consumer.');
  }
};

/**
 * Update consumer (admin only)
 * @route   PUT /api/consumers/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. UUID validation (Security)
 * 3. Phone validation (Security)
 * 4. Secure error handling (Security)
 * 5. Query timeout (Performance)
 */
export const updateConsumer = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }

    let { full_name, phone, trial_expiry_date, country, city, subscribed_products } = req.body;
    
    console.log('subscribed_products received:', subscribed_products);

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
    
    if (full_name !== undefined) {
      full_name = sanitizeString(full_name, 255);
      if (full_name && full_name.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Full name must be at least 2 characters long'
        });
      }
      updateData.full_name = full_name;
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
    
    if (trial_expiry_date !== undefined) {
      // Convert to timestamp if provided
      if (trial_expiry_date) {
        updateData.trial_expiry = new Date(trial_expiry_date);
      } else {
        updateData.trial_expiry = null;
      }
    }

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
        success: false,
        error: 'Bad Request',
        message: 'No fields to update'
      });
    }

    console.log("updateData", updateData);

    // ========================================
    // 3. DATABASE QUERIES WITH TIMEOUT
    // ========================================
    // Get current consumer data before update to compare trial_expiry
    const currentConsumerPromise = supabase
      .from('auth_role_with_profiles')
      .select('email, full_name, trial_expiry')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const { data: currentConsumer, error: fetchError } = await executeWithTimeout(currentConsumerPromise);

    if (fetchError) {
      console.error('Error fetching consumer before update:', fetchError);
    }

    // Get old data for logging changed fields
    const oldConsumerPromise = supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const { data: oldConsumer } = await executeWithTimeout(oldConsumerPromise);

    const oldTrialExpiry = currentConsumer?.trial_expiry || null;

    const updatePromise = supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'consumer')
      .select()
      .maybeSingle();

    const { data: updatedConsumer, error } = await executeWithTimeout(updatePromise);
      
    console.log("updatedConsumer", updatedConsumer);

    if (error) {
      console.error('❌ Error updating consumer:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to update consumer. Please try again.'
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

    // ========================================
    // 4. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    await cacheService.delByPattern('consumers:list:*');
    console.log('✅ Cache invalidated for consumer update');

    // ========================================
    // 5. DATA SANITIZATION
    // ========================================
    const sanitizedConsumer = sanitizeObject(updatedConsumer);

    res.json({
      success: true,
      message: 'Consumer updated successfully',
      data: sanitizedConsumer
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while updating the consumer.');
  }
};

/**
 * Delete consumer (admin only)
 * @route   DELETE /api/consumers/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const deleteConsumer = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }

    // ========================================
    // 2. CHECK IF CONSUMER EXISTS (with timeout)
    // ========================================
    const consumerPromise = supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const { data: consumer, error: fetchError } = await executeWithTimeout(consumerPromise);

    if (fetchError || !consumer) {
      console.error('❌ Error fetching consumer:', fetchError);
      return res.status(404).json({
        success: false,
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

    // ========================================
    // 3. DELETE CONSUMER (with timeout)
    // ========================================
    // Delete from profiles table first
    const deleteProfilePromise = supabase
      .from('profiles')
      .delete()
      .eq('user_id', id);

    const { error: profileError } = await executeWithTimeout(deleteProfilePromise);

    if (profileError) {
      console.error('❌ Error deleting consumer profile:', profileError);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to delete consumer. Please try again.'
      });
    }

    // Delete from auth using admin client
    if (supabaseAdmin) {
      try {
        const deleteAuthPromise = supabaseAdmin.auth.admin.deleteUser(id);
        const { error: authError } = await executeWithTimeout(deleteAuthPromise);
        
        if (authError) {
          console.error('Error deleting user from auth:', authError);
          // Continue anyway since profile is deleted
        }
      } catch (authErr) {
        console.error('Error in auth deletion:', authErr);
        // Continue anyway
      }
    }

    // ========================================
    // 4. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    await cacheService.delByPattern('consumers:list:*');
    console.log('✅ Cache invalidated for consumer deletion');

    res.json({
      success: true,
      message: 'Consumer deleted successfully'
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while deleting the consumer.');
  }
};

/**
 * Update consumer account status (admin only)
 * @route   PATCH /api/consumers/:id/account-status
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format, status validation)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const updateConsumerAccountStatus = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    const { account_status, trial_expiry_date, lifetime_access } = req.body;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }

    // Validate account_status
    const validStatuses = ['active', 'deactive', 'expired_subscription'];
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

    console.log(`🔄 Updating consumer ${id} account status to:`, account_status);

    // ========================================
    // 2. FETCH CONSUMER (with timeout)
    // ========================================
    const consumerPromise = supabase
      .from('profiles')
      .select('created_at, trial_expiry, lifetime_access')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const { data: consumer, error: fetchError } = await executeWithTimeout(consumerPromise);

    if (fetchError || !consumer) {
      console.error('❌ Error fetching consumer:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Prepare update data
    const updateData = { account_status };

    // Handle lifetime access - set lifetime_access field
    if (lifetime_access === true) {
      updateData.lifetime_access = true;
      console.log('♾️ Granting lifetime access (setting lifetime_access to true)');
    } else if (lifetime_access === false) {
      // Allow explicitly revoking lifetime access
      updateData.lifetime_access = false;
      console.log('♾️ Revoking lifetime access (setting lifetime_access to false)');
    }
    // If lifetime_access is not provided, keep existing value

    // Handle trial_expiry based on account status (don't modify if lifetime_access is being set)
    if (account_status === 'expired_subscription') {
      // Set trial_expiry to current date to mark as expired
      updateData.trial_expiry = new Date().toISOString();
      console.log('📅 Setting trial_expiry to current date (expired)');
    } else if (account_status === 'active') {
      // If trial_expiry_date is provided, use it
      if (trial_expiry_date) {
        // Validate: trial_expiry cannot exceed 7 days from created_at (unless it's null for lifetime)
        const createdAt = new Date(consumer.created_at);
        const maxTrialDate = new Date(createdAt);
        maxTrialDate.setDate(maxTrialDate.getDate() + 7);
        
        const requestedExpiryDate = new Date(trial_expiry_date);
        
        if (requestedExpiryDate > maxTrialDate) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Trial cannot be extended beyond 7 days from account creation date. Use lifetime_access: true for unlimited access.'
          });
        }
        
        updateData.trial_expiry = trial_expiry_date;
        console.log('📅 Setting trial_expiry to provided date:', trial_expiry_date);
      } else {
        // If no trial_expiry_date provided, use existing trial_expiry or calculate default
        if (consumer.trial_expiry) {
          // Keep existing trial_expiry
          console.log('📅 Keeping existing trial_expiry:', consumer.trial_expiry);
          updateData.trial_expiry = consumer.trial_expiry;
        } else {
          // Calculate default trial expiry (7 days from creation)
          const createdAt = new Date(consumer.created_at);
          const defaultTrialExpiry = new Date(createdAt);
          defaultTrialExpiry.setDate(defaultTrialExpiry.getDate() + 7);
          updateData.trial_expiry = defaultTrialExpiry.toISOString();
          console.log('📅 Setting default trial_expiry (7 days from creation):', updateData.trial_expiry);
        }
      }
    } else if (account_status === 'deactive') {
      // Keep trial_expiry as is for deactive status
      console.log('📅 Keeping existing trial_expiry for deactive status');
    }

    // ========================================
    // 3. GET CONSUMER INFO (with timeout)
    // ========================================
    const consumerInfoPromise = supabase
      .from('auth_role_with_profiles')
      .select('email, full_name, trial_expiry')
      .eq('user_id', id)
      .eq('role', 'consumer')
      .single();

    const { data: consumerInfo, error: infoError } = await executeWithTimeout(consumerInfoPromise);

    if (infoError) {
      console.error('Error fetching consumer info:', infoError);
    }

    // Store old trial_expiry for email (from consumer fetched earlier or from consumerInfo)
    const oldTrialExpiry = consumerInfo?.trial_expiry || consumer?.trial_expiry || null;

    // ========================================
    // 4. UPDATE STATUS (with timeout)
    // ========================================
    const updatePromise = supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'consumer')
      .select()
      .maybeSingle();

    const { data: updatedConsumer, error } = await executeWithTimeout(updatePromise);

    if (error) {
      console.error('❌ Error updating account status:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to update account status. Please try again.'
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

    // ========================================
    // 5. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    await cacheService.delByPattern('consumers:list:*');
    console.log('✅ Cache invalidated for account status update');

    // ========================================
    // 6. DATA SANITIZATION
    // ========================================
    const sanitizedConsumer = sanitizeObject(updatedConsumer);

    res.json({
      success: true,
      message: `Consumer account status updated to ${account_status}`,
      data: sanitizedConsumer
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while updating the account status.');
  }
};

/**
 * Reset consumer password (admin only)
 * @route   POST /api/consumers/:id/reset-password
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const resetConsumerPassword = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
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
    // 2. GET USER (with timeout)
    // ========================================
    const getUserPromise = supabaseAdmin.auth.admin.getUserById(id);
    const { data: user, error: userError } = await executeWithTimeout(getUserPromise);

    if (userError) {
      console.error("❌ Error fetching user from auth:", userError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Assume email and full_name may be under user.user_metadata
    const profile = {
      email: user?.user?.email,
      full_name: user?.user?.user_metadata?.full_name || user?.user?.email?.split('@')[0]
    };

    if (!profile || !profile.email || !profile.full_name) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Email or full name not found'
      });
    }

    // ========================================
    // 3. GENERATE AND UPDATE PASSWORD (with timeout)
    // ========================================
    // Generate new password
    const newPassword = generatePassword();

    // Update password using admin client
    const updatePasswordPromise = supabaseAdmin.auth.admin.updateUserById(
      id,
      { password: newPassword }
    );

    const { error: updateError } = await executeWithTimeout(updatePasswordPromise);

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to reset password. Please try again.'
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

    // ========================================
    // 4. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    console.log('✅ Cache invalidated for password reset');

    res.json({
      success: true,
      message: 'Password reset successfully. Email sent to consumer.'
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while resetting the password.');
  }
};

