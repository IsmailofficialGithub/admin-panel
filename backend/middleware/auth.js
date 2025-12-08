import { supabase } from '../config/database.js';
import { cacheService } from '../config/redis.js';

/**
 * Middleware to verify JWT token from Supabase
 * Uses Redis caching to reduce Supabase API calls
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

    // Check cache first (cache token verification for 5 minutes)
    const cacheKey = `auth:token:${token.substring(0, 20)}`; // Use first 20 chars as key
    const cachedUser = await cacheService.get(cacheKey);
    
    if (cachedUser) {
      console.log('✅ Auth cache HIT');
      req.user = cachedUser;
      return next();
    }

    console.log('❌ Auth cache MISS - verifying with Supabase');

    // Verify token with Supabase with timeout handling and retry logic
    let user, error;
    let retries = 2; // Retry up to 2 times
    let lastError = null;

    while (retries >= 0) {
      try {
        const result = await Promise.race([
          supabase.auth.getUser(token),
          new Promise((_, reject) => 
            setTimeout(() => {
              const timeoutErr = new Error('Authentication timeout');
              timeoutErr.cause = { code: 'UND_ERR_CONNECT_TIMEOUT' };
              reject(timeoutErr);
            }, 25000) // 25 second timeout
          )
        ]);
        user = result.data?.user;
        error = result.error;
        lastError = null;
        break; // Success, exit retry loop
      } catch (timeoutError) {
        lastError = timeoutError;
        console.error(`❌ Authentication attempt failed (${2 - retries + 1}/3):`, timeoutError.message);
        
        // Check if it's a connection timeout
        if (timeoutError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
            timeoutError.message?.includes('timeout') ||
            timeoutError.message?.includes('fetch failed')) {
          
          if (retries > 0) {
            // Wait before retry (exponential backoff)
            const waitTime = (3 - retries) * 1000; // 1s, 2s
            console.log(`⏳ Retrying authentication in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retries--;
            continue; // Retry
          } else {
            // All retries exhausted
            return res.status(503).json({
              error: 'Service Unavailable',
              message: 'Authentication service is temporarily unavailable. Please try again later.'
            });
          }
        } else {
          // Not a timeout error, don't retry
          throw timeoutError;
        }
      }
    }

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Cache the verified user for 5 minutes (300 seconds)
    await cacheService.set(cacheKey, user, 300);
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Authentication error:', err);
    
    // Handle connection timeout errors specifically
    if (err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
        err.message?.includes('timeout') ||
        err.message?.includes('fetch failed')) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Authentication service is temporarily unavailable. Please try again later.'
      });
    }
    
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
      try {
        const profilePromise = supabase
          .from('profiles')
          .select('role, account_status')
          .eq('user_id', req.user.id)
          .single();
          
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 25000)
        );

        const { data: profileData, error } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]);

        console.log("profileData", profileData);

        if (error || !profileData) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'User profile not found'
          });
        }
        profile = profileData;
        req.userProfile = profile;
      } catch (timeoutError) {
        console.error('❌ Profile fetch timeout:', timeoutError);
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Database service is temporarily unavailable. Please try again later.'
        });
      }
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

    // Fetch user profile from profiles table with timeout
    let profile, error;
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('user_id, email, full_name, role, account_status, is_systemadmin')
        .eq('user_id', req.user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 25000)
      );

      const result = await Promise.race([profilePromise, timeoutPromise]);
      profile = result.data;
      error = result.error;
    } catch (timeoutError) {
      console.error('❌ Profile fetch timeout:', timeoutError);
      // Fallback to auth user data if profile fetch fails
      profile = null;
      error = { message: 'Profile fetch timeout' };
    }
    

    if (error || !profile) {
      // If profile doesn't exist, create a fallback profile from auth user
      req.userProfile = {
        user_id: req.user.id,
        email: req.user.email,
        full_name: req.user.email,
        role: 'admin', // Default role
        account_status: 'active',
        is_systemadmin: false
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
        try {
          // Load profile if not already loaded with timeout
          const profilePromise = supabase
            .from('profiles')
            .select('role, account_status, is_systemadmin')
            .eq('user_id', req.user.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 25000)
          );

          const { data: profile, error } = await Promise.race([
            profilePromise,
            timeoutPromise
          ]);

          if (error || !profile) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'User profile not found'
            });
          }

          req.userProfile = profile;
        } catch (timeoutError) {
          console.error('❌ Profile fetch timeout:', timeoutError);
          return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database service is temporarily unavailable. Please try again later.'
          });
        }
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

