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
  resetUserPassword,
  updateUserAccountStatus
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
  resetResellerPassword,
  updateResellerAccountStatus
} from './resellers';

export {
  getAllProducts as getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from './products';

export {
  getAllInvoices,
  getMyInvoices,
  getConsumerProductsForInvoice,
  createInvoice
} from './invoices';

export {
  getDashboardStats
} from './dashboard';

// Re-export API client for direct access if needed
export { default as apiClient } from '../../services/apiClient';

