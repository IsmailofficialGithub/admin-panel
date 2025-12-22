import { supabase } from '../../config/database.js';
import { cacheService } from '../../config/redis.js';
import {
  sanitizeString,
  isValidUUID,
  validatePagination,
  sanitizeObject,
  sanitizeArray
} from '../../utils/validation.js';
import {
  executeWithTimeout,
  handleApiError,
  createPaginatedResponse
} from '../../utils/apiOptimization.js';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_KEYS = {
  ALL_PACKAGES: (page, limit, productId) => `packages:list:page${page}_limit${limit}_product${productId || 'all'}`,
  PACKAGE_BY_ID: (id) => `packages:id:${id}`,
  PACKAGES_BY_PRODUCT: (productId) => `packages:product:${productId}`,
};

// Export middleware for use in routes
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../../utils/apiOptimization.js';
export const rateLimitMiddleware = createRateLimitMiddleware('packages', 100);
export { sanitizeInputMiddleware };

/**
 * Get all packages with pagination and optional product filter
 * @route   GET /api/packages?page=1&limit=50&productId=xxx
 * @access  Private (Admin/Reseller/Consumer)
 * 
 * OPTIMIZATIONS:
 * 1. Pagination support (Performance)
 * 2. Product filter support (Performance)
 * 3. Field selection instead of * (Performance)
 * 4. Query timeout (Performance)
 * 5. Better error handling (Security)
 * 6. Data sanitization (Security)
 * 7. Redis caching (Performance)
 */
export const getAllPackages = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & PAGINATION
    // ========================================
    const { page, limit, productId } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    // Validate productId if provided
    if (productId && !isValidUUID(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid product ID format'
      });
    }

    console.log('📦 Fetching packages with pagination:', { page: pageNum, limit: limitNum, productId });

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.ALL_PACKAGES(pageNum, limitNum, productId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for packages list');
      return res.json(cachedData);
    }

    console.log('❌ Cache MISS for packages list - fetching from database');

    // ========================================
    // 3. OPTIMIZED DATABASE QUERY
    // ========================================
    let query = supabase
      .from('packages')
      .select('id, product_id, name, description, price, created_at, updated_at, products:product_id (id, name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by product if provided
    if (productId) {
      query = query.eq('product_id', productId);
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: packages, error, count } = await executeWithTimeout(query);

    // ========================================
    // 4. ERROR HANDLING (Security)
    // ========================================
    if (error) {
      console.error('❌ Error fetching packages:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to fetch packages. Please try again.'
      });
    }

    console.log(`✅ Found ${packages?.length || 0} packages`);

    // ========================================
    // 5. ENRICH PACKAGES WITH PRODUCT NAME
    // ========================================
    const enrichedPackages = (packages || []).map(pkg => ({
      ...pkg,
      product_name: pkg.products?.name || null
    }));

    // ========================================
    // 6. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedPackages = sanitizeArray(enrichedPackages);

    // ========================================
    // 6. RESPONSE STRUCTURE
    // ========================================
    const response = createPaginatedResponse(sanitizedPackages, count, pageNum, limitNum);

    // ========================================
    // 7. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching packages.');
  }
};

/**
 * Get packages by product ID
 * @route   GET /api/packages/product/:productId
 * @access  Private (Admin/Reseller/Consumer)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Field selection instead of * (Performance)
 * 3. Query timeout (Performance)
 * 4. Secure error handling (Security)
 * 5. Data sanitization (Security)
 * 6. Redis caching (Performance)
 */
