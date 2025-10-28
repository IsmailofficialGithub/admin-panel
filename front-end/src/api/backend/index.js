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
  resetConsumerPassword
} from './consumers';

export {
  getResalers,
  getResalerById,
  createResaler,
  updateResaler,
  deleteResaler,
  resetResalerPassword
} from './resalers';

// Re-export API client for direct access if needed
export { default as apiClient } from '../../services/apiClient';

