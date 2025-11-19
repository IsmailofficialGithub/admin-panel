import { supabase } from '../config/database.js';

/**
 * Middleware to verify JWT token from Supabase
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has admin role
 * Note: This should be used after loadUserProfile middleware
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    // Use profile from loadUserProfile middleware if available, otherwise fetch it
    let profile = req.userProfile;
    if (!profile) {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role, account_status')
        .eq('user_id', req.user.id)
        .single();

      if (error || !profileData) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'User profile not found'
        });
      }
      profile = profileData;
      req.userProfile = profile;
    }

    // Check if admin account is deactivated (shouldn't happen, but safety check)
    if (profile.role === 'admin' && profile.account_status === 'deactive') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authorization check failed'
    });
  }
};

/**
 * Middleware to load user profile from profiles table
 * This middleware loads the user profile including role, email, full_name, etc.
 * and attaches it to req.userProfile for use in controllers
 */
export const loadUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    // Fetch user profile from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, role, account_status')
      .eq('user_id', req.user.id)
      .single();
    console.log("profile====", profile);

    if (error || !profile) {
      // If profile doesn't exist, create a fallback profile from auth user
      req.userProfile = {
        user_id: req.user.id,
        email: req.user.email,
        full_name: req.user.email,
        role: 'admin', // Default role
        account_status: 'active'
      };
    } else {
      req.userProfile = profile;
    }

    next();
  } catch (err) {
    console.error('Load user profile error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load user profile'
    });
  }
};

/**
 * Middleware to check user role
 * @param {Array} allowedRoles - Array of allowed roles
 */
export const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      // Ensure userProfile is loaded
      if (!req.userProfile) {
        // Load profile if not already loaded
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, account_status')
          .eq('user_id', req.user.id)
          .single();

        if (error || !profile) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'User profile not found'
          });
        }

        req.userProfile = profile;
      }

      // Check if account is deactivated (for reseller and consumer roles)
      if ((req.userProfile.role === 'reseller' || req.userProfile.role === 'consumer') && req.userProfile.account_status === 'deactive') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your account has been deactivated. Please contact the administrator.'
        });
      }

      if (!allowedRoles.includes(req.userProfile.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Required role: ${allowedRoles.join(' or ')}`
        });
      }

      next();
    } catch (err) {
      console.error('Role check error:', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authorization check failed'
      });
    }
  };
};

export default { authenticate, requireAdmin, requireRole, loadUserProfile };

