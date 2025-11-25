import { supabase, supabaseAdmin } from '../../config/database.js';
import { cacheService } from '../../config/redis.js';
import { logActivity } from '../../services/activityLogger.js';
import {
  sanitizeString,
  isValidUUID,
  validatePagination,
  sanitizeObject,
  sanitizeArray
} from '../../utils/validation.js';
import {
  executeWithTimeout,
  handleApiError,
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../../utils/apiOptimization.js';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const CACHE_KEYS = {
  ALL_PERMISSIONS: 'permissions:all',
  PERMISSIONS_BY_RESOURCE: (resource) => `permissions:resource:${resource}`,
  USER_PERMISSIONS: (userId) => `permissions:user:${userId}`,
  ROLE_PERMISSIONS: (role) => `permissions:role:${role}`,
};

// Export middleware for use in routes
export { sanitizeInputMiddleware };
export const rateLimitMiddleware = createRateLimitMiddleware('permissions', 100);

/**
 * Permissions Controller
 * Handles permission-related operations
 */

/**
 * Get all permissions
 * @route   GET /api/permissions
 * @access  Private (permissions.view)
 */
export const getAllPermissions = async (req, res) => {
  try {
    const { resource, action } = req.query;
    // Check cache
    const cacheKey = resource 
      ? CACHE_KEYS.PERMISSIONS_BY_RESOURCE(resource)
      : CACHE_KEYS.ALL_PERMISSIONS;
    
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for permissions');
      return res.json(cachedData);
    }

    // Build query
    let query = supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (resource) {
      query = query.eq('resource', sanitizeString(resource, 50));
    }
    if (action) {
      query = query.eq('action', sanitizeString(action, 50));
    }

    const { data, error } = await executeWithTimeout(query, 10000);

    if (error) {
      console.error('❌ Get permissions error:', error);
      return handleApiError(error, res, 'Failed to fetch permissions');
    }

    const result = {
      success: true,
      data: sanitizeArray(data || []),
      count: data?.length || 0
    };

    // Cache result
    await cacheService.set(cacheKey, result, CACHE_TTL);

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch permissions');
  }
};

/**
 * Get permission by ID
 * @route   GET /api/permissions/:id
 * @access  Private (permissions.view)
 */
export const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid permission ID'
      });
    }

    const cacheKey = `permissions:id:${id}`;
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const { data, error } = await executeWithTimeout(
      supabase
        .from('permissions')
        .select('*')
        .eq('id', id)
        .single(),
      10000
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Permission not found'
        });
      }
      return handleApiError(error, res, 'Failed to fetch permission');
    }

    const result = {
      success: true,
      data: sanitizeObject(data)
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch permission');
  }
};

/**
 * Get user permissions
 * @route   GET /api/permissions/user/:userId
 * @access  Private (permissions.view)
 */
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    // Check cache
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for user permissions');
      return res.json(cachedData);
    }

    // Use the get_user_permissions SQL function
    const { data, error } = await executeWithTimeout(
      supabase.rpc('get_user_permissions', { p_user_id: userId }),
      10000
    );

    if (error) {
      console.error('❌ Get user permissions error:', error);
      return handleApiError(error, res, 'Failed to fetch user permissions');
    }

    const result = {
      success: true,
      data: sanitizeArray(data || []),
      count: data?.length || 0
    };

    // Cache result
    await cacheService.set(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch user permissions');
  }
};

/**
 * Get current user permissions
 * @route   GET /api/permissions/me
 * @access  Private
 */
export const getMyPermissions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    // Check cache
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(req.user.id);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Use the get_user_permissions SQL function
    const { data, error } = await executeWithTimeout(
      supabase.rpc('get_user_permissions', { p_user_id: req.user.id }),
      10000
    );

    if (error) {
      console.error('❌ Get my permissions error:', error);
      return handleApiError(error, res, 'Failed to fetch permissions');
    }

    const result = {
      success: true,
      data: sanitizeArray(data || []),
      count: data?.length || 0
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch permissions');
  }
};

/**
 * Get role permissions
 * @route   GET /api/permissions/role/:role
 * @access  Private (permissions.view)
 */
export const getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const validRoles = ['admin', 'reseller', 'consumer', 'viewer'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid role. Must be one of: admin, reseller, consumer, viewer'
      });
    }

    // Check cache
    const cacheKey = CACHE_KEYS.ROLE_PERMISSIONS(role);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for role permissions');
      return res.json(cachedData);
    }

    const { data, error } = await executeWithTimeout(
      supabase
        .from('role_permissions')
        .select(`
          id,
          role,
          created_at,
          permissions (
            id,
            name,
            resource,
            action,
            description
          )
        `)
        .eq('role', role),
      10000
    );

    if (error) {
      console.error('❌ Get role permissions error:', error);
      return handleApiError(error, res, 'Failed to fetch role permissions');
    }

    const result = {
      success: true,
      data: sanitizeArray(data || []),
      count: data?.length || 0
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch role permissions');
  }
};

