import express from 'express';
import { authenticate, loadUserProfile } from '../middleware/auth.js';
import { requirePermission, requireSystemAdmin } from '../middleware/permissions.js';
import {
  getAllPermissions,
  getPermissionById,
  getUserPermissions,
  getMyPermissions,
  getRolePermissions,
  checkUserPermission,
  assignPermissionsToRole,
  removePermissionsFromRole,
  assignPermissionsToUser,
  removePermissionsFromUser,
  setSystemAdmin,
  getAllUsersForPermissions,
  rateLimitMiddleware,
  sanitizeInputMiddleware
} from './controllers/permissions.controller.js';

const router = express.Router();

/**
 * @route   GET /api/permissions
 * @desc    Get all permissions (with optional resource/action filters)
 * @access  Private (permissions.view)
 */
router.get(
  '/',
  authenticate,
  loadUserProfile,
  requirePermission('permissions.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllPermissions
);

/**
 * @route   GET /api/permissions/me
 * @desc    Get current user's permissions
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  loadUserProfile,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getMyPermissions
);

/**
 * @route   GET /api/permissions/check/:userId/:permissionName
 * @desc    Check if user has specific permission
 * @access  Private (permissions.view)
 */
router.get(
  '/check/:userId/:permissionName',
  authenticate,
  loadUserProfile,
  requirePermission('permissions.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  checkUserPermission
);

/**
 * @route   GET /api/permissions/user/:userId
 * @desc    Get user permissions
 * @access  Private (permissions.view)
 */
router.get(
  '/user/:userId',
  authenticate,
  loadUserProfile,
  requirePermission('permissions.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getUserPermissions
);

/**
 * @route   GET /api/permissions/role/:role
 * @desc    Get role permissions
 * @access  Private (permissions.view)
 */
router.get(
  '/role/:role',
  authenticate,
  loadUserProfile,
  requirePermission('permissions.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getRolePermissions
);

/**
 * @route   GET /api/permissions/users
 * @desc    Get all users for permissions management
 * @access  Private (permissions.view) - Systemadmin only
 * NOTE: This must come before /:id route to avoid route conflict
 */
router.get(
  '/users',
  authenticate,
  loadUserProfile,
  requireSystemAdmin,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getAllUsersForPermissions
);

/**
 * @route   GET /api/permissions/:id
 * @desc    Get permission by ID
 * @access  Private (permissions.view)
 */
router.get(
  '/:id',
  authenticate,
  loadUserProfile,
  requirePermission('permissions.view'),
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  getPermissionById
);

/**
 * @route   POST /api/permissions/role/:role/assign
 * @desc    Assign permissions to role
 * @access  Private (permissions.manage) - Systemadmin only
 */
router.post(
  '/role/:role/assign',
  authenticate,
  loadUserProfile,
  requireSystemAdmin,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  assignPermissionsToRole
);

/**
 * @route   DELETE /api/permissions/role/:role/remove
 * @desc    Remove permissions from role
 * @access  Private (permissions.manage) - Systemadmin only
 */
router.delete(
  '/role/:role/remove',
  authenticate,
  loadUserProfile,
  requireSystemAdmin,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  removePermissionsFromRole
);

/**
 * @route   POST /api/permissions/user/:userId/assign
 * @desc    Assign permissions to user
 * @access  Private (permissions.manage) - Systemadmin only
 */
router.post(
  '/user/:userId/assign',
  authenticate,
  loadUserProfile,
  requireSystemAdmin,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  assignPermissionsToUser
);

/**
 * @route   DELETE /api/permissions/user/:userId/remove
 * @desc    Remove permissions from user
 * @access  Private (permissions.manage) - Systemadmin only
 */
router.delete(
  '/user/:userId/remove',
  authenticate,
  loadUserProfile,
  requireSystemAdmin,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  removePermissionsFromUser
);

/**
 * @route   PATCH /api/permissions/user/:userId/systemadmin
 * @desc    Set systemadmin status for user
 * @access  Private (permissions.manage) - Systemadmin only
 */
router.patch(
  '/user/:userId/systemadmin',
  authenticate,
  loadUserProfile,
  requireSystemAdmin,
  rateLimitMiddleware,
  sanitizeInputMiddleware,
  setSystemAdmin
);

export default router;

