import { createClient } from '../../lib/supabase/Production/client';

const API_URL = process.env.REACT_APP_Server_Url || 'http://localhost:5000/api';

/**
 * Get all products
 */
export const getAllProducts = async () => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to fetch products' };
    }

    return { success: true, data: data.data || [] };
  } catch (error) {
    console.error('Get products error:', error);
    return { error: 'Failed to fetch products' };
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (id) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to fetch product' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Get product error:', error);
    return { error: 'Failed to fetch product' };
  }
};

/**
 * Create new product
 */
export const createProduct = async (productData) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to create product' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Create product error:', error);
    return { error: 'Failed to create product' };
  }
};

/**
 * Update product
 */
export const updateProduct = async (id, productData) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to update product' };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Update product error:', error);
    return { error: 'Failed to update product' };
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (id) => {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || 'Failed to delete product' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete product error:', error);
    return { error: 'Failed to delete product' };
  }
};
