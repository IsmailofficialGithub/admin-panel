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
 */
export const requireAdmin = async (req, res, next) => {

  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }
    // Fetch user profile to check role and account status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('user_id', req.user.id)
      .single()

    if (error || !profile) {
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User profile not found'
      });
    }

    // Check if admin account is deactivated (shouldn't happen, but safety check)
    if (profile.role === 'admin' && profile.account_status === 'deactive') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    if (profile.role !== 'admin') {
      console.log("profile.role", profile.role)
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    req.userProfile = profile;
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

      // Fetch user profile to check role and account status
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

      // Check if account is deactivated (for reseller and consumer roles)
      if ((profile.role === 'reseller' || profile.role === 'consumer') && profile.account_status === 'deactive') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your account has been deactivated. Please contact the administrator.'
        });
      }

      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Required role: ${allowedRoles.join(' or ')}`
        });
      }

      req.userProfile = profile;
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

export default { authenticate, requireAdmin, requireRole };

