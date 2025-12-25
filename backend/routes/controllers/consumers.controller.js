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
import { hasRole } from '../../utils/roleUtils.js';

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
      .contains('role', ['consumer']); // Check if role array contains 'consumer'
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
    console.log('consumers', consumers);

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
            .select('product_id, product_settings')
            .eq('user_id', consumer.user_id);

          const { data: productAccess, error: productError } = await executeWithTimeout(productAccessPromise, 5000);

          if (productError) {
            console.error(`Error fetching products for consumer ${consumer.user_id}:`, productError);
            return {
              ...consumer,
              subscribed_products: [],
              productSettings: {}
            };
          }

          // Extract product IDs into array
          const productIds = productAccess?.map(pa => pa.product_id) || [];
          
          // Build productSettings object from product_settings
          const productSettings = {};
          productAccess?.forEach(pa => {
            if (pa.product_id && pa.product_settings) {
              productSettings[pa.product_id] = pa.product_settings;
            }
          });
          
          return {
            ...consumer,
            subscribed_products: productIds,
            productSettings: productSettings
          };
        } catch (err) {
          console.error(`Error processing consumer ${consumer.user_id}:`, err);
          return {
            ...consumer,
            subscribed_products: [],
            productSettings: {}
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
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
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
        .select('product_id, product_settings')
        .eq('user_id', id);

      const { data: productAccess, error: productError } = await executeWithTimeout(productAccessPromise, 5000);

      if (productError) {
        console.error(`Error fetching products for consumer ${id}:`, productError);
        consumer.subscribed_products = [];
        consumer.productSettings = {};
      } else {
        // Extract product IDs into array
        consumer.subscribed_products = productAccess?.map(pa => pa.product_id) || [];
        
        // Build productSettings object from product_settings
        const productSettings = {};
        productAccess?.forEach(pa => {
          if (pa.product_id && pa.product_settings) {
            productSettings[pa.product_id] = pa.product_settings;
          }
        });
        consumer.productSettings = productSettings;
      }
    } catch (err) {
      console.error(`Error processing product access for consumer ${id}:`, err);
      consumer.subscribed_products = [];
      consumer.productSettings = {};
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

    let { full_name, phone, trial_expiry_date, country, city, subscribed_products, subscribed_packages, roles, productSettings, nickname } = req.body;
    
    console.log('📝 Update consumer - received data:', { 
      roles, 
      rolesType: typeof roles, 
      isArray: Array.isArray(roles),
      subscribed_products,
      subscribed_packages,
      productSettings
    });

    // Validate required fields for update
    if (!country ) {
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
    
    // Handle nickname (optional)
    if (nickname !== undefined) {
      updateData.nickname = nickname ? sanitizeString(nickname, 100) : null;
    }
    
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
    // Note: subscribed_packages is stored in profiles.subscribed_packages array
    // and also in user_package_access table (see below)
    // subscribed_products is stored in user_product_access table (see below)

    if (Object.keys(updateData).length === 0 && subscribed_packages === undefined && subscribed_products === undefined) {
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
    // Handle roles update if provided
    if (roles !== undefined) {
      // Normalize roles to array
      let rolesArray = roles;
      if (!Array.isArray(roles)) {
        // If it's a string, convert to array
        if (typeof roles === 'string') {
          rolesArray = [roles];
        } else {
          console.warn('⚠️ Roles is not an array or string, defaulting to consumer:', roles);
          rolesArray = ['consumer'];
        }
      }
      
      const validRoles = ['consumer', 'reseller'];
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
    } else {
      console.log('ℹ️ No roles provided in update request, keeping existing roles');
    }
    
    // Get current consumer data before update to compare trial_expiry
    const currentConsumerPromise = supabase
      .from('auth_role_with_profiles')
      .select('email, full_name, trial_expiry')
      .eq('user_id', id)
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
      .single();

    const { data: currentConsumer, error: fetchError } = await executeWithTimeout(currentConsumerPromise);

    if (fetchError) {
      console.error('Error fetching consumer before update:', fetchError);
    }

    // Get old data for logging changed fields
    const oldConsumerPromise = supabase
      .from('auth_role_with_profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    const { data: oldConsumer } = await executeWithTimeout(oldConsumerPromise);

    const oldTrialExpiry = currentConsumer?.trial_expiry || null;

    const updatePromise = supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
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

    // Update product access - handle subscribed_products separately
    if (subscribed_products !== undefined) {
      try {
        // Validate product IDs format
        const validFormatProductIds = Array.isArray(subscribed_products) 
          ? subscribed_products.filter(productId => isValidUUID(productId))
          : [];

        // Verify that all product IDs exist in the products table
        let verifiedProductIds = [];
        if (validFormatProductIds.length > 0) {
          const { data: existingProducts, error: productsCheckError } = await executeWithTimeout(
            supabase
              .from('products')
              .select('id')
              .in('id', validFormatProductIds)
          );

          if (productsCheckError) {
            console.error('Error checking product existence:', productsCheckError);
          } else {
            verifiedProductIds = (existingProducts || []).map(prod => prod.id);
            const invalidProductIds = validFormatProductIds.filter(id => !verifiedProductIds.includes(id));
            if (invalidProductIds.length > 0) {
              console.warn(`⚠️ Skipping ${invalidProductIds.length} invalid product ID(s) that don't exist in products table:`, invalidProductIds);
            }
          }
        }

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

        // Then insert new product access records if any verified products are provided
        if (verifiedProductIds.length > 0) {
          // Build product access records with product_settings included
          const productAccessRecords = verifiedProductIds.map(productId => {
            const record = {
              user_id: id,
              product_id: productId
            };
            
            // Add product_settings if available for this product
            if (productSettings && typeof productSettings === 'object' && productSettings[productId]) {
              const settings = productSettings[productId];
              
              // Validate and sanitize settings
              const sanitizedSettings = {};
              
              if (settings.vapi_account !== undefined && settings.vapi_account !== null && settings.vapi_account !== '') {
                sanitizedSettings.vapi_account = parseInt(settings.vapi_account);
              }
              if (settings.agent_number !== undefined && settings.agent_number !== null && settings.agent_number !== '') {
                sanitizedSettings.agent_number = parseInt(settings.agent_number);
              }
              if (settings.duration_limit !== undefined && settings.duration_limit !== null && settings.duration_limit !== '') {
                sanitizedSettings.duration_limit = parseInt(settings.duration_limit);
              }
              if (settings.list_limit !== undefined && settings.list_limit !== null && settings.list_limit !== '') {
                sanitizedSettings.list_limit = parseInt(settings.list_limit);
              }
              if (settings.concurrency_limit !== undefined && settings.concurrency_limit !== null && settings.concurrency_limit !== '') {
                sanitizedSettings.concurrency_limit = parseInt(settings.concurrency_limit);
              }
              
              // Beeba product settings
              if (settings.brands !== undefined && settings.brands !== null && settings.brands !== '') {
                sanitizedSettings.brands = parseInt(settings.brands);
              }
              if (settings.posts !== undefined && settings.posts !== null && settings.posts !== '') {
                sanitizedSettings.posts = parseInt(settings.posts);
              }
              if (settings.analysis !== undefined && settings.analysis !== null && settings.analysis !== '') {
                sanitizedSettings.analysis = parseInt(settings.analysis);
              }
              if (settings.images !== undefined && settings.images !== null && settings.images !== '') {
                sanitizedSettings.images = parseInt(settings.images);
              }
              if (settings.video !== undefined && settings.video !== null && settings.video !== '') {
                sanitizedSettings.video = parseInt(settings.video);
              }
              if (settings.carasoul !== undefined && settings.carasoul !== null && settings.carasoul !== '') {
                sanitizedSettings.carasoul = parseInt(settings.carasoul);
              }
              
              // Only add product_settings if there are valid settings
              if (Object.keys(sanitizedSettings).length > 0) {
                record.product_settings = sanitizedSettings;
              }
            }
            
            return record;
          });

          const { error: insertError } = await supabase
            .from('user_product_access')
            .insert(productAccessRecords);

          if (insertError) {
            console.error('Error inserting product access:', insertError);
            // Return error to user if product access fails
            return res.status(400).json({
              success: false,
              error: 'Bad Request',
              message: `Failed to update product access: ${insertError.message || 'One or more product IDs do not exist'}`
            });
          } else {
            console.log(`✅ Stored ${productAccessRecords.length} product access records`);
            if (productSettings && Object.keys(productSettings).length > 0) {
              console.log('✅ Product settings included in update');
            }
          }
        } else if (Array.isArray(subscribed_products) && subscribed_products.length > 0 && verifiedProductIds.length === 0) {
          // If products were provided but none were valid, warn the user
          console.warn('⚠️ No valid products found to update');
          return res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'None of the provided product IDs exist in the products table'
          });
        }
      } catch (productAccessErr) {
        console.error('Error updating product access:', productAccessErr);
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Failed to update product access: ${productAccessErr.message || 'Unknown error'}`
        });
      }
    }

    // Update package access - handle subscribed_packages (separate from products)
    const packagesToStore = subscribed_packages;
    
    if (packagesToStore !== undefined) {
      try {
        // Validate package IDs format
        const validFormatPackageIds = Array.isArray(packagesToStore) 
          ? packagesToStore.filter(packageId => isValidUUID(packageId))
          : [];

        // Verify that all package IDs exist in the packages table
        let verifiedPackageIds = [];
        if (validFormatPackageIds.length > 0) {
          const { data: existingPackages, error: packagesCheckError } = await executeWithTimeout(
            supabase
              .from('packages')
              .select('id')
              .in('id', validFormatPackageIds)
          );

          if (packagesCheckError) {
            console.error('Error checking package existence:', packagesCheckError);
          } else {
            verifiedPackageIds = (existingPackages || []).map(pkg => pkg.id);
            const invalidPackageIds = validFormatPackageIds.filter(id => !verifiedPackageIds.includes(id));
            if (invalidPackageIds.length > 0) {
              console.warn(`⚠️ Skipping ${invalidPackageIds.length} invalid package ID(s) that don't exist in packages table:`, invalidPackageIds);
            }
          }
        }

        // Update profile with subscribed_packages array (use verified package IDs)
        if (verifiedPackageIds.length > 0 || (Array.isArray(packagesToStore) && packagesToStore.length === 0)) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ subscribed_packages: verifiedPackageIds })
            .eq('user_id', id);

          if (profileUpdateError) {
            console.error('Error updating profile with packages:', profileUpdateError);
          } else {
            console.log(`✅ Updated profile with ${verifiedPackageIds.length} packages`);
          }
        }

        // First, delete all existing package access for this user
        const { error: deleteError } = await supabase
          .from('user_package_access')
          .delete()
          .eq('user_id', id);

        if (deleteError) {
          console.error('Error deleting existing package access:', deleteError);
        } else {
          console.log('✅ Deleted existing package access records');
        }

        // Then insert new package access records if any verified packages are provided
        if (verifiedPackageIds.length > 0) {
          const packageAccessRecords = verifiedPackageIds.map(packageId => ({
            user_id: id,
            package_id: packageId
          }));

          const { error: insertError } = await supabase
            .from('user_package_access')
            .insert(packageAccessRecords);

          if (insertError) {
            console.error('Error inserting package access:', insertError);
            // Return error to user if package access fails
            return res.status(400).json({
              success: false,
              error: 'Bad Request',
              message: `Failed to update package access: ${insertError.message || 'One or more package IDs do not exist'}`
            });
          } else {
            console.log(`✅ Stored ${packageAccessRecords.length} package access records`);
          }
        } else if (Array.isArray(packagesToStore) && packagesToStore.length > 0 && verifiedPackageIds.length === 0) {
          // If packages were provided but none were valid, warn the user
          console.warn('⚠️ No valid packages found to update');
          return res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'None of the provided package IDs exist in the packages table'
          });
        }
      } catch (packageAccessErr) {
        console.error('Error updating package access:', packageAccessErr);
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Failed to update package access: ${packageAccessErr.message || 'Unknown error'}`
        });
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
      .from('auth_role_with_profiles')
      .select('*')
      .eq('user_id', id)
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
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
      .from('auth_role_with_profiles')
      .select('created_at, trial_expiry, lifetime_access')
      .eq('user_id', id)
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
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
    // Check permissions if lifetime_access is being modified
    if (lifetime_access === true) {
      // Check if user has permission to grant lifetime access
      const { data: hasGrantPermission } = await supabase.rpc('has_permission', {
        p_user_id: req.user.id,
        p_permission_name: 'consumers.grant_lifetime_access'
      });
      const { data: hasManagePermission } = await supabase.rpc('has_permission', {
        p_user_id: req.user.id,
        p_permission_name: 'consumers.manage_lifetime_access'
      });
      
      if (!hasGrantPermission && !hasManagePermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Permission required: consumers.grant_lifetime_access or consumers.manage_lifetime_access'
        });
      }
      
      updateData.lifetime_access = true;
      console.log('♾️ Granting lifetime access (setting lifetime_access to true)');
    } else if (lifetime_access === false) {
      // Check if user has permission to revoke lifetime access
      const { data: hasRevokePermission } = await supabase.rpc('has_permission', {
        p_user_id: req.user.id,
        p_permission_name: 'consumers.revoke_lifetime_access'
      });
      const { data: hasManagePermission } = await supabase.rpc('has_permission', {
        p_user_id: req.user.id,
        p_permission_name: 'consumers.manage_lifetime_access'
      });
      
      if (!hasRevokePermission && !hasManagePermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Permission required: consumers.revoke_lifetime_access or consumers.manage_lifetime_access'
        });
      }
      
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
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
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
      .contains('role', ['consumer'])
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

/**
 * Grant lifetime access to consumer (admin only, requires consumers.grant_lifetime_access permission)
 * @route   POST /api/consumers/:id/grant-lifetime-access
 * @access  Private (Admin with consumers.grant_lifetime_access or consumers.manage_lifetime_access permission)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Permission check (Security)
 * 3. Query timeout (Performance)
 * 4. Cache invalidation (Performance)
 * 5. Activity logging (Audit)
 */
export const grantLifetimeAccess = async (req, res) => {
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
    // 2. FETCH CONSUMER (with timeout)
    // ========================================
    const consumerPromise = supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, lifetime_access, role')
      .eq('user_id', id)
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
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

    // Check if already has lifetime access
    if (consumer.lifetime_access === true) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Consumer already has lifetime access'
      });
    }

    // ========================================
    // 3. UPDATE LIFETIME ACCESS (with timeout)
    // ========================================
    const updatePromise = supabase
      .from('profiles')
      .update({ lifetime_access: true })
      .eq('user_id', id)
      .select()
      .maybeSingle();

    const { data: updatedConsumer, error } = await executeWithTimeout(updatePromise);

    if (error) {
      console.error('❌ Error granting lifetime access:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to grant lifetime access. Please try again.'
      });
    }

    if (!updatedConsumer) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Consumer not found after update'
      });
    }

    // ========================================
    // 4. LOG ACTIVITY (non-blocking)
    // ========================================
    const { actorId, actorRole } = await getActorInfo(req);
    logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'update',
      tableName: 'profiles',
      changedFields: {
        lifetime_access: {
          old: false,
          new: true
        }
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    }).catch(logError => {
      console.warn('⚠️ Failed to log activity:', logError?.message);
    });

    // ========================================
    // 5. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    await cacheService.delByPattern('consumers:*');
    console.log('✅ Cache invalidated for lifetime access grant');

    // ========================================
    // 6. DATA SANITIZATION
    // ========================================
    const sanitizedConsumer = sanitizeObject(updatedConsumer);

    res.json({
      success: true,
      message: 'Lifetime access granted successfully',
      data: sanitizedConsumer
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while granting lifetime access.');
  }
};

/**
 * Revoke lifetime access from consumer (admin only, requires consumers.revoke_lifetime_access permission)
 * @route   POST /api/consumers/:id/revoke-lifetime-access
 * @access  Private (Admin with consumers.revoke_lifetime_access or consumers.manage_lifetime_access permission)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Permission check (Security)
 * 3. Query timeout (Performance)
 * 4. Cache invalidation (Performance)
 * 5. Activity logging (Audit)
 */
export const revokeLifetimeAccess = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    const { trial_days } = req.body; // Optional: number of days for trial (1-30 or custom)

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }

    // Validate trial_days if provided
    let trialDays = null;
    if (trial_days !== undefined && trial_days !== null) {
      const days = parseInt(trial_days, 10);
      if (isNaN(days) || days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'trial_days must be a number between 1 and 365'
        });
      }
      trialDays = days;
    }

    // ========================================
    // 2. FETCH CONSUMER (with timeout)
    // ========================================
    const consumerPromise = supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, lifetime_access, role, created_at, trial_expiry')
      .eq('user_id', id)
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
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

    // Check if already doesn't have lifetime access
    if (consumer.lifetime_access !== true) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Consumer does not have lifetime access'
      });
    }

    // ========================================
    // 3. UPDATE LIFETIME ACCESS (with timeout)
    // ========================================
    const updateData = { lifetime_access: false };
    
    // If revoking lifetime access, set trial expiry based on trial_days parameter
    const createdAt = new Date(consumer.created_at);
    const trialExpiry = new Date(createdAt);
    
    if (trialDays !== null) {
      // Use provided trial_days
      trialExpiry.setDate(trialExpiry.getDate() + trialDays);
      updateData.trial_expiry = trialExpiry.toISOString();
      console.log(`📅 Setting trial_expiry (${trialDays} days from creation):`, updateData.trial_expiry);
    } else if (!consumer.trial_expiry) {
      // Default to 7 days if no trial_days provided and no existing trial_expiry
      trialExpiry.setDate(trialExpiry.getDate() + 7);
      updateData.trial_expiry = trialExpiry.toISOString();
      console.log('📅 Setting default trial_expiry (7 days from creation):', updateData.trial_expiry);
    }
    // If consumer.trial_expiry exists and no trial_days provided, keep existing trial_expiry

    const updatePromise = supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', id)
      .select()
      .maybeSingle();

    const { data: updatedConsumer, error } = await executeWithTimeout(updatePromise);

    if (error) {
      console.error('❌ Error revoking lifetime access:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to revoke lifetime access. Please try again.'
      });
    }

    if (!updatedConsumer) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Consumer not found after update'
      });
    }

    // ========================================
    // 4. LOG ACTIVITY (non-blocking)
    // ========================================
    const { actorId, actorRole } = await getActorInfo(req);
    logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'update',
      tableName: 'profiles',
      changedFields: {
        lifetime_access: {
          old: true,
          new: false
        }
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    }).catch(logError => {
      console.warn('⚠️ Failed to log activity:', logError?.message);
    });

    // ========================================
    // 5. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    await cacheService.delByPattern('consumers:*');
    console.log('✅ Cache invalidated for lifetime access revoke');

    // ========================================
    // 6. DATA SANITIZATION
    // ========================================
    const sanitizedConsumer = sanitizeObject(updatedConsumer);

    res.json({
      success: true,
      message: 'Lifetime access revoked successfully',
      data: sanitizedConsumer
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while revoking lifetime access.');
  }
};

/**
 * Reassign consumer to a different reseller (admin only)
 * @route   POST /api/consumers/:id/reassign
 * @access  Private (Admin with consumers.reassign permission)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Query timeout (Performance)
 * 3. Cache invalidation (Performance)
 * 4. Secure error handling (Security)
 * 5. Activity logging (Audit)
 */
export const reassignConsumerToReseller = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    const { reseller_id } = req.body;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }

    if (!reseller_id || !isValidUUID(reseller_id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid reseller ID format. Please provide a valid reseller_id in the request body.'
      });
    }

    // Cannot reassign to self
    if (id === reseller_id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Consumer cannot be reassigned to themselves'
      });
    }

    // ========================================
    // 2. VERIFY CONSUMER EXISTS (with timeout)
    // ========================================
    const consumerPromise = supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, referred_by')
      .eq('user_id', id)
      .contains('role', ['consumer']) // Check if role array contains 'consumer'
      .single();

    const { data: consumer, error: consumerError } = await executeWithTimeout(consumerPromise);

    if (consumerError || !consumer) {
      console.error('❌ Error fetching consumer:', consumerError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Verify consumer has consumer role
    if (!hasRole(consumer.role, 'consumer')) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'User is not a consumer'
      });
    }

    const oldResellerId = consumer.referred_by;

    // ========================================
    // 3. VERIFY RESELLER EXISTS (with timeout)
    // ========================================
    const resellerPromise = supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role')
      .eq('user_id', reseller_id)
      .single();

    const { data: reseller, error: resellerError } = await executeWithTimeout(resellerPromise);

    if (resellerError || !reseller) {
      console.error('❌ Error fetching reseller:', resellerError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    // Verify reseller has reseller role
    if (!hasRole(reseller.role, 'reseller')) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Target user is not a reseller'
      });
    }

    // Check if already assigned to this reseller
    if (oldResellerId === reseller_id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Consumer is already assigned to this reseller'
      });
    }

    // ========================================
    // 4. UPDATE REFERRED_BY (with timeout)
    // ========================================
    const updatePromise = supabase
      .from('profiles')
      .update({ referred_by: reseller_id })
      .eq('user_id', id)
      .select()
      .maybeSingle();

    const { data: updatedConsumer, error: updateError } = await executeWithTimeout(updatePromise);

    if (updateError || !updatedConsumer) {
      console.error('❌ Error updating consumer:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database Error',
        message: 'Failed to reassign consumer. Please try again.'
      });
    }

    // ========================================
    // 5. LOG ACTIVITY (non-blocking)
    // ========================================
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'update',
      tableName: 'profiles',
      changedFields: {
        referred_by: {
          old: oldResellerId,
          new: reseller_id,
          oldResellerName: oldResellerId ? 'Previous Reseller' : 'None',
          newResellerName: reseller.full_name || reseller.email
        }
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    }).catch(logError => {
      console.warn('⚠️ Failed to log activity:', logError?.message);
    });

    // ========================================
    // 6. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.CONSUMER_BY_ID(id));
    await cacheService.delByPattern('consumers:*');
    // Also invalidate reseller cache since consumer count changed
    await cacheService.delByPattern('resellers:*');
    console.log('✅ Cache invalidated for consumer reassignment');

    // ========================================
    // 7. DATA SANITIZATION
    // ========================================
    const sanitizedConsumer = sanitizeObject(updatedConsumer);

    res.json({
      success: true,
      message: `Consumer successfully reassigned from ${oldResellerId ? 'previous reseller' : 'no reseller'} to ${reseller.full_name || reseller.email}`,
      data: {
        ...sanitizedConsumer,
        old_reseller_id: oldResellerId,
        new_reseller_id: reseller_id,
        new_reseller_name: reseller.full_name || reseller.email
      }
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while reassigning the consumer.');
  }
};



export const getConsumerProductSettings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid consumer ID format'
      });
    }
    const consumerPromise = supabase
      .from('user_product_access')
      .select('product_settings')
      .eq('user_id', id)
      .maybeSingle();
    const { data: productAccess, error: productAccessError } = await executeWithTimeout(consumerPromise, 5000);

    if (productAccessError) {
      return handleApiError(productAccessError, res, 'An error occurred while fetching the consumer product settings.');
    }
    return res.json({
      success: true,
      data: productAccess?.product_settings || {}
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching the consumer product settings.');
  }
};
