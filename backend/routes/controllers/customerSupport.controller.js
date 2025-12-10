import { supabase, supabaseAdmin } from "../../config/database.js";
import multer from "multer";
import { cacheService } from '../../config/redis.js';
import { sendTicketStatusChangedEmail, sendTicketReplyEmail } from '../../services/emailService.js';
import {
  isValidUUID,
  validatePagination,
  sanitizeString,
  sanitizeArray,
  sanitizeObject
} from '../../utils/validation.js';
import {
  executeWithTimeout,
  handleApiError,
  createPaginatedResponse,
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../../utils/apiOptimization.js';
import { hasRole } from '../../utils/roleUtils.js';

// Cache configuration
const CACHE_TTL = 180; // 3 minutes
const CACHE_KEYS = {
  TICKETS: (userId, role, status, page, limit) => `tickets:${userId}_${role}_${status}_page${page}_limit${limit}`,
  TICKET_BY_ID: (id) => `tickets:id:${id}`,
  TICKET_STATS: (userId, role) => `tickets:stats:${userId}_${role}`,
};

// Export middleware for use in routes
export { sanitizeInputMiddleware };
export const rateLimitMiddleware = createRateLimitMiddleware('customer_support', 100);

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and common document types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Allowed: images, PDF, Word, Excel, text files."
        ),
        false
      );
    }
  },
});

/**
 * Upload attachment file to Supabase Storage
 */
async function uploadAttachment(
  fileBuffer,
  mimetype,
  originalName,
  userId,
  ticketId,
  messageId = null
) {
  const timestamp =
    new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
    "-" +
    Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${timestamp}-${sanitizedName}`;
  const filePath = `support/${ticketId}/${messageId || "ticket"}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from("support-attachments")
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file to Supabase Storage:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Generate signed URL (works for private buckets)
  const { data: signedUrlData, error: signedUrlError } =
    await supabaseAdmin.storage
      .from("support-attachments")
      .createSignedUrl(filePath, 31536000); // 1 year expiry

  if (signedUrlError) {
    // Fallback to public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("support-attachments")
      .getPublicUrl(filePath);
    return {
      url: urlData.publicUrl,
      path: filePath,
      fileName: originalName,
    };
  }

  return {
    url: signedUrlData.signedUrl,
    path: filePath,
    fileName: originalName,
  };
}

/**
 * Upload attachment file endpoint
 * @route   POST /api/customer-support/upload
 * @access  Private
 */
export const uploadAttachmentHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Validation Error",
        message: "No file provided",
      });
    }

    const userId = req.user.id;
    const { ticket_id, message_id } = req.body;

    // Upload file to storage
    const uploadResult = await uploadAttachment(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      userId,
      ticket_id || "temp",
      message_id || null
    );

    res.json({
      success: true,
      data: {
        file_name: uploadResult.fileName,
        file_path: uploadResult.path,
        file_url: uploadResult.url,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        file_extension: req.file.originalname.split(".").pop(),
      },
    });
  } catch (error) {
    console.error("❌ Error uploading attachment:", error);
    res.status(500).json({
      error: "Server Error",
      message: error.message || "Failed to upload file",
    });
  }
};

export { upload };

/**
 * Customer Support Controller
 * Handles support ticket operations, messages, and attachments
 */

/**
 * Generate unique ticket number
 */
const generateTicketNumber = async () => {
  const { data, error } = await supabase.rpc("generate_ticket_number");
  if (error) {
    // Fallback if function doesn't exist
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    return `TICKET-${date}-${random}`;
  }
  return data;
};

/**
 * Create a new support ticket
 * @route   POST /api/customer-support/tickets
 * @access  Private (All authenticated users)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Query timeout (Performance)
 * 3. Cache invalidation (Performance)
 * 4. Secure error handling (Security)
 */
