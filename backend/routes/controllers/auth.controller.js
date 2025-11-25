import {
  isValidEmail,
  sanitizeString,
  sanitizeObject
} from '../../utils/validation.js';
import {
  handleApiError,
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../../utils/apiOptimization.js';

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

