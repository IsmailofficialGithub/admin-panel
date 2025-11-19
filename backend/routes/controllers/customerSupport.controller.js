import { supabase, supabaseAdmin } from "../../config/database.js";
import multer from "multer";

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
 */
export const createTicket = async (req, res) => {
  try {
    const { subject, message, category, priority, attachments } = req.body;
    const userId = req.user.id;

    // User profile is loaded by loadUserProfile middleware
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Subject and message are required",
      });
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
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

    if (ticketError) {
      console.error("❌ Error creating ticket:", ticketError);
      return res.status(500).json({
        error: "Database Error",
        message: "Failed to create support ticket",
      });
    }

    // Create initial message
    const { data: initialMessage, error: messageError } = await supabase
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

    if (messageError) {
      console.error("❌ Error creating initial message:", messageError);
      // Delete ticket if message creation fails
      await supabase.from("support_tickets").delete().eq("id", ticket.id);
      return res.status(500).json({
        error: "Database Error",
        message: "Failed to create support ticket message",
      });
    }

    // Handle attachments if provided (file paths from uploaded files)
    if (attachments && attachments.length > 0) {
      const attachmentPromises = attachments.map((attachment) => {
        const fileExtension = attachment.file_name?.split(".").pop() || "";
        return supabase.from("support_attachments").insert({
          ticket_id: ticket.id,
          message_id: initialMessage.id,
          file_name: attachment.file_name,
          file_path: attachment.file_path,
          file_url: attachment.file_url || attachment.file_path, // Store URL for easy access
          file_size: attachment.file_size || 0,
          file_type: attachment.file_type || "application/octet-stream",
          file_extension: fileExtension,
          uploaded_by: userId,
          is_public: false,
        });
      });
      await Promise.all(attachmentPromises);
    }

    // Notify admins (optional - can be done via email service)
    // await notifyAdminsNewTicket(ticket);

    res.status(201).json({
      success: true,
      data: {
        ticket: {
          ...ticket,
          initial_message: initialMessage,
        },
      },
      message: "Support ticket created successfully",
    });
  } catch (error) {
    console.error("❌ Error in createTicket:", error);
    res.status(500).json({
      error: "Server Error",
      message: "An unexpected error occurred",
    });
  }
};

/**
 * Get all support tickets (with filters)
 * @route   GET /api/customer-support/tickets
 * @access  Private (Admin can see all, users see only their own)
 */
export const getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assigned_to,
      user_id,
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const userId = req.user.id;

    // User profile is loaded by loadUserProfile middleware
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    const isAdmin = userProfile.role === "admin";

    // Build query
    let query = supabase
      .from("support_tickets")
      .select("*", { count: "exact" })
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

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: tickets, error, count } = await query;

    if (error) {
      console.error("❌ Error fetching tickets:", error);
      return res.status(500).json({
        error: "Database Error",
        message: "Failed to fetch support tickets",
      });
    }

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error in getTickets:", error);
    res.status(500).json({
      error: "Server Error",
      message: "An unexpected error occurred",
    });
  }
};

/**
 * Get single ticket with messages and attachments
 * @route   GET /api/customer-support/tickets/:ticketId
 * @access  Private (Admin or ticket owner)
 */
export const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    // User profile is loaded by loadUserProfile middleware
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    const isAdmin = userProfile.role === "admin";

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Support ticket not found",
      });
    }

    // Check permissions - non-admins can only see their own tickets
    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to view this ticket",
      });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("❌ Error fetching messages:", messagesError);
    }

    // Get attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from("support_attachments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("uploaded_at", { ascending: true });

    if (attachmentsError) {
      console.error("❌ Error fetching attachments:", attachmentsError);
    }

    // Mark user messages as read if admin is viewing
    if (isAdmin && messages) {
      const unreadUserMessages = messages.filter(
        (m) => m.message_type === "user" && !m.is_read
      );

      if (unreadUserMessages.length > 0) {
        const messageIds = unreadUserMessages.map((m) => m.id);
        await supabase
          .from("support_messages")
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
            read_by: userId,
          })
          .in("id", messageIds);
      }
    }

    res.json({
      success: true,
      data: {
        ticket,
        messages: messages || [],
        attachments: attachments || [],
      },
    });
  } catch (error) {
    console.error("❌ Error in getTicket:", error);
    res.status(500).json({
      error: "Server Error",
      message: "An unexpected error occurred",
    });
  }
};

/**
 * Add message to ticket
 * @route   POST /api/customer-support/tickets/:ticketId/messages
 * @access  Private (Admin or ticket owner)
 */
