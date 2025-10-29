import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { login, logout, getCurrentUser } from './controllers/auth.controller.js';

const router = express.Router();

// @route POST /api/auth/login
// @desc  Login user
// @access Public
router.post('/login', login);

// @route POST /api/auth/logout
// @desc  Logout user
// @access Private
router.post('/logout', authenticate, logout);

// @route GET /api/auth/me
// @desc  Get current user profile
// @access Private
router.get('/me', authenticate, getCurrentUser);

export default router;