/**
 * Check if user has permission
 * @route   GET /api/permissions/check/:userId/:permissionName
 * @access  Private (permissions.view)
 */
export const checkUserPermission = async (req, res) => {
  try {
    const { userId, permissionName } = req.params;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    if (!permissionName || typeof permissionName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Permission name is required'
      });
    }

    const { data, error } = await executeWithTimeout(
      supabase.rpc('has_permission', {
        p_user_id: userId,
        p_permission_name: sanitizeString(permissionName, 100)
      }),
      10000
    );

    if (error) {
      console.error('❌ Check permission error:', error);
      return handleApiError(error, res, 'Failed to check permission');
    }

    res.json({
      success: true,
      data: sanitizeObject({
        userId,
        permissionName,
        hasPermission: data === true
      })
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to check permission');
  }
};

/**
 * Assign permissions to role
 * @route   POST /api/permissions/role/:role/assign
 * @access  Private (permissions.manage)
 */
export const assignPermissionsToRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissionIds } = req.body;

    const validRoles = ['admin', 'reseller', 'consumer', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid role'
      });
    }

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'permissionIds must be a non-empty array'
      });
    }

    // Validate all permission IDs
    const sanitizedIds = permissionIds.filter(id => {
      if (typeof id !== 'string') return false;
      return isValidUUID(id);
    });
    
    if (sanitizedIds.length !== permissionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'All permission IDs must be valid UUIDs'
      });
    }

    // Insert role permissions
    const rolePermissions = sanitizedIds.map(permissionId => ({
      role,
      permission_id: permissionId
    }));

    const { data, error } = await executeWithTimeout(
      supabase
        .from('role_permissions')
        .upsert(rolePermissions, {
          onConflict: 'role,permission_id',
          ignoreDuplicates: false
        })
        .select(),
      10000
    );

    if (error) {
      console.error('❌ Assign permissions to role error:', error);
      return handleApiError(error, res, 'Failed to assign permissions to role');
    }

    // Clear cache
    await cacheService.del(CACHE_KEYS.ROLE_PERMISSIONS(role));

    // Log activity (non-blocking)
    logActivity({
      actor_id: req.user.id,
      action: 'assign_permissions_to_role',
      resource_type: 'role_permissions',
      resource_id: role,
      details: {
        role,
        permissionIds: sanitizedIds,
        count: sanitizedIds.length
      }
    }).catch(err => console.error('Error logging activity:', err));

    res.json({
      success: true,
      message: `Successfully assigned ${sanitizedIds.length} permission(s) to role ${role}`,
      data: sanitizeArray(data || [])
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to assign permissions to role');
  }
};

/**
 * Remove permissions from role
 * @route   DELETE /api/permissions/role/:role/remove
 * @access  Private (permissions.manage)
 */
export const removePermissionsFromRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissionIds } = req.body;

    const validRoles = ['admin', 'reseller', 'consumer', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid role'
      });
    }

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'permissionIds must be a non-empty array'
      });
    }

    // Validate all permission IDs
    const sanitizedIds = permissionIds.filter(id => {
      if (typeof id !== 'string') return false;
      return isValidUUID(id);
    });
    
    if (sanitizedIds.length !== permissionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'All permission IDs must be valid UUIDs'
      });
    }

    const { error } = await executeWithTimeout(
      supabase
        .from('role_permissions')
        .delete()
        .eq('role', role)
        .in('permission_id', sanitizedIds),
      10000
    );

    if (error) {
      console.error('❌ Remove permissions from role error:', error);
      return handleApiError(error, res, 'Failed to remove permissions from role');
    }

    // Clear cache
    await cacheService.del(CACHE_KEYS.ROLE_PERMISSIONS(role));

    // Log activity (non-blocking)
    logActivity({
      actor_id: req.user.id,
      action: 'remove_permissions_from_role',
      resource_type: 'role_permissions',
      resource_id: role,
      details: {
        role,
        permissionIds: sanitizedIds,
        count: sanitizedIds.length
      }
    }).catch(err => console.error('Error logging activity:', err));

    res.json({
      success: true,
      message: `Successfully removed ${sanitizedIds.length} permission(s) from role ${role}`
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to remove permissions from role');
  }
};

/**
 * Assign permissions to user
 * @route   POST /api/permissions/user/:userId/assign
 * @access  Private (permissions.manage)
 */
