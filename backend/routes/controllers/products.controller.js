import { supabase } from '../../config/database.js';

/**
 * Get all products
 * @route   GET /api/products
 * @access  Private (Admin)
 */
export const getAllProducts = async (req, res) => {
  try {
    console.log('📦 Fetching all products...');

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching products:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log(`✅ Found ${products.length} products`);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get product by ID
 * @route   GET /api/products/:id
 * @access  Private (Admin)
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📦 Fetching product with ID: ${id}`);

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      console.error('❌ Product not found:', error);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    console.log('✅ Product found:', product.name);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create new product
 * @route   POST /api/products
 * @access  Private (Admin)
 */
export const createProduct = async (req, res) => {
  try {
    const { name, description, price } = req.body;

    // Validate input
    if (!name || !description || price === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, description, and price are required'
      });
    }

    // Validate price is a positive number
    if (isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Price must be a positive number'
      });
    }

    console.log(`📦 Creating product: ${name}`);

    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price)
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating product:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log('✅ Product created successfully:', product.name);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update product
 * @route   PUT /api/products/:id
 * @access  Private (Admin)
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    // Validate input
    if (!name || !description || price === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, description, and price are required'
      });
    }

    // Validate price is a positive number
    if (isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Price must be a positive number'
      });
    }

    console.log(`📦 Updating product with ID: ${id}`);

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    // Update product
    const { data: product, error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating product:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log('✅ Product updated successfully:', product.name);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin)
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📦 Deleting product with ID: ${id}`);

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found'
      });
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting product:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    console.log('✅ Product deleted successfully:', existingProduct.name);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