export const addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, is_internal, attachments = [] } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User authentication required",
      });
    }

    // -------------------------------
    // 1️⃣ Validate message or attachments
    // -------------------------------
    // Allow empty message if attachments are provided
    const hasMessage = message?.trim();
    const hasAttachments = attachments && attachments.length > 0;
    
    if (!hasMessage && !hasAttachments) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Please add a message or attach a file",
      });
    }

    // -------------------------------
    // 2️⃣ Get user profile / role (loaded by middleware)
    // -------------------------------
    const userProfile = req.userProfile;
    if (!userProfile) {
      return res.status(500).json({
        error: "Server Error",
        message: "User profile not loaded",
      });
    }

    const isAdmin = userProfile.role === "admin";

    // -------------------------------
    // 3️⃣ Validate ticket
    // -------------------------------
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found",
      });
    }

    // User can only reply to their own ticket
    if (!isAdmin && ticket.user_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You cannot post messages to this ticket",
      });
    }

    // -------------------------------
    // 4️⃣ Create message
    // -------------------------------
    const internalFlag = isAdmin && is_internal === true;

    // Use a placeholder message if only attachments are provided
    const messageText = hasMessage ? message.trim() : "(File attachment)";
    
    const { data: newMessage, error: messageError } = await supabase
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

    if (messageError) {
      console.error("❌ DB Error (Message):", messageError);
      return res.status(500).json({
        error: "Database Error",
        message: "Could not save message",
      });
    }

    // -------------------------------
    // 5️⃣ Store attachments (if any)
    // -------------------------------
    if (attachments?.length > 0) {
      const mapped = attachments.map((file) => ({
        ticket_id: ticketId,
        message_id: newMessage.id,
        file_name: file.file_name,
        file_path: file.file_path,
        file_url: file.file_url || file.file_path,
        file_size: file.file_size || 0,
        file_type: file.file_type || "application/octet-stream",
        file_extension: file.file_name?.split(".").pop() || "",
        uploaded_by: userId,
        is_public: false,
      }));

      const { error: attachError } = await supabase
        .from("support_attachments")
        .insert(mapped);

      if (attachError) {
        console.error("❌ Attachment Insert Error:", attachError);
      }
    }

    // -------------------------------
    // 6️⃣ Admin response -> update ticket status
    // -------------------------------
    if (isAdmin && ticket.status === "open") {
      await supabase
        .from("support_tickets")
        .update({
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);
    }

    // -------------------------------
    // 7️⃣ Email Notification (optional)
    // -------------------------------
    // if (isAdmin && !internalFlag) {
    //   await sendEmail(...)
    // }

    // -------------------------------
    // 8️⃣ Success Response
    // -------------------------------
    return res.status(201).json({
      success: true,
      message: "Message added successfully",
      data: newMessage,
    });

  } catch (error) {
    console.error("❌ addMessage() Error:", error);

    return res.status(500).json({
      error: "Server Error",
      message: "Unexpected server error",
    });
  }
};


/**
 * Update ticket status
 * @route   PATCH /api/customer-support/tickets/:ticketId/status
 * @access  Private (Admin only)
 */
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, assigned_to, priority, internal_notes } = req.body;
    const userId = req.user.id;

    // Admin check is handled by requireAdmin middleware

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      const validStatuses = [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "pending",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
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

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to || null;
      updateData.assigned_at = assigned_to ? new Date().toISOString() : null;
    }

    if (priority) {
      const validPriorities = ["low", "medium", "high", "urgent"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Invalid priority",
        });
      }
      updateData.priority = priority;
    }

    if (internal_notes !== undefined) {
      updateData.internal_notes = internal_notes;
    }

    const { data: updatedTicket, error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", ticketId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating ticket:", error);
      return res.status(500).json({
        error: "Database Error",
        message: "Failed to update ticket",
      });
    }

    res.json({
      success: true,
      data: updatedTicket,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error("❌ Error in updateTicketStatus:", error);
    res.status(500).json({
      error: "Server Error",
      message: "An unexpected error occurred",
    });
  }
};

/**
 * Get ticket statistics
 * @route   GET /api/customer-support/stats
 * @access  Private (Admin only)
 */
export const getTicketStats = async (req, res) => {
  try {
    // Admin check is handled by requireAdmin middleware - req.userProfile is set by middleware

    // Get counts by status
    const { data: statusCounts } = await supabase
      .from("support_tickets")
      .select("status");

    const stats = {
      total: statusCounts?.length || 0,
      open: statusCounts?.filter((t) => t.status === "open").length || 0,
      in_progress:
        statusCounts?.filter((t) => t.status === "in_progress").length || 0,
      resolved:
        statusCounts?.filter((t) => t.status === "resolved").length || 0,
      closed: statusCounts?.filter((t) => t.status === "closed").length || 0,
      pending: statusCounts?.filter((t) => t.status === "pending").length || 0,
    };

    // Get unread messages count
    const { count: unreadCount } = await supabase
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("message_type", "user");

    stats.unread_messages = unreadCount || 0;

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Error in getTicketStats:", error);
    res.status(500).json({
      error: "Server Error",
      message: "An unexpected error occurred",
    });
  }
};
