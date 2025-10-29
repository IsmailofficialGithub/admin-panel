/**
 * Products API (Backend)
 * These functions call the backend API for product management
 */

import apiClient from '../../services/apiClient';

/**
 * Get all products
 * @returns {Promise<Array>} List of products
 */
export const getProducts = async () => {
  try {
    const products = await apiClient.products.getAll();
    // apiClient already extracts response.data via interceptor
    return products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return { error: error.message };
  }
};

/**
 * Get a single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Product data
 */
export const getProductById = async (id) => {
  try {
    const product = await apiClient.products.getById(id);
    // apiClient already extracts response.data via interceptor
    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return { error: error.message };
  }
};

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    const product = await apiClient.products.create(productData);
    // apiClient already extracts response.data via interceptor
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    return { error: error.message };
  }
};

/**
 * Update a product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, productData) => {
  try {
    const product = await apiClient.products.update(id, productData);
    // apiClient already extracts response.data via interceptor
    return product;
  } catch (error) {
    console.error('Error updating product:', error);
    return { error: error.message };
  }
};

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteProduct = async (id) => {
  try {
    const result = await apiClient.products.delete(id);
    // apiClient already extracts response.data via interceptor
    return result;
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error: error.message };
  }
};

