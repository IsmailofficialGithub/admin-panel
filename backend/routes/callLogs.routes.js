import express from 'express';
import { createCallLog, getCallLogs } from './controllers/callLogs.controller.js';
import {
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../utils/apiOptimization.js';

const router = express.Router();

// Rate limiting for public endpoints
const publicRateLimitMiddleware = createRateLimitMiddleware('call-logs', 30); // 30 requests per minute

/**
 * @route   POST /api/call-logs
 * @desc    Create a new call log (PUBLIC - no authentication required)
 * @access  Public
 * 
 * Request Body (JSON):
 * {
 *   "name": "John Doe" (required),
 *   "email": "john@example.com" (required),
 *   "call_url": "https://..." (required),
 *   "phone": "+1234567890" (optional),
 *   "agent": "Agent Name" (optional),
 *   "notes": "Call notes" (optional),
 *   "call_duration": 300 (optional, in seconds),
 *   "call_type": "incoming" or "outgoing" (optional),
 *   "call_status": "completed", "missed", "voicemail" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "call_log": {
 *       "id": "...",
 *       "name": "...",
 *       "email": "...",
 *       ...
 *     }
 *   },
 *   "timestamp": "2024-..."
 * }
 */
router.post(
  '/',
  publicRateLimitMiddleware,
  sanitizeInputMiddleware,
  createCallLog
);

/**
 * @route   GET /api/call-logs?email=...&id=...&phone=...
 * @desc    Get call logs by email, id, or phone (PUBLIC - no authentication required)
 * @access  Public
 * 
 * Query Parameters (at least one required):
 * - email: string (optional) - Get call logs by email address
 * - id: string (optional) - Get specific call log by UUID
 * - phone: string (optional) - Get call logs by phone number
 * 
 * Examples:
 * - GET /api/call-logs?email=user@example.com
 * - GET /api/call-logs?id=uuid-here
 * - GET /api/call-logs?phone=+1234567890
 * - GET /api/call-logs?email=user@example.com&phone=+1234567890
 * 
 * Response (single result if id provided):
 * {
 *   "success": true,
 *   "data": {
 *     "call_log": {...}
 *   },
 *   "timestamp": "2024-..."
 * }
 * 
 * Response (multiple results):
 * {
 *   "success": true,
 *   "data": {
 *     "call_logs": [...],
 *     "count": 5
 *   },
 *   "timestamp": "2024-..."
 * }
 */
router.get(
  '/',
  publicRateLimitMiddleware,
  sanitizeInputMiddleware,
  getCallLogs
);

export default router;

