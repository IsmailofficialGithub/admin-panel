import express from 'express';
import {
  createTicket,
  getTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
  getTicketStats,
  uploadAttachmentHandler
} from './controllers/customerSupport.controller.js';
import { authenticate, requireAdmin, requireRole, loadUserProfile } from '../middleware/auth.js';
import { upload } from './controllers/customerSupport.controller.js';
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../utils/apiOptimization.js';

const rateLimitMiddleware = createRateLimitMiddleware('customer-support', 100);

const router = express.Router();

/**
 * @route   POST /api/customer-support/tickets
 * @desc    Create a new support ticket
 * @access  Private
 */
router.post('/tickets', authenticate, loadUserProfile, rateLimitMiddleware, sanitizeInputMiddleware, createTicket);

/**
 * @route   GET /api/customer-support/tickets
 * @desc    Get all support tickets (with filters)
 * @access  Private (Admin sees all, users see only their own)
 */
router.get('/tickets', authenticate, loadUserProfile, rateLimitMiddleware, sanitizeInputMiddleware, getTickets);

/**
 * @route   GET /api/customer-support/tickets/:ticketId
 * @desc    Get single ticket with messages and attachments
 * @access  Private (Admin or ticket owner)
 */
router.get('/tickets/:ticketId', authenticate, loadUserProfile, rateLimitMiddleware, sanitizeInputMiddleware, getTicket);

/**
 * @route   POST /api/customer-support/tickets/:ticketId/messages
 * @desc    Add message to ticket
 * @access  Private (Admin or ticket owner)
 */
router.post('/tickets/:ticketId/messages', authenticate, loadUserProfile, rateLimitMiddleware, sanitizeInputMiddleware, addMessage);

/**
 * @route   PATCH /api/customer-support/tickets/:ticketId/status
 * @desc    Update ticket status, assignment, priority
 * @access  Private (Admin or Support)
 */
router.patch('/tickets/:ticketId/status', authenticate, loadUserProfile, requireRole(['admin', 'support']), rateLimitMiddleware, sanitizeInputMiddleware, updateTicketStatus);

/**
 * @route   GET /api/customer-support/stats
 * @desc    Get ticket statistics
 * @access  Private (Admin or Support)
 */
router.get('/stats', authenticate, loadUserProfile, requireRole(['admin', 'support']), rateLimitMiddleware, sanitizeInputMiddleware, getTicketStats);

/**
 * @route   POST /api/customer-support/upload
 * @desc    Upload attachment file
 * @access  Private
 */
router.post('/upload', authenticate, loadUserProfile, rateLimitMiddleware, upload.single('file'), sanitizeInputMiddleware, uploadAttachmentHandler);

export default router;

