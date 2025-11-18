import { supabase } from '../../config/database.js';
import productDbManager from '../../services/productDatabaseManager.js';

/**
 * Get product detail with database info
 * @route   GET /api/admin/products/:id
 * @access  Private (Admin)
 */
export const getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    // Get product database config if exists
    let dbConfig = null;
    let healthStatus = null;
    
    try {
      const { data: dbData } = await supabase
        .from('product_databases')
        .select('*')
        .eq('product_id', id)
        .single();

      if (dbData) {
        dbConfig = {
          id: dbData.id,
          product_name: dbData.product_name,
          db_type: dbData.db_type,
          is_active: dbData.is_active,
          health_status: dbData.health_status,
          last_health_check: dbData.last_health_check
        };

        // Perform health check
        healthStatus = await productDbManager.healthCheck(id);
      }
    } catch (dbError) {
      // Product database not configured yet
      console.log('Product database not configured:', dbError.message);
    }

    res.json({
      success: true,
      data: {
        product,
        database: dbConfig,
        health: healthStatus
      }
    });
  } catch (error) {
    console.error('Get product detail error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get product dashboard data
 * @route   GET /api/admin/products/:id/dashboard
 * @access  Private (Admin)
 */
export const getProductDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product database is configured
    const { data: dbConfig } = await supabase
      .from('product_databases')
      .select('*')
      .eq('product_id', id)
      .single();

    if (!dbConfig) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database not configured'
      });
    }

    // Get stats from product database
    const stats = await productDbManager.getProductStats(id);
    const health = await productDbManager.healthCheck(id);

    res.json({
      success: true,
      data: {
        productId: id,
        productName: dbConfig.product_name,
        stats,
        health
      }
    });
  } catch (error) {
    console.error('Get product dashboard error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get product users
 * @route   GET /api/admin/products/:id/users
 * @access  Private (Admin)
 */
export const getProductUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, ...filters } = req.query;

    // Check if product database is configured
    const { data: dbConfig } = await supabase
      .from('product_databases')
      .select('*')
      .eq('product_id', id)
      .single();

    if (!dbConfig) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database not configured'
      });
    }

    const users = await productDbManager.getProductUsers(id, filters);

    // Pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paginatedUsers = users.slice(start, end);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get product users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get all tables in product database
 * @route   GET /api/admin/products/:id/tables
 * @access  Private (Admin)
 */
export const getProductTables = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product database is configured
    const { data: dbConfig } = await supabase
      .from('product_databases')
      .select('*')
      .eq('product_id', id)
      .single();

    if (!dbConfig) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database not configured'
      });
    }

    const tables = await productDbManager.getProductTables(id);

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('Get product tables error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get table details
 * @route   GET /api/admin/products/:id/tables/:tableName
 * @access  Private (Admin)
 */
export const getTableDetails = async (req, res) => {
  try {
    const { id, tableName } = req.params;

    // Check if product database is configured
    const { data: dbConfig } = await supabase
      .from('product_databases')
      .select('*')
      .eq('product_id', id)
      .single();

    if (!dbConfig) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product database not configured'
      });
    }

    const tableDetails = await productDbManager.getTableDetails(id, tableName);

    res.json({
      success: true,
      data: tableDetails
    });
  } catch (error) {
    console.error('Get table details error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

