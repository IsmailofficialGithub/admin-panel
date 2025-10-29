/**
 * Backend API - Central Export
 * Import all API functions from here
 */

export {
  getAdminUsers,
  getUserById,
  createUser,
  updateUserRole,
  deleteUser,
  resetUserPassword
} from './users';

export {
  getConsumers,
  getConsumerById,
  createConsumer,
  updateConsumer,
  deleteConsumer,
  resetConsumerPassword,
  updateConsumerAccountStatus
} from './consumers';

export {
  getResellers,
  getResellerById,
  createReseller,
  updateReseller,
  deleteReseller,
  resetResellerPassword
} from './resellers';

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from './products';

// Re-export API client for direct access if needed
export { default as apiClient } from '../../services/apiClient';

