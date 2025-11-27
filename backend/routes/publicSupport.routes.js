import express from 'express';
import { createPublicTicket, getPublicTickets, upload } from './controllers/publicSupport.controller.js';
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../utils/apiOptimization.js';

const router = express.Router();

// More lenient rate limiting for public endpoint (handled in controller by IP)
const publicRateLimitMiddleware = createRateLimitMiddleware('public-support', 20); // 20 requests per minute

/**
 * @route   POST /api/public/customer-support/tickets
 * @desc    Create a new support ticket (PUBLIC - no authentication required)
 * @access  Public
 * 
 * Supports both JSON and multipart/form-data (for file uploads)
 * 
 * Request Body (JSON):
 * {
 *   "subject": "Ticket subject",
 *   "message": "Ticket message",
 *   "email": "user@example.com",
 *   "name": "User Name" (optional),
 *   "category": "technical" (optional),
 *   "priority": "medium" (optional: low, medium, high, urgent),
 *   "api_key": "your-api-key" (optional: to identify source website),
 *   "source_url": "https://yourwebsite.com" (optional),
 *   "metadata": {} (optional: additional data)
 * }
 * 
 * Request Body (multipart/form-data):
 * - subject: string (required)
 * - message: string (required)
 * - email: string (required)
 * - name: string (optional)
 * - category: string (optional)
 * - priority: string (optional)
 * - files: File[] (optional, max 5 files, 10MB each)
 */
router.post(
  '/tickets', 
  publicRateLimitMiddleware,
  upload.array('files', 5), // Handle up to 5 files
  sanitizeInputMiddleware, 
  createPublicTicket
);

/**
 * @route   GET /api/public/customer-support/tickets?email=user@example.com&ticket_number=TICKET-123
 * @desc    Get tickets by email (PUBLIC - no authentication required)
 * @access  Public
 * 
 * Query Parameters:
 * - email: string (required) - Email address used to create tickets
 * - ticket_number: string (optional) - Get specific ticket by ticket number
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "tickets": [...] or "ticket": {...}
 *   },
 *   "timestamp": "2024-..."
 * }
 */
router.get(
  '/tickets',
  publicRateLimitMiddleware,
  sanitizeInputMiddleware,
  getPublicTickets
);

export default router;