export const assignPermissionsToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionIds, granted = true } = req.body;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'permissionIds must be a non-empty array'
      });
    }

    // Validate all permission IDs
    const sanitizedIds = permissionIds.filter(id => {
      if (typeof id !== 'string') return false;
      return isValidUUID(id);
    });
    
    if (sanitizedIds.length !== permissionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'All permission IDs must be valid UUIDs'
      });
    }

    // Insert user permissions
    const userPermissions = sanitizedIds.map(permissionId => ({
      user_id: userId,
      permission_id: permissionId,
      granted: granted === true
    }));

    const { data, error } = await executeWithTimeout(
      supabase
        .from('user_permissions')
        .upsert(userPermissions, {
          onConflict: 'user_id,permission_id',
          ignoreDuplicates: false
        })
        .select(),
      10000
    );

    if (error) {
      console.error('❌ Assign permissions to user error:', error);
      return handleApiError(error, res, 'Failed to assign permissions to user');
    }

    // Clear cache
    await cacheService.del(CACHE_KEYS.USER_PERMISSIONS(userId));

    // Log activity (non-blocking)
    logActivity({
      actor_id: req.user.id,
      action: 'assign_permissions_to_user',
      resource_type: 'user_permissions',
      resource_id: userId,
      details: {
        userId,
        permissionIds: sanitizedIds,
        granted,
        count: sanitizedIds.length
      }
    }).catch(err => console.error('Error logging activity:', err));

    res.json({
      success: true,
      message: `Successfully assigned ${sanitizedIds.length} permission(s) to user`,
      data: sanitizeArray(data || [])
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to assign permissions to user');
  }
};

/**
 * Remove permissions from user
 * @route   DELETE /api/permissions/user/:userId/remove
 * @access  Private (permissions.manage)
 */
export const removePermissionsFromUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionIds } = req.body;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'permissionIds must be a non-empty array'
      });
    }

    // Validate all permission IDs
    const sanitizedIds = permissionIds.filter(id => {
      if (typeof id !== 'string') return false;
      return isValidUUID(id);
    });
    
    if (sanitizedIds.length !== permissionIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'All permission IDs must be valid UUIDs'
      });
    }

    const { error } = await executeWithTimeout(
      supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .in('permission_id', sanitizedIds),
      10000
    );

    if (error) {
      console.error('❌ Remove permissions from user error:', error);
      return handleApiError(error, res, 'Failed to remove permissions from user');
    }

    // Clear cache
    await cacheService.del(CACHE_KEYS.USER_PERMISSIONS(userId));

    // Log activity (non-blocking)
    logActivity({
      actor_id: req.user.id,
      action: 'remove_permissions_from_user',
      resource_type: 'user_permissions',
      resource_id: userId,
      details: {
        userId,
        permissionIds: sanitizedIds,
        count: sanitizedIds.length
      }
    }).catch(err => console.error('Error logging activity:', err));

    res.json({
      success: true,
      message: `Successfully removed ${sanitizedIds.length} permission(s) from user`
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to remove permissions from user');
  }
};

/**
 * Set systemadmin status for user
 * @route   PATCH /api/permissions/user/:userId/systemadmin
 * @access  Private (permissions.manage - systemadmin only)
 */
export const setSystemAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_systemadmin } = req.body;

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }

    if (typeof is_systemadmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'is_systemadmin must be a boolean'
      });
    }

    const { data, error } = await executeWithTimeout(
      supabase
        .from('profiles')
        .update({ is_systemadmin })
        .eq('user_id', userId)
        .select('user_id, full_name, role, is_systemadmin')
        .single(),
      10000
    );

    if (error) {
      console.error('❌ Set systemadmin error:', error);
      return handleApiError(error, res, 'Failed to update systemadmin status');
    }

    // Clear user permissions cache
    await cacheService.del(CACHE_KEYS.USER_PERMISSIONS(userId));

    // Log activity (non-blocking)
    logActivity({
      actor_id: req.user.id,
      action: 'set_systemadmin',
      resource_type: 'profiles',
      resource_id: userId,
      details: {
        userId,
        is_systemadmin,
        targetUser: data.email
      }
    }).catch(err => console.error('Error logging activity:', err));

    res.json({
      success: true,
      message: `Successfully ${is_systemadmin ? 'granted' : 'revoked'} systemadmin status`,
      data: sanitizeObject(data)
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to update systemadmin status');
  }
};

/**
 * Get all users for system admin management
 * @route   GET /api/permissions/users
 * @access  Private (permissions.view - systemadmin only)
 */
export const getAllUsersForPermissions = async (req, res) => {
  try {
    const { search } = req.query;
    
    // Build query
    let query = supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, email, full_name, role, is_systemadmin')
      .order('full_name', { ascending: true });

    // Apply search filter if provided (search by email, full_name, or user_id)
    if (search && search.trim().length >= 2) {
      const searchTerm = sanitizeString(search.trim(), 100);
      query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,user_id.ilike.%${searchTerm}%`);
    }

    const { data, error } = await executeWithTimeout(query, 10000);

    if (error) {
      console.error('❌ Get users for permissions error:', error);
      return handleApiError(error, res, 'Failed to fetch users');
    }

    res.json({
      success: true,
      data: sanitizeArray(data || []),
      count: data?.length || 0
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch users');
  }
};

