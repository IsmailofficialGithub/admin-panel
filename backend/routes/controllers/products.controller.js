import { supabaseAdmin } from '../../config/database.js';

/**
 * Get all products
 * @route GET /api/products
 */
const getAllProducts = async (req, res) => {
  try {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single product by ID
 * @route GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      console.error('Error fetching product:', error);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error('Error in getProductById:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new product
 * @route POST /api/products
 */
const createProduct = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Product name must be at least 2 characters' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ error: 'Product name must not exceed 255 characters' });
    }

    // Check if product with same name already exists
    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existingProduct) {
      return res.status(409).json({ error: 'A product with this name already exists' });
    }

    // Create product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error in createProduct:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a product
 * @route PUT /api/products/:id
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Product name must be at least 2 characters' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ error: 'Product name must not exceed 255 characters' });
    }

    // Check if another product with same name exists (excluding current product)
    const { data: duplicateProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('name', name.trim())
      .neq('id', id)
      .single();

    if (duplicateProduct) {
      return res.status(409).json({ error: 'A product with this name already exists' });
    }

    // Update product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error in updateProduct:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a product
 * @route DELETE /api/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

