import express from 'express';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';
import {
  inviteUser,
  inviteReseller,
  validateInviteToken,
  signupWithInvite
} from './controllers/invitations.controller.js';

const router = express.Router();

/**
 * @route   POST /api/invitations/invite
 * @desc    Invite user/reseller/consumer (admin only)
 * @access  Private (Admin)
 */
router.post('/invite', authenticate, requireAdmin, inviteUser);

/**
 * @route   POST /api/invitations/invite-reseller
 * @desc    Invite reseller (reseller can invite other resellers)
 * @access  Private (Reseller)
 */
router.post('/invite-reseller', authenticate, requireRole(['reseller']), inviteReseller);

/**
 * @route   GET /api/invitations/validate/:token
 * @desc    Validate invitation token
 * @access  Public
 */
router.get('/validate/:token', validateInviteToken);

/**
 * @route   POST /api/invitations/signup
 * @desc    Sign up using invitation token
 * @access  Public
 */
router.post('/signup', signupWithInvite);

export default router;




