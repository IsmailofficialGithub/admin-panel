import { supabase } from "../../config/database.js";
import {
  isValidUUID,
  sanitizeString,
  isValidEmail,
} from '../../utils/validation.js';
import {
  executeWithTimeout,
} from '../../utils/apiOptimization.js';

/**
 * Standardized error response
 */
const createErrorResponse = (statusCode, errorCode, message, details = null) => {
  const response = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      timestamp: new Date().toISOString(),
    }
  };
  
  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }
  
  return { statusCode, response };
};

/**
 * Standardized success response
 */
const createSuccessResponse = (data, message = null, meta = null) => {
  const response = {
    success: true,
    data: data,
    timestamp: new Date().toISOString(),
  };
  
  if (message) response.message = message;
  if (meta) response.meta = meta;
  
  return response;
};

/**
 * Create a new call log
 * @route   POST /api/call-logs
 * @access  Public
 */
export const createCallLog = async (req, res) => {
  try {
    const { name, phone, call_url, agent, call_type, call_status } = req.body;

    // Validate required fields
    const missingFields = [];
    // if (!name || !name.trim()) missingFields.push('name');
    if (!phone || !phone.trim()) missingFields.push('phone');
    // if (!call_url || !call_url.trim()) missingFields.push('call_url');

    if (missingFields.length > 0) {
      const { statusCode, response } = createErrorResponse(
        400,
        'VALIDATION_ERROR',
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
      return res.status(statusCode).json(response);
    }

    // Sanitize inputs
    const callLogData = {
      name: sanitizeString(name, 255) || null,
      phone: sanitizeString(phone, 50), // Required field
      call_url: sanitizeString(call_url, 500) || null,
      agent: sanitizeString(agent, 255) || null,
      call_type: sanitizeString(call_type, 50) || null,
      call_status: sanitizeString(call_status, 50) || null,
    };

    // Insert call log
    const callLogPromise = supabase
      .from("call_logs")
      .insert(callLogData)
      .select()
      .single();

    const { data: callLog, error: callLogError } = await executeWithTimeout(callLogPromise, 5000);

    if (callLogError || !callLog) {
      console.error("❌ Error creating call log:", callLogError);
      const { statusCode, response } = createErrorResponse(
        500,
        'DATABASE_ERROR',
        'Failed to create call log. Please try again.',
        process.env.NODE_ENV === 'development' ? { error: callLogError?.message } : null
      );
      return res.status(statusCode).json(response);
    }

    const response = createSuccessResponse({
      call_log: callLog
    }, 'Call log created successfully');

    return res.status(201).json(response);

  } catch (error) {
    console.error("❌ Unexpected error in createCallLog:", error);
    const { statusCode, response } = createErrorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred. Please try again later.',
      process.env.NODE_ENV === 'development' ? { error: error.message, stack: error.stack } : null
    );
    return res.status(statusCode).json(response);
  }
};

/**
 * Get call logs by email, id, or phone
 * @route   GET /api/call-logs?email=...&id=...&phone=...
 * @access  Public
 */
export const getCallLogs = async (req, res) => {
  try {
    const { id, phone } = req.query;

    // At least one parameter must be provided
    if (!id && !phone) {
      const { statusCode, response } = createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'At least one parameter is required: id or phone'
      );
      return res.status(statusCode).json(response);
    }

    // Validate UUID format if provided
    if (id && !isValidUUID(id)) {
      const { statusCode, response } = createErrorResponse(
        400,
        'INVALID_ID',
        'Invalid ID format. ID must be a valid UUID.',
        { id: id }
      );
      return res.status(statusCode).json(response);
    }

    // Build query
    let query = supabase
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters
    if (id) {
      query = query.eq("id", id);
    }
    if (phone) {
      query = query.eq("phone", phone.trim());
    }

    // Execute query
    const { data: callLogs, error: queryError } = await executeWithTimeout(query, 5000);

    if (queryError) {
      console.error("❌ Error fetching call logs:", queryError);
      const { statusCode, response } = createErrorResponse(
        500,
        'DATABASE_ERROR',
        'Failed to fetch call logs. Please try again.',
        process.env.NODE_ENV === 'development' ? { error: queryError?.message } : null
      );
      return res.status(statusCode).json(response);
    }

    // If single ID provided and found, return single object
    if (id && callLogs && callLogs.length === 1) {
      const response = createSuccessResponse({
        call_log: callLogs[0]
      });
      return res.json(response);
    }

    // Otherwise return array
    const response = createSuccessResponse({
      call_logs: callLogs || [],
      count: callLogs?.length || 0
    });

    return res.json(response);

  } catch (error) {
    console.error("❌ Unexpected error in getCallLogs:", error);
    const { statusCode, response } = createErrorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred. Please try again later.',
      process.env.NODE_ENV === 'development' ? { error: error.message, stack: error.stack } : null
    );
    return res.status(statusCode).json(response);
  }
};