export const getPackagesByProduct = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { productId } = req.params;

    if (!productId || !isValidUUID(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid product ID format'
      });
    }

    console.log(`📦 Fetching packages for product: ${productId}`);

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.PACKAGES_BY_PRODUCT(productId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for packages by product ${productId}`);
      return res.json(cachedData);
    }

    console.log(`❌ Cache MISS for packages by product ${productId} - fetching from database`);

    // ========================================
    // 3. OPTIMIZED DATABASE QUERY
    // ========================================
    const query = supabase
      .from('packages')
      .select('id, product_id, name, description, price, created_at, updated_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    const { data: packages, error } = await executeWithTimeout(query);

    // ========================================
    // 4. ERROR HANDLING (Security)
    // ========================================
    if (error) {
      console.error('❌ Error fetching packages by product:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to fetch packages. Please try again.'
      });
    }

    console.log(`✅ Found ${packages?.length || 0} packages for product ${productId}`);

    // ========================================
    // 5. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedPackages = sanitizeArray(packages || []);

    const response = {
      success: true,
      data: sanitizedPackages
    };

    // ========================================
    // 6. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching packages.');
  }
};

/**
 * Get package by ID
 * @route   GET /api/packages/:id
 * @access  Private (Admin/Reseller/Consumer)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Field selection instead of * (Performance)
 * 3. Query timeout (Performance)
 * 4. Secure error handling (Security)
 * 5. Data sanitization (Security)
 * 6. Redis caching (Performance)
 */
export const getPackageById = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid package ID format'
      });
    }

    console.log(`📦 Fetching package with ID: ${id}`);

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.PACKAGE_BY_ID(id);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for package ${id}`);
      return res.json(cachedData);
    }

    console.log(`❌ Cache MISS for package ${id} - fetching from database`);

    // ========================================
    // 3. OPTIMIZED DATABASE QUERY
    // ========================================
    const query = supabase
      .from('packages')
      .select('id, product_id, name, description, price, created_at, updated_at')
      .eq('id', id)
      .single();

    const { data: packageData, error } = await executeWithTimeout(query);

    // ========================================
    // 4. ERROR HANDLING (Security)
    // ========================================
    if (error || !packageData) {
      console.error('❌ Package not found:', error);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Package not found'
      });
    }

    console.log('✅ Package found:', packageData.name);

    // ========================================
    // 5. DATA SANITIZATION (Security)
    // ========================================
    const sanitizedPackage = sanitizeObject(packageData);

    const response = {
      success: true,
      data: sanitizedPackage
    };

    // ========================================
    // 6. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching the package.');
  }
};

/**
 * Create new package
 * @route   POST /api/packages
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const createPackage = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    let { product_id, name, description, price } = req.body;

    // Validate required fields
    if (!product_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Product ID and name are required'
      });
    }

    // Validate product_id is a valid UUID
    if (!isValidUUID(product_id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid product ID format'
      });
    }

    // Sanitize inputs
    name = sanitizeString(name, 255);
    description = description ? sanitizeString(description, 1000) : null;

    // Validate name length
    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Package name must be at least 2 characters long'
      });
    }

    // Validate price if provided
    let priceNum = null;
    if (price !== undefined && price !== null) {
      priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Price must be a non-negative number'
        });
      }
    }

    // Verify product exists
    const productCheck = await supabase
      .from('products')
      .select('id, name')
      .eq('id', product_id)
      .single();

    if (productCheck.error || !productCheck.data) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    console.log(`📦 Creating package: ${name} for product: ${productCheck.data.name}`);

    // ========================================
    // 2. CREATE PACKAGE (with timeout)
    // ========================================
    const insertPromise = supabase
      .from('packages')
      .insert([{
        product_id,
        name: name.trim(),
        description: description ? description.trim() : null,
        price: priceNum
      }])
      .select('id, product_id, name, description, price, created_at, updated_at')
      .single();

    const { data: packageData, error } = await executeWithTimeout(insertPromise);

    if (error) {
      console.error('❌ Error creating package:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'A package with this name already exists for this product'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to create package. Please try again.'
      });
    }

    console.log('✅ Package created successfully:', packageData.name);

    // ========================================
    // 3. CACHE INVALIDATION
    // ========================================
    await cacheService.delByPattern('packages:list:*');
    await cacheService.del(CACHE_KEYS.PACKAGES_BY_PRODUCT(product_id));
    console.log('✅ Cache invalidated for package creation');

    // ========================================
    // 4. DATA SANITIZATION
    // ========================================
    const sanitizedPackage = sanitizeObject(packageData);

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: sanitizedPackage
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while creating the package.');
  }
};

/**
 * Update package
 * @route   PUT /api/packages/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. UUID validation (Security)
 * 3. Secure error handling (Security)
 * 4. Query timeout (Performance)
 */