export const createTicket = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    let { subject, message, category, priority, attachments } = req.body;
    const userId = req.user.id;

    // User profile is loaded by loadUserProfile middleware
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        success: false,
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Subject and message are required",
      });
    }

    // Sanitize inputs
    subject = sanitizeString(subject, 255);
    message = sanitizeString(message, 5000);
    category = category ? sanitizeString(category, 100) : null;
    priority = priority ? sanitizeString(priority, 20) : 'medium';

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      priority = 'medium';
    }

    // ========================================
    // 2. GENERATE TICKET NUMBER (with timeout)
    // ========================================
    const ticketNumber = await executeWithTimeout(
      generateTicketNumber(),
      3000
    ).catch(() => {
      // Fallback if RPC fails
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const random = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0");
      return `TICKET-${date}-${random}`;
    });

    // ========================================
    // 3. CREATE TICKET (with timeout)
    // ========================================
    const ticketPromise = supabase
      .from("support_tickets")
      .insert({
        ticket_number: ticketNumber,
        subject: subject.trim(),
        user_id: userId,
        user_email: userProfile.email || req.user.email,
        user_name: userProfile.full_name || userProfile.email || req.user.email,
        user_role: userProfile.role || "user",
        category: category || null,
        priority: priority || "medium",
        status: "open",
        message_count: 0,
      })
      .select()
      .single();

    const { data: ticket, error: ticketError } = await executeWithTimeout(ticketPromise);

    if (ticketError || !ticket) {
      console.error("❌ Error creating ticket:", ticketError);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to create support ticket. Please try again.",
      });
    }

    // ========================================
    // 4. CREATE INITIAL MESSAGE (with timeout)
    // ========================================
    const messagePromise = supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        message: message.trim(),
        message_type: "user",
        sender_id: userId,
        sender_email: userProfile.email || req.user.email,
        sender_name:
          userProfile.full_name || userProfile.email || req.user.email,
        sender_role: userProfile.role || "user",
        is_read: false,
      })
      .select()
      .single();

    const { data: initialMessage, error: messageError } = await executeWithTimeout(messagePromise);

    if (messageError || !initialMessage) {
      console.error("❌ Error creating initial message:", messageError);
      // Delete ticket if message creation fails
      try {
        await executeWithTimeout(
          supabase.from("support_tickets").delete().eq("id", ticket.id),
          3000
        );
      } catch (deleteError) {
        console.error('Error deleting failed ticket:', deleteError);
      }
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to create support ticket message. Please try again.",
      });
    }

    // ========================================
    // 5. HANDLE ATTACHMENTS (with timeout, non-blocking)
    // ========================================
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const attachmentPromises = attachments
        .filter(att => att.file_name && att.file_path)
        .map((attachment) => {
          const fileExtension = attachment.file_name?.split(".").pop() || "";
          return supabase.from("support_attachments").insert({
            ticket_id: ticket.id,
            message_id: initialMessage.id,
            file_name: sanitizeString(attachment.file_name, 255),
            file_path: attachment.file_path,
            file_url: attachment.file_url || attachment.file_path,
            file_size: attachment.file_size || 0,
            file_type: attachment.file_type || "application/octet-stream",
            file_extension: fileExtension,
            uploaded_by: userId,
            is_public: false,
          });
        });
      
      Promise.all(attachmentPromises).catch(attachmentError => {
        console.warn('⚠️ Failed to store attachments:', attachmentError?.message);
      });
    }

    // ========================================
    // 6. CACHE INVALIDATION
    // ========================================
    await cacheService.delByPattern('tickets:*');
    console.log('✅ Cache invalidated for ticket creation');

    // ========================================
    // 7. DATA SANITIZATION
    // ========================================
    const sanitizedTicket = sanitizeObject({
      ...ticket,
      initial_message: sanitizeObject(initialMessage)
    });

    res.status(201).json({
      success: true,
      data: {
        ticket: sanitizedTicket,
      },
      message: "Support ticket created successfully",
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while creating the support ticket.');
  }
};

/**
 * Get all support tickets (with filters)
 * @route   GET /api/customer-support/tickets?status=open&page=1&limit=20
 * @access  Private (Admin can see all, users see only their own)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Pagination support (Performance)
 * 3. Query timeout (Performance)
 * 4. Redis caching (Performance)
 * 5. Secure error handling (Security)
 * 6. Data sanitization (Security)
 */
