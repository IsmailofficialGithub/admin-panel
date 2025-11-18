import { supabase } from '../../config/database.js';
import productDbManager from '../../services/productDatabaseManager.js';
import { getActorInfo, logActivity, getClientIp, getUserAgent } from '../../services/activityLogger.js';

/**
 * Get all product database configurations
 * @route   GET /api/admin/product-databases
 * @access  Private (Admin)
 */
export const getAllProductDatabases = async (req, res) => {
  try {
    const { data: productDbs, error } = await supabase
      .from('product_databases')
      .select(`
        *,
        products:product_id (
          id,
          name,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product databases:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch product databases'
      });
    }

    // Don't expose encrypted keys in list view
    const sanitized = productDbs.map(db => ({
      ...db,
      supabase_service_key_encrypted: db.supabase_service_key_encrypted ? '***encrypted***' : null,
      postgres_user_encrypted: db.postgres_user_encrypted ? '***encrypted***' : null,
      postgres_password_encrypted: db.postgres_password_encrypted ? '***encrypted***' : null
    }));

    res.json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    console.error('Get product databases error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get product database configuration by product ID
 * @route   GET /api/admin/product-databases/:productId
 * @access  Private (Admin)
 */
export const getProductDatabase = async (req, res) => {
  try {
    const { productId } = req.params;

    const { data: productDb, error } = await supabase
      .from('product_databases')
      .select(`
        *,
        products:product_id (
          id,
          name,
          description
        )
      `)
      .eq('product_id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Product database configuration not found'
        });
      }
      console.error('Error fetching product database:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch product database'
      });
    }

    // Don't expose encrypted keys
    const sanitized = {
      ...productDb,
      supabase_service_key_encrypted: productDb.supabase_service_key_encrypted ? '***encrypted***' : null,
      postgres_user_encrypted: productDb.postgres_user_encrypted ? '***encrypted***' : null,
      postgres_password_encrypted: productDb.postgres_password_encrypted ? '***encrypted***' : null
    };

    res.json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    console.error('Get product database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Test credentials before saving
 * @route   POST /api/admin/product-databases/test-credentials
 * @access  Private (Admin)
 */
export const testCredentialsBeforeSave = async (req, res) => {
  try {
    const {
      db_type = 'supabase',
      supabase_url,
      supabase_service_key,
      postgres_host,
      postgres_port,
      postgres_database,
      postgres_user,
      postgres_password
    } = req.body;

    // Validate required fields
    if (db_type === 'supabase') {
      if (!supabase_url || !supabase_service_key) {
        return res.status(400).json({
          success: false,
          error: 'Supabase URL and service key are required'
        });
      }
    } else if (db_type === 'postgres') {
      if (!postgres_host || !postgres_database || !postgres_user || !postgres_password) {
        return res.status(400).json({
          success: false,
          error: 'All PostgreSQL connection details are required'
        });
      }
    }

    // Test credentials
    const testResult = await productDbManager.testCredentials({
      db_type,
      supabase_url,
      supabase_service_key,
      postgres_host,
      postgres_port,
      postgres_database,
      postgres_user,
      postgres_password
    });

    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message || 'Credentials are valid'
      });
    } else {
      res.status(400).json({
        success: false,
        error: testResult.error || 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Test credentials error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create or update product database configuration
 * @route   POST /api/admin/product-databases
 * @route   PUT /api/admin/product-databases/:productId
 * @access  Private (Admin)
 */
export const upsertProductDatabase = async (req, res) => {
  try {
    // For POST: productId comes from body, for PUT: from params
    const productId = req.params.productId || req.body.product_id;
    
    if (!productId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product ID is required'
      });
    }

    const {
      product_name,
      db_type = 'supabase',
      supabase_url,
      supabase_service_key,
      postgres_host,
      postgres_port,
      postgres_database,
      postgres_user,
      postgres_password,
      schema_name = 'public',
      is_active = true
    } = req.body;

    // Validate product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    // Check if configuration exists (for updates)
    // First check if product already has a database configured
    const { data: existingConfigs, error: existingError } = await supabase
      .from('product_databases')
      .select('id, product_name')
      .eq('product_id', productId);

    // Determine if this is an update (PUT with productId in params) or create (POST)
    const isUpdate = !!req.params.productId;
    const existing = existingConfigs && existingConfigs.length > 0 ? existingConfigs[0] : null;

    // If creating new (POST) and product already has a database, prevent it
    if (!isUpdate && existingConfigs && existingConfigs.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `This product already has a database configuration. Each product can only have one database. Please update the existing configuration instead of creating a new one.`
      });
    }

    // If updating but no existing config found, it's an error
    if (isUpdate && (!existingConfigs || existingConfigs.length === 0)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database configuration not found. Cannot update a non-existent configuration.'
      });
    }

    // Validate required fields based on db_type
    if (db_type === 'supabase') {
      if (!supabase_url) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Supabase URL is required for Supabase databases'
        });
      }
      // Service key required only for new configurations or when updating
      const needsServiceKey = !existing || (existing && supabase_service_key && supabase_service_key !== '***encrypted***');
      if (needsServiceKey && !supabase_service_key) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Supabase service key is required'
        });
      }
    } else if (db_type === 'postgres') {
      if (!postgres_host || !postgres_database) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'PostgreSQL host and database name are required'
        });
      }
      // Credentials required only for new configurations or when updating
      const needsCredentials = !existing || 
        (existing && ((postgres_user && postgres_user !== '***encrypted***') || 
                      (postgres_password && postgres_password !== '***encrypted***')));
      if (needsCredentials && (!postgres_user || !postgres_password)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'PostgreSQL username and password are required'
        });
      }
    }

    // Test credentials before saving (only if new credentials are provided)
    if (db_type === 'supabase' && supabase_service_key && supabase_service_key !== '***encrypted***') {
      const testResult = await productDbManager.testCredentials({
        db_type: 'supabase',
        supabase_url,
        supabase_service_key
      });

      if (!testResult.success) {
        return res.status(400).json({
          error: 'Connection Test Failed',
          message: testResult.error || 'Invalid credentials. Please check your Supabase URL and service key.'
        });
      }
    }

    // Encrypt sensitive data
    const encryptedData = {
      product_id: productId,
      product_name: product_name || product.name,
      db_type,
      schema_name,
      is_active,
      updated_at: new Date().toISOString()
    };

    if (db_type === 'supabase') {
      encryptedData.supabase_url = supabase_url;
      // Only encrypt and update service key if provided
      if (supabase_service_key) {
        encryptedData.supabase_service_key_encrypted = productDbManager.encrypt(supabase_service_key);
      }
    } else if (db_type === 'postgres') {
      encryptedData.postgres_host = postgres_host;
      encryptedData.postgres_port = postgres_port || 5432;
      encryptedData.postgres_database = postgres_database;
      // Only encrypt and update credentials if provided
      if (postgres_user) {
        encryptedData.postgres_user_encrypted = productDbManager.encrypt(postgres_user);
      }
      if (postgres_password) {
        encryptedData.postgres_password_encrypted = productDbManager.encrypt(postgres_password);
      }
    }


    if (existing) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from('product_databases')
        .update(encryptedData)
        .eq('product_id', productId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating product database:', updateError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to update product database configuration'
        });
      }

      // Log activity
      const { actorId, actorRole } = await getActorInfo(req);
      await logActivity({
        actorId,
        actorRole,
        targetId: productId,
        actionType: 'update',
        tableName: 'product_databases',
        changedFields: { product_id: productId, ...encryptedData },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      // Clear connection cache
      productDbManager.connections.delete(productId);

      res.json({
        success: true,
        message: 'Product database configuration updated successfully',
        data: {
          ...updated,
          supabase_service_key_encrypted: '***encrypted***',
          postgres_user_encrypted: updated.postgres_user_encrypted ? '***encrypted***' : null,
          postgres_password_encrypted: updated.postgres_password_encrypted ? '***encrypted***' : null
        }
      });
    } else {
      // Create new
      encryptedData.created_at = new Date().toISOString();

      const { data: created, error: createError } = await supabase
        .from('product_databases')
        .insert(encryptedData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating product database:', createError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create product database configuration'
        });
      }

      // Log activity
      const { actorId, actorRole } = await getActorInfo(req);
      await logActivity({
        actorId,
        actorRole,
        targetId: productId,
        actionType: 'create',
        tableName: 'product_databases',
        changedFields: { product_id: productId, ...encryptedData },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      res.status(201).json({
        success: true,
        message: 'Product database configuration created successfully',
        data: {
          ...created,
          supabase_service_key_encrypted: '***encrypted***',
          postgres_user_encrypted: created.postgres_user_encrypted ? '***encrypted***' : null,
          postgres_password_encrypted: created.postgres_password_encrypted ? '***encrypted***' : null
        }
      });
    }
  } catch (error) {
    console.error('Upsert product database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete product database configuration
 * @route   DELETE /api/admin/product-databases/:productId
 * @access  Private (Admin)
 */
export const deleteProductDatabase = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('product_databases')
      .select('id, product_name')
      .eq('product_id', productId)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database configuration not found'
      });
    }

    // Delete
    const { error: deleteError } = await supabase
      .from('product_databases')
      .delete()
      .eq('product_id', productId);

    if (deleteError) {
      console.error('Error deleting product database:', deleteError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete product database configuration'
      });
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: productId,
      actionType: 'delete',
      tableName: 'product_databases',
      changedFields: { product_id: productId },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    // Clear connection cache
    productDbManager.connections.delete(productId);

    res.json({
      success: true,
      message: 'Product database configuration deleted successfully'
    });
  } catch (error) {
    console.error('Delete product database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Test product database connection
 * @route   POST /api/admin/product-databases/:productId/test
 * @access  Private (Admin)
 */
export const testProductDatabaseConnection = async (req, res) => {
  try {
    const { productId } = req.params;

    // Get configuration
    const { data: config, error: configError } = await supabase
      .from('product_databases')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (configError || !config) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database configuration not found'
      });
    }

    // Test connection
    const healthCheck = await productDbManager.healthCheck(productId);

    res.json({
      success: healthCheck.status === 'healthy',
      message: healthCheck.status === 'healthy' 
        ? 'Connection test successful' 
        : `Connection test failed: ${healthCheck.error || 'Unknown error'}`,
      data: healthCheck
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
