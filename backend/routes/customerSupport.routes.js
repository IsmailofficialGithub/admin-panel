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
import { authenticate, requireAdmin, loadUserProfile } from '../middleware/auth.js';
import { upload } from './controllers/customerSupport.controller.js';

const router = express.Router();

/**
 * @route   POST /api/customer-support/tickets
 * @desc    Create a new support ticket
 * @access  Private
 */
router.post('/tickets', authenticate, loadUserProfile, createTicket);

/**
 * @route   GET /api/customer-support/tickets
 * @desc    Get all support tickets (with filters)
 * @access  Private (Admin sees all, users see only their own)
 */
router.get('/tickets', authenticate, loadUserProfile, getTickets);

/**
 * @route   GET /api/customer-support/tickets/:ticketId
 * @desc    Get single ticket with messages and attachments
 * @access  Private (Admin or ticket owner)
 */
router.get('/tickets/:ticketId', authenticate, loadUserProfile, getTicket);

/**
 * @route   POST /api/customer-support/tickets/:ticketId/messages
 * @desc    Add message to ticket
 * @access  Private (Admin or ticket owner)
 */
router.post('/tickets/:ticketId/messages', authenticate, loadUserProfile, addMessage);

/**
 * @route   PATCH /api/customer-support/tickets/:ticketId/status
 * @desc    Update ticket status, assignment, priority
 * @access  Private (Admin only)
 */
router.patch('/tickets/:ticketId/status', authenticate, loadUserProfile, requireAdmin, updateTicketStatus);

/**
 * @route   GET /api/customer-support/stats
 * @desc    Get ticket statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, loadUserProfile, requireAdmin, getTicketStats);

/**
 * @route   POST /api/customer-support/upload
 * @desc    Upload attachment file
 * @access  Private
 */
router.post('/upload', authenticate, loadUserProfile, upload.single('file'), uploadAttachmentHandler);

export default router;