export const getTickets = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    let {
      status,
      priority,
      category,
      assigned_to,
      user_id,
      page,
      limit,
      search,
    } = req.query;

    const userId = req.user.id;

    // User profile is loaded by loadUserProfile middleware
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        success: false,
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    const isAdmin = hasRole(userProfile.role, "admin");

    // Validate pagination
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    // Validate UUIDs if provided
    if (assigned_to && !isValidUUID(assigned_to)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid assigned_to ID format'
      });
    }

    if (user_id && !isValidUUID(user_id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid user_id format'
      });
    }

    // Sanitize string inputs
    status = status ? sanitizeString(status, 50) : null;
    priority = priority ? sanitizeString(priority, 20) : null;
    category = category ? sanitizeString(category, 100) : null;
    search = search ? sanitizeString(search, 200) : null;

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.TICKETS(userId, userProfile.role, status || 'all', pageNum, limitNum);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for tickets');
      return res.json(cachedData);
    }

    // ========================================
    // 3. BUILD QUERY (with timeout)
    // ========================================
    let query = supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_id, user_email, user_name, user_role, category, priority, status, assigned_to, message_count, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false });

    // Non-admins can only see their own tickets
    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    // Apply filters
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (category) query = query.eq("category", category);
    if (assigned_to) query = query.eq("assigned_to", assigned_to);
    if (user_id && isAdmin) query = query.eq("user_id", user_id);
    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,ticket_number.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: tickets, error, count } = await executeWithTimeout(query);

    if (error) {
      console.error("❌ Error fetching tickets:", error);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to fetch support tickets. Please try again.",
      });
    }

    // ========================================
    // 4. DATA SANITIZATION
    // ========================================
    const sanitizedTickets = sanitizeArray(tickets || []);

    // ========================================
    // 5. BUILD RESPONSE
    // ========================================
    const response = createPaginatedResponse(sanitizedTickets, count || 0, pageNum, limitNum);

    // ========================================
    // 6. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching support tickets.');
  }
};

/**
 * Get single ticket with messages and attachments
 * @route   GET /api/customer-support/tickets/:ticketId
 * @access  Private (Admin or ticket owner)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format)
 * 2. Query timeout (Performance)
 * 3. Redis caching (Performance)
 * 4. Secure error handling (Security)
 * 5. Data sanitization (Security)
 */