export const updatePackage = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;
    let { product_id, name, description, price } = req.body;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid package ID format'
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Name is required'
      });
    }

    // Validate product_id if provided
    if (product_id && !isValidUUID(product_id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid product ID format'
      });
    }

    // Sanitize inputs
    name = sanitizeString(name, 255);
    description = description ? sanitizeString(description, 1000) : null;

    // Validate name length
    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Package name must be at least 2 characters long'
      });
    }

    // Validate price if provided
    let priceNum = null;
    if (price !== undefined && price !== null) {
      priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Price must be a non-negative number'
        });
      }
    }

    console.log(`📦 Updating package with ID: ${id}`);

    // ========================================
    // 2. CHECK IF PACKAGE EXISTS (with timeout)
    // ========================================
    const checkPromise = supabase
      .from('packages')
      .select('id, name, product_id')
      .eq('id', id)
      .single();

    const { data: existingPackage, error: fetchError } = await executeWithTimeout(checkPromise);

    if (fetchError || !existingPackage) {
      console.error('❌ Package not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Package not found'
      });
    }

    // Verify product exists if product_id is being changed
    if (product_id && product_id !== existingPackage.product_id) {
      const productCheck = await supabase
        .from('products')
        .select('id, name')
        .eq('id', product_id)
        .single();

      if (productCheck.error || !productCheck.data) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Product not found'
        });
      }
    }

    // ========================================
    // 3. UPDATE PACKAGE (with timeout)
    // ========================================
    const updateData = {
      name: name.trim(),
      description: description ? description.trim() : null,
      updated_at: new Date().toISOString()
    };

    if (product_id) {
      updateData.product_id = product_id;
    }

    if (priceNum !== null) {
      updateData.price = priceNum;
    }

    const updatePromise = supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select('id, product_id, name, description, price, created_at, updated_at')
      .single();

    const { data: packageData, error } = await executeWithTimeout(updatePromise);

    if (error) {
      console.error('❌ Error updating package:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'A package with this name already exists for this product'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to update package. Please try again.'
      });
    }

    console.log('✅ Package updated successfully:', packageData.name);

    // ========================================
    // 4. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.PACKAGE_BY_ID(id));
    await cacheService.delByPattern('packages:list:*');
    if (packageData.product_id) {
      await cacheService.del(CACHE_KEYS.PACKAGES_BY_PRODUCT(packageData.product_id));
    }
    if (existingPackage.product_id !== packageData.product_id) {
      await cacheService.del(CACHE_KEYS.PACKAGES_BY_PRODUCT(existingPackage.product_id));
    }
    console.log('✅ Cache invalidated for package update');

    // ========================================
    // 5. DATA SANITIZATION
    // ========================================
    const sanitizedPackage = sanitizeObject(packageData);

    res.json({
      success: true,
      message: 'Package updated successfully',
      data: sanitizedPackage
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while updating the package.');
  }
};

/**
 * Delete package
 * @route   DELETE /api/packages/:id
 * @access  Private (Admin)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Secure error handling (Security)
 * 3. Query timeout (Performance)
 */
export const deletePackage = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { id } = req.params;

    if (!id || !isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid package ID format'
      });
    }

    console.log(`📦 Deleting package with ID: ${id}`);

    // ========================================
    // 2. CHECK IF PACKAGE EXISTS (with timeout)
    // ========================================
    const checkPromise = supabase
      .from('packages')
      .select('id, name, product_id')
      .eq('id', id)
      .single();

    const { data: existingPackage, error: fetchError } = await executeWithTimeout(checkPromise);

    if (fetchError || !existingPackage) {
      console.error('❌ Package not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Package not found'
      });
    }

    // ========================================
    // 3. DELETE PACKAGE (with timeout)
    // ========================================
    const deletePromise = supabase
      .from('packages')
      .delete()
      .eq('id', id);

    const { error } = await executeWithTimeout(deletePromise);

    if (error) {
      console.error('❌ Error deleting package:', error);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Failed to delete package. Please try again.'
      });
    }

    console.log('✅ Package deleted successfully:', existingPackage.name);

    // ========================================
    // 4. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.PACKAGE_BY_ID(id));
    await cacheService.delByPattern('packages:list:*');
    if (existingPackage.product_id) {
      await cacheService.del(CACHE_KEYS.PACKAGES_BY_PRODUCT(existingPackage.product_id));
    }
    console.log('✅ Cache invalidated for package deletion');

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while deleting the package.');
  }
};

