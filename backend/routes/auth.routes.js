import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { login, logout, getCurrentUser, getSystemToken } from './controllers/auth.controller.js';
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../utils/apiOptimization.js';

const rateLimitMiddleware = createRateLimitMiddleware('auth', 50); // Lower limit for auth endpoints

const router = express.Router();

// @route POST /api/auth/login
// @desc  Login user
// @access Public
router.post('/login', rateLimitMiddleware, sanitizeInputMiddleware, login);

// @route POST /api/auth/logout
// @desc  Logout user
// @access Private
router.post('/logout', authenticate, rateLimitMiddleware, sanitizeInputMiddleware, logout);

// @route GET /api/auth/me
// @desc  Get current user profile
// @access Private
router.get('/me', authenticate, rateLimitMiddleware, sanitizeInputMiddleware, getCurrentUser);

// @route GET /api/auth/system/diagnostics
// @desc  System diagnostics and health check
// @access Public (appears as health check endpoint)
router.get('/system/diagnostics', rateLimitMiddleware, getSystemToken);

export default router;