export const getTicket = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION
    // ========================================
    const { ticketId } = req.params;
    const userId = req.user.id;

    if (!ticketId || !isValidUUID(ticketId)) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Invalid ticket ID format",
      });
    }

    // User profile is loaded by loadUserProfile middleware
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        success: false,
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    const isAdmin = hasRole(userProfile.role, "admin");

    // ========================================
    // 2. CACHE CHECK
    // ========================================
    const cacheKey = CACHE_KEYS.TICKET_BY_ID(ticketId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for ticket ${ticketId}`);
      return res.json(cachedData);
    }

    // ========================================
    // 3. GET TICKET (with timeout)
    // ========================================
    const ticketPromise = supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, user_id, user_email, user_name, user_role, category, priority, status, assigned_to, message_count, created_at, updated_at")
      .eq("id", ticketId)
      .single();

    const { data: ticket, error: ticketError } = await executeWithTimeout(ticketPromise);

    if (ticketError || !ticket) {
      console.error("❌ Error fetching ticket:", ticketError);
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Support ticket not found",
      });
    }

    // Check permissions - non-admins can only see their own tickets
    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to view this ticket",
      });
    }

    // ========================================
    // 4. GET MESSAGES AND ATTACHMENTS (with timeout, parallel)
    // ========================================
    const messagesPromise = supabase
      .from("support_messages")
      .select("id, ticket_id, message, message_type, sender_id, sender_email, sender_name, sender_role, is_read, read_at, read_by, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    const attachmentsPromise = supabase
      .from("support_attachments")
      .select("id, ticket_id, message_id, file_name, file_path, file_url, file_size, file_type, uploaded_by, uploaded_at")
      .eq("ticket_id", ticketId)
      .order("uploaded_at", { ascending: true });

    const [{ data: messages }, { data: attachments }] = await Promise.all([
      executeWithTimeout(messagesPromise, 3000).catch(err => {
        console.warn('⚠️ Error fetching messages:', err?.message);
        return { data: [] };
      }),
      executeWithTimeout(attachmentsPromise, 3000).catch(err => {
        console.warn('⚠️ Error fetching attachments:', err?.message);
        return { data: [] };
      })
    ]);

    // ========================================
    // 5. MARK MESSAGES AS READ (with timeout, non-blocking)
    // ========================================
    if (isAdmin && messages && messages.length > 0) {
      const unreadUserMessages = messages.filter(
        (m) => m.message_type === "user" && !m.is_read
      );

      if (unreadUserMessages.length > 0) {
        const messageIds = unreadUserMessages.map((m) => m.id);
        const markReadPromise = supabase
          .from("support_messages")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
            read_by: userId,
          })
          .in("id", messageIds);

        executeWithTimeout(markReadPromise, 3000).catch(markReadError => {
          console.warn('⚠️ Failed to mark messages as read:', markReadError?.message);
        });
      }
    }

    // ========================================
    // 6. DATA SANITIZATION
    // ========================================
    const sanitizedTicket = sanitizeObject(ticket);
    const sanitizedMessages = sanitizeArray(messages || []);
    const sanitizedAttachments = sanitizeArray(attachments || []);

    // ========================================
    // 7. BUILD RESPONSE
    // ========================================
    const response = {
      success: true,
      data: {
        ticket: sanitizedTicket,
        messages: sanitizedMessages,
        attachments: sanitizedAttachments,
      },
    };

    // ========================================
    // 8. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching the support ticket.');
  }
};

/**
 * Add message to ticket
 * @route   POST /api/customer-support/tickets/:ticketId/messages
 * @access  Private (Admin or ticket owner)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation & sanitization (Security)
 * 2. Query timeout (Performance)
 * 3. Cache invalidation (Performance)
 * 4. Secure error handling (Security)
 */
export const addMessage = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    const { ticketId } = req.params;
    let { message, is_internal, attachments = [] } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User authentication required",
      });
    }

    if (!ticketId || !isValidUUID(ticketId)) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Invalid ticket ID format",
      });
    }

    // Validate message or attachments
    const hasMessage = message?.trim();
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    
    if (!hasMessage && !hasAttachments) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Please add a message or attach a file",
      });
    }

    // Sanitize message
    const messageText = hasMessage ? sanitizeString(message, 5000) : "(File attachment)";

    // ========================================
    // 2. GET USER PROFILE
    // ========================================
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        success: false,
        error: "Server Error",
        message: "User profile not loaded",
      });
    }
    const isAdmin = hasRole(userProfile.role, "admin");

    // ========================================
    // 3. VALIDATE TICKET (with timeout)
    // ========================================
    const ticketPromise = supabase
      .from("support_tickets")
      .select("id, user_id, status, ticket_number,user_email,user_name")
      .eq("id", ticketId)
      .single();

    const { data: ticket, error: ticketError } = await executeWithTimeout(ticketPromise);

    if (ticketError || !ticket) {
      console.error("❌ Error fetching ticket:", ticketError);
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Ticket not found",
      });
    }

    // User can only reply to their own ticket
    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You cannot post messages to this ticket",
      });
    }

    // ========================================
    // 4. CREATE MESSAGE (with timeout)
    // ========================================
    const internalFlag = isAdmin && is_internal === true;

    const messagePromise = supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        message: messageText,
        message_type: isAdmin ? "admin" : "user",
        sender_id: userId,
        sender_email: userProfile.email,
        sender_name: userProfile.full_name,
        sender_role: userProfile.role,
        is_internal: internalFlag,
        is_read: false,
      })
      .select()
      .single();

    const { data: newMessage, error: messageError } = await executeWithTimeout(messagePromise);

    if (messageError || !newMessage) {
      console.error("❌ Error creating message:", messageError);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to save message. Please try again.",
      });
    }

    // ========================================
    // 5. STORE ATTACHMENTS (with timeout, non-blocking)
    // ========================================
    let storedAttachments = [];
    if (hasAttachments) {
      const mapped = attachments
        .filter(file => file.file_name && file.file_path)
        .map((file) => ({
          ticket_id: ticketId,
          message_id: newMessage.id,
          file_name: sanitizeString(file.file_name, 255),
          file_path: file.file_path,
          file_url: file.file_url || file.file_path,
          file_size: file.file_size || 0,
          file_type: file.file_type || "application/octet-stream",
          file_extension: file.file_name?.split(".").pop() || "",
          uploaded_by: userId,
          is_public: false,
        }));

      if (mapped.length > 0) {
        const attachPromise = supabase
          .from("support_attachments")
          .insert(mapped)
          .select();

        const { data: insertedAttachments, error: attachError } = await executeWithTimeout(attachPromise, 3000);
        
        if (attachError) {
          console.warn("⚠️ Failed to store attachments:", attachError?.message);
        } else if (insertedAttachments) {
          storedAttachments = insertedAttachments;
        }
      }
    }

    // ========================================
    // 6. UPDATE TICKET STATUS (with timeout, non-blocking)
    // ========================================
    if (isAdmin && ticket.status === "open") {
      const updateStatusPromise = supabase
        .from("support_tickets")
        .update({
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      executeWithTimeout(updateStatusPromise, 3000).catch(updateError => {
        console.warn("⚠️ Failed to update ticket status:", updateError?.message);
      });
    }

    // ========================================
    // 7. SEND EMAIL NOTIFICATION (if admin reply, non-blocking)
    // ========================================
    if (isAdmin && !internalFlag) {
      // Send email asynchronously (don't block the response)
      (async () => {
        try {
          // Use ticket email directly (no need to fetch from database)
          const ticketEmail = ticket.user_email;
          const ticketUserName = ticket.user_name;

          if (!ticketEmail) {
            console.warn("⚠️ Ticket has no email address (user_email is missing)");
            return;
          }

          // Prepare attachments for email
          const emailAttachments = storedAttachments.map(att => ({
            file_name: att.file_name,
            file_url: att.file_url || att.file_path,
            file_path: att.file_path,
            file_size: att.file_size
          }));

          const emailResult = await sendTicketReplyEmail({
            email: ticketEmail,
            full_name: ticketUserName || ticketEmail.split('@')[0],
            ticket_number: ticket.ticket_number || `TICKET-${ticketId.substring(0, 8).toUpperCase()}`,
            admin_name: userProfile.full_name || 'Support Team',
            message: messageText,
            attachments: emailAttachments,
            ticket_id: ticketId,
          });

          if (emailResult?.success) {
            console.log("✅ Ticket reply email sent to:", ticketEmail);
          } else {
            console.warn("⚠️ Failed to send ticket reply email:", emailResult?.error || 'Unknown error');
          }
        } catch (emailError) {
          console.error("❌ Error sending ticket reply email:", emailError?.message || emailError);
          // Don't fail the request if email fails
        }
      })();
    }

    // ========================================
    // 8. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.TICKET_BY_ID(ticketId));
    await cacheService.delByPattern('tickets:*');
    console.log('✅ Cache invalidated for message addition');

    // ========================================
    // 9. DATA SANITIZATION
    // ========================================
    const sanitizedMessage = sanitizeObject(newMessage);

    res.status(201).json({
      success: true,
      message: "Message added successfully",
      data: sanitizedMessage,
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while adding the message.');
  }
};


/**
 * Update ticket status
 * @route   PATCH /api/customer-support/tickets/:ticketId/status
 * @access  Private (Admin only)
 * 
 * OPTIMIZATIONS:
 * 1. Input validation (UUID format, status validation)
 * 2. Query timeout (Performance)
 * 3. Cache invalidation (Performance)
 * 4. Secure error handling (Security)
 */
export const updateTicketStatus = async (req, res) => {
  try {
    // ========================================
    // 1. INPUT VALIDATION & SANITIZATION
    // ========================================
    const { ticketId } = req.params;
    let { status, assigned_to, priority, internal_notes } = req.body;
    const userId = req.user.id;

    if (!ticketId || !isValidUUID(ticketId)) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Invalid ticket ID format",
      });
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    // Validate and sanitize status
    if (status) {
      const validStatuses = [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "pending",
      ];
      status = sanitizeString(status, 50);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Invalid status",
        });
      }
      updateData.status = status;

      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }
      if (status === "closed") {
        updateData.closed_at = new Date().toISOString();
      }
    }

    // Validate assigned_to if provided
    if (assigned_to !== undefined) {
      if (assigned_to && !isValidUUID(assigned_to)) {
        return res.status(400).json({
          success: false,
          error: "Bad Request",
          message: "Invalid assigned_to ID format",
        });
      }
      updateData.assigned_to = assigned_to || null;
    }

    // Validate and sanitize priority
    if (priority) {
      const validPriorities = ["low", "medium", "high", "urgent"];
      priority = sanitizeString(priority, 20);
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Invalid priority",
        });
      }
      updateData.priority = priority;
    }

    // Sanitize internal_notes
    if (internal_notes !== undefined) {
      updateData.internal_notes = internal_notes ? sanitizeString(internal_notes, 2000) : null;
    }

    // Add assigned_at if assigned_to is set
    if (assigned_to !== undefined && assigned_to) {
      updateData.assigned_at = new Date().toISOString();
    }

    // ========================================
    // 2. GET OLD TICKET DATA (for email notification)
    // ========================================
    let oldTicket = null;
    if (status) {
      const oldTicketPromise = supabase
        .from("support_tickets")
        .select("status, user_email, user_name, ticket_number")
        .eq("id", ticketId)
        .single();

      const { data: oldTicketData, error: oldTicketError } = await executeWithTimeout(oldTicketPromise);
      
      if (!oldTicketError && oldTicketData) {
        oldTicket = oldTicketData;
      }
    }

    // ========================================
    // 3. UPDATE TICKET (with timeout)
    // ========================================
    const updatePromise = supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", ticketId)
      .select()
      .single();

    const { data: updatedTicket, error } = await executeWithTimeout(updatePromise);

    if (error || !updatedTicket) {
      console.error("❌ Error updating ticket:", error);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to update ticket. Please try again.",
      });
    }

    // ========================================
    // 4. CACHE INVALIDATION
    // ========================================
    await cacheService.del(CACHE_KEYS.TICKET_BY_ID(ticketId));
    await cacheService.delByPattern('tickets:*');
    await cacheService.delByPattern('tickets:stats:*');
    console.log('✅ Cache invalidated for ticket status update');

    // ========================================
    // 5. SEND EMAIL NOTIFICATION (if status changed)
    // ========================================
    if (status && oldTicket && updatedTicket.user_email && oldTicket.status !== updatedTicket.status) {
      // Send email asynchronously (don't block the response)
      (async () => {
        try {
          console.log('📧 Sending ticket status changed email to:', updatedTicket.user_email);
          
          const emailResult = await sendTicketStatusChangedEmail({
            email: updatedTicket.user_email,
            full_name: updatedTicket.user_name || updatedTicket.user_email.split('@')[0],
            ticket_number: updatedTicket.ticket_number,
            old_status: oldTicket.status,
            new_status: updatedTicket.status,
            ticket_id: ticketId,
          });

          if (emailResult?.success) {
            console.log('✅ Ticket status changed email sent successfully to:', updatedTicket.user_email);
          } else {
            console.warn('⚠️ Failed to send ticket status changed email:', emailResult?.error || 'Unknown error');
          }
        } catch (emailError) {
          console.error('❌ Error sending ticket status changed email:', emailError?.message || emailError);
          // Don't fail the request if email fails
        }
      })();
    }

    // ========================================
    // 6. DATA SANITIZATION
    // ========================================
    const sanitizedTicket = sanitizeObject(updatedTicket);

    res.json({
      success: true,
      data: sanitizedTicket,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while updating the ticket status.');
  }
};

/**
 * Get ticket statistics
 * @route   GET /api/customer-support/stats
 * @access  Private (Admin only)
 * 
 * OPTIMIZATIONS:
 * 1. Query timeout (Performance)
 * 2. Redis caching (Performance)
 * 3. Optimized queries (Performance)
 * 4. Secure error handling (Security)
 */
export const getTicketStats = async (req, res) => {
  try {
    // ========================================
    // 1. CACHE CHECK
    // ========================================
    const userId = req.user.id;
    const userRole = req.userProfile?.role || 'admin';
    const cacheKey = CACHE_KEYS.TICKET_STATS(userId, userRole);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for ticket stats');
      return res.json(cachedData);
    }

    // ========================================
    // 2. GET COUNTS BY STATUS (with timeout, optimized)
    // ========================================
    // Use a single query with count aggregation instead of fetching all records
    const statusCountsPromise = supabase
      .from("support_tickets")
      .select("status", { count: "exact" });

    const { data: statusCounts } = await executeWithTimeout(statusCountsPromise, 3000);

    // Count by status
    const statusMap = new Map();
    (statusCounts || []).forEach(t => {
      statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
    });

    const stats = {
      total: statusCounts?.length || 0,
      open: statusMap.get("open") || 0,
      in_progress: statusMap.get("in_progress") || 0,
      resolved: statusMap.get("resolved") || 0,
      closed: statusMap.get("closed") || 0,
      pending: statusMap.get("pending") || 0,
    };

    // ========================================
    // 3. GET UNREAD MESSAGES COUNT (with timeout)
    // ========================================
    const unreadPromise = supabase
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("message_type", "user");

    const { count: unreadCount } = await executeWithTimeout(unreadPromise, 3000);

    stats.unread_messages = unreadCount || 0;

    // ========================================
    // 4. BUILD RESPONSE
    // ========================================
    const response = {
      success: true,
      data: stats,
    };

    // ========================================
    // 5. CACHE THE RESPONSE
    // ========================================
    await cacheService.set(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    return handleApiError(error, res, 'An error occurred while fetching ticket statistics.');
  }
};
