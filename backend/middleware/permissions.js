import { supabase } from '../config/database.js';

/**
 * Permission Middleware
 * Uses the has_permission() SQL function to check user permissions
 */

/**
 * Middleware to check if user has a specific permission
 * @param {string} permissionName - The permission name (e.g., 'users.create', 'invoices.delete')
 * @returns {Function} Express middleware function
 */
export const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      // Ensure userProfile is loaded
      if (!req.userProfile) {
        try {
          const profilePromise = supabase
            .from('auth_role_with_profiles')
            .select('user_id, email, full_name, role, account_status, is_systemadmin')
            .eq('user_id', req.user.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 25000)
          );

          const result = await Promise.race([profilePromise, timeoutPromise]);
          
          if (result.error || !result.data) {
            req.userProfile = {
              user_id: req.user.id,
              email: req.user.email,
              full_name: req.user.email,
              role: 'admin',
              account_status: 'active',
              is_systemadmin: false
            };
          } else {
            req.userProfile = result.data;
          }
        } catch (timeoutError) {
          console.error('❌ Profile fetch timeout:', timeoutError);
          req.userProfile = {
            user_id: req.user.id,
            email: req.user.email,
            full_name: req.user.email,
            role: 'admin',
            account_status: 'active',
            is_systemadmin: false
          };
        }
      }

      // Check if user is systemadmin (has all permissions)
      if (req.userProfile.is_systemadmin === true) {
        return next();
      }

      // Call the has_permission SQL function
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: req.user.id,
        p_permission_name: permissionName
      });

      if (error) {
        console.error('❌ Permission check error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to check permission'
        });
      }

      if (data === true) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Permission required: ${permissionName}`
      });
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has ANY of the specified permissions
 * @param {string[]} permissionNames - Array of permission names
 * @returns {Function} Express middleware function
 */
export const requireAnyPermission = (permissionNames = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      if (!req.userProfile) {
        try {
          const profilePromise = supabase
            .from('auth_role_with_profiles')
            .select('user_id, email, full_name, role, account_status, is_systemadmin')
            .eq('user_id', req.user.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 25000)
          );

          const result = await Promise.race([profilePromise, timeoutPromise]);
          
          if (result.error || !result.data) {
            req.userProfile = {
              user_id: req.user.id,
              email: req.user.email,
              full_name: req.user.email,
              role: 'admin',
              account_status: 'active',
              is_systemadmin: false
            };
          } else {
            req.userProfile = result.data;
          }
        } catch (timeoutError) {
          console.error('❌ Profile fetch timeout:', timeoutError);
          req.userProfile = {
            user_id: req.user.id,
            email: req.user.email,
            full_name: req.user.email,
            role: 'admin',
            account_status: 'active',
            is_systemadmin: false
          };
        }
      }

      // Systemadmin has all permissions
      if (req.userProfile.is_systemadmin === true) {
        return next();
      }

      // Check each permission
      for (const permissionName of permissionNames) {
        const { data, error } = await supabase.rpc('has_permission', {
          p_user_id: req.user.id,
          p_permission_name: permissionName
        });

        if (error) {
          console.error(`❌ Permission check error for ${permissionName}:`, error);
          continue;
        }

        if (data === true) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `One of the following permissions required: ${permissionNames.join(', ')}`
      });
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has ALL of the specified permissions
 * @param {string[]} permissionNames - Array of permission names
 * @returns {Function} Express middleware function
 */
export const requireAllPermissions = (permissionNames = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      if (!req.userProfile) {
        try {
          const profilePromise = supabase
            .from('auth_role_with_profiles')
            .select('user_id, email, full_name, role, account_status, is_systemadmin')
            .eq('user_id', req.user.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 25000)
          );

          const result = await Promise.race([profilePromise, timeoutPromise]);
          
          if (result.error || !result.data) {
            req.userProfile = {
              user_id: req.user.id,
              email: req.user.email,
              full_name: req.user.email,
              role: 'admin',
              account_status: 'active',
              is_systemadmin: false
            };
          } else {
            req.userProfile = result.data;
          }
        } catch (timeoutError) {
          console.error('❌ Profile fetch timeout:', timeoutError);
          req.userProfile = {
            user_id: req.user.id,
            email: req.user.email,
            full_name: req.user.email,
            role: 'admin',
            account_status: 'active',
            is_systemadmin: false
          };
        }
      }

      // Systemadmin has all permissions
      if (req.userProfile.is_systemadmin === true) {
        return next();
      }

      // Check all permissions
      const permissionChecks = permissionNames.map(permissionName =>
        supabase.rpc('has_permission', {
          p_user_id: req.user.id,
          p_permission_name: permissionName
        })
      );

      const results = await Promise.all(permissionChecks);
      const hasAll = results.every(result => {
        if (result.error) {
          console.error('❌ Permission check error:', result.error);
          return false;
        }
        return result.data === true;
      });

      if (hasAll) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `All of the following permissions required: ${permissionNames.join(', ')}`
      });
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user is systemadmin
 * @returns {Function} Express middleware function
 */
export const requireSystemAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }
    if (req.user.id || req.user.id === null || req.user.id === undefined) {
      try {
        const profilePromise = supabase
          .from('auth_role_with_profiles')
          .select('user_id, email, full_name, role, account_status, is_systemadmin')
          .eq('user_id', req.user.id)
          .single();
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 25000)
        );

        const result = await Promise.race([profilePromise, timeoutPromise]);
        
        if (result.error || !result.data) {
          req.userProfile = {
            user_id: req.user.id,
            email: req.user.email,
            full_name: req.user.email,
            role: 'admin',
            account_status: 'active',
            is_systemadmin: false
          };
        } else {
          req.userProfile = result.data;
        }
      } catch (timeoutError) {
        console.error('❌ Profile fetch timeout:', timeoutError);
        req.userProfile = {
          user_id: req.user.id,
          email: req.user.email,
          full_name: req.user.email,
          role: 'admin',
          account_status: 'active',
          is_systemadmin: false
        };
      }
    }

    if (req.userProfile.is_systemadmin !== true) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'System administrator access required'
      });
    }

    next();
  } catch (err) {
    console.error('SystemAdmin check error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authorization check failed'
    });
  }
};

export default {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSystemAdmin
};

