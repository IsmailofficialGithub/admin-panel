import { supabase, supabaseAdmin } from '../../config/database.js';
import { cacheService } from '../../config/redis.js';
import {
  sanitizeString,
  isValidUUID,
  validatePagination,
  sanitizeObject,
  sanitizeArray
} from '../../utils/validation.js';
import {
  executeWithTimeout,
  handleApiError,
  createPaginatedResponse,
  createRateLimitMiddleware,
  sanitizeInputMiddleware
} from '../../utils/apiOptimization.js';

// Cache configuration
const CACHE_TTL = 300; // 5 minutes
const STATS_CACHE_TTL = 60; // 1 minute for stats
const CACHE_KEYS = {
  CALLS_LIST: (userId, page, limit) => `genie:calls:${userId}:page${page}_limit${limit}`,
  CALL_BY_ID: (id) => `genie:call:${id}`,
  CALL_STATS: (userId, period) => `genie:stats:${userId}:${period}`,
  CAMPAIGNS_LIST: (userId, page, limit) => `genie:campaigns:${userId}:page${page}_limit${limit}`,
  CAMPAIGN_BY_ID: (id) => `genie:campaign:${id}`,
  LEADS_LIST: (userId, page, limit) => `genie:leads:${userId}:page${page}_limit${limit}`,
  LEAD_BY_ID: (id) => `genie:lead:${id}`,
  BOTS_LIST: (userId) => `genie:bots:${userId}`,
  CONTACT_LISTS: (userId) => `genie:contact_lists:${userId}`,
  ANALYTICS: (userId, type, period) => `genie:analytics:${userId}:${type}:${period}`,
};

// Export middleware for use in routes
export const rateLimitMiddleware = createRateLimitMiddleware('genie', 100);
export { sanitizeInputMiddleware };

/**
 * Clear genie-related caches
 */
const clearGenieCaches = async (userId, options = {}) => {
  const { clearCalls, clearCampaigns, clearLeads, clearStats, clearAll } = options;
  const keysToDelete = [];

  try {
    if (clearAll || clearCalls) {
      keysToDelete.push(`genie:calls:${userId}:*`);
      keysToDelete.push(`genie:call:*`);
    }
    if (clearAll || clearCampaigns) {
      keysToDelete.push(`genie:campaigns:${userId}:*`);
      keysToDelete.push(`genie:campaign:*`);
    }
    if (clearAll || clearLeads) {
      keysToDelete.push(`genie:leads:${userId}:*`);
      keysToDelete.push(`genie:lead:*`);
    }
    if (clearAll || clearStats) {
      keysToDelete.push(`genie:stats:${userId}:*`);
      keysToDelete.push(`genie:analytics:${userId}:*`);
    }

    for (const pattern of keysToDelete) {
      await cacheService.delByPattern(pattern);
    }
    console.log(`✅ Cleared genie caches for user ${userId}`);
  } catch (error) {
    console.error('❌ Error clearing genie caches:', error);
  }
};

// =====================================================
// CALLS ENDPOINTS
// =====================================================

/**
 * Get all calls with pagination and filters
 * @route   GET /api/genie/calls
 * @access  Private (genie.calls.view)
 */
export const getAllCalls = async (req, res) => {
  try {
    const { page, limit, botId, status, isLead, startDate, endDate, search } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Validate botId if provided
    if (botId && !isValidUUID(botId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid bot ID format'
      });
    }

    console.log('📞 Fetching calls with filters:', { page: pageNum, limit: limitNum, botId, status, isLead, isSystemAdmin });

    // Build query
    let query = supabase
      .from('call_logs')
      .select(`
        id,
        name,
        phone,
        call_url,
        agent,
        call_type,
        call_status,
        transcript,
        duration,
        end_reason,
        started_at,
        ended_at,
        created_at,
        is_lead,
        bot_id,
        contact_id,
        list_id,
        genie_bots (
          id,
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (botId) {
      query = query.eq('bot_id', botId);
    }
    if (status) {
      query = query.eq('call_status', sanitizeString(status, 50));
    }
    if (isLead !== undefined) {
      query = query.eq('is_lead', isLead === 'true');
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (search) {
      const searchTerm = sanitizeString(search, 100);
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: calls, error, count } = await executeWithTimeout(query);

    if (error) {
      console.error('❌ Error fetching calls:', error);
      return handleApiError(error, res, 'Failed to fetch calls');
    }

    const result = createPaginatedResponse(
      sanitizeArray(calls || []),
      count || 0,
      pageNum,
      limitNum
    );

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch calls');
  }
};

/**
 * Get all calls by owner user ID (consumer ID from URL)
 * @route   GET /api/genie/calls/owner/:ownerUserId
 * @access  Private (genie.calls.view)
 * 
 * Flow:
 * - System admin logs in (req.user.id is the system admin)
 * - System admin views consumer detail page (ownerUserId is the consumer ID from URL)
 * - Filter calls where owner_user_id = consumer ID from URL
 */
export const getAllCallsByOwnerId = async (req, res) => {
  try {
    const { ownerUserId } = req.params; // This is the consumer ID from the URL
    const { page, limit, botId, status, isLead, startDate, endDate, search } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;
    const loggedInUserId = req.user.id; // The logged-in user (system admin)
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Validate ownerUserId (consumer ID from URL)
    if (!ownerUserId || !isValidUUID(ownerUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid owner user ID format'
      });
    }

    // Permission is already checked by middleware (genie.calls.view)
    // System admins and users with genie.calls.view permission can access this endpoint
    console.log('🔍 Permission check for getAllCallsByOwnerId:', {
      loggedInUserId,
      userProfile: req.userProfile,
      isSystemAdmin,
      is_systemadmin: req.userProfile?.is_systemadmin,
      role: req.userProfile?.role,
      ownerUserId
    });

    // Validate botId if provided
    if (botId && !isValidUUID(botId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid bot ID format'
      });
    }

    console.log('📞 Fetching calls by owner (consumer ID from URL):', { 
      loggedInUserId, // The system admin who is logged in
      isSystemAdmin, 
      ownerUserId, // Consumer ID from URL - this is what we filter by
      page: pageNum, 
      limit: limitNum, 
      botId, 
      status, 
      isLead 
    });

    // Build query - filter by owner_user_id (consumer ID from URL)
    // This filters calls where owner_user_id equals the consumer ID from the URL
    let query = supabase
      .from('call_logs')
      .select(`
        id,
        name,
        phone,
        call_url,
        agent,
        call_type,
        call_status,
        transcript,
        duration,
        end_reason,
        started_at,
        ended_at,
        created_at,
        is_lead,
        bot_id,
        contact_id,
        list_id,
        owner_user_id,
        genie_bots (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('owner_user_id', ownerUserId) // Filter by consumer ID from URL (ownerUserId param)
      .order('created_at', { ascending: false });

    // Apply filters
    if (botId) {
      query = query.eq('bot_id', botId);
    }
    if (status) {
      query = query.eq('call_status', sanitizeString(status, 50));
    }
    if (isLead !== undefined) {
      query = query.eq('is_lead', isLead === 'true');
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (search) {
      const searchTerm = sanitizeString(search, 100);
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: calls, error, count } = await executeWithTimeout(query);

    if (error) {
      console.error('❌ Error fetching calls by owner:', error);
      return handleApiError(error, res, 'Failed to fetch calls');
    }

    const result = createPaginatedResponse(
      sanitizeArray(calls || []),
      count || 0,
      pageNum,
      limitNum
    );

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch calls by owner');
  }
};

/**
 * Get call by ID
 * @route   GET /api/genie/calls/:id
 * @access  Private (genie.calls.read)
 */
export const getCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid call ID format'
      });
    }

    // Check cache
    const cacheKey = CACHE_KEYS.CALL_BY_ID(id);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for call detail');
      return res.json(cachedData);
    }

    // TEMPORARILY NO OWNER FILTER - to debug
    const { data: call, error } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select(`
          *,
          genie_bots (
            id,
            name,
            company_name,
            goal
          ),
          genie_contacts (
            id,
            name,
            phone_number,
            email,
            extra_data
          ),
          genie_contact_lists (
            id,
            name
          )
        `)
        .eq('id', id)
        .maybeSingle() // Use maybeSingle instead of single to avoid error when no rows
    );

    if (error) {
      console.error('❌ Error fetching call:', error);
      return handleApiError(error, res, 'Failed to fetch call');
    }

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Call not found'
      });
    }

    const result = {
      success: true,
      data: sanitizeObject(call)
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch call');
  }
};

/**
 * Get call statistics
 * @route   GET /api/genie/calls/stats
 * @access  Private (genie.view)
 */
export const getCallStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;
    const { period = 'today' } = req.query;

    // Calculate date range
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Check cache
    const cacheKey = CACHE_KEYS.CALL_STATS(isSystemAdmin ? 'admin' : userId, period);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for call stats');
      return res.json(cachedData);
    }

    // TEMPORARILY NO FILTERING to debug
    // Get total calls
    const { data: totalData, count: totalCount, error: totalError } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
    );

    // Get completed calls
    const { data: completedData, count: completedCount, error: completedError } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .eq('call_status', 'completed')
        .gte('created_at', startDate.toISOString())
    );

    // Get leads count
    const { count: leadsCount, error: leadsError } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .eq('is_lead', true)
        .gte('created_at', startDate.toISOString())
    );

    // Get average duration
    const { data: durationData, error: durationError } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('duration')
        .not('duration', 'is', null)
        .gte('created_at', startDate.toISOString())
    );

    // Calculate stats
    const totalCalls = totalCount || 0;
    const avgDuration = durationData && durationData.length > 0
      ? durationData.reduce((sum, c) => sum + (c.duration || 0), 0) / durationData.length
      : 0;
    const successRate = totalCalls > 0 ? ((completedCount || 0) / totalCalls * 100).toFixed(1) : 0;

    const result = {
      success: true,
      data: {
        totalCalls,
        completedCalls: completedCount || 0,
        leadsGenerated: leadsCount || 0,
        avgDuration: Math.round(avgDuration),
        successRate: parseFloat(successRate),
        period
      }
    };

    await cacheService.set(cacheKey, result, STATS_CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch call stats');
  }
};

/**
 * Update call lead status
 * @route   PATCH /api/genie/calls/:id/lead
 * @access  Private (genie.calls.update)
 */
export const updateCallLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLead } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid call ID format'
      });
    }

    if (typeof isLead !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'isLead must be a boolean'
      });
    }

    const { data: call, error } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .update({ is_lead: isLead, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_user_id', userId)
        .select()
        .single()
    );

    if (error) {
      console.error('❌ Error updating call:', error);
      return handleApiError(error, res, 'Failed to update call');
    }

    // Clear caches
    await clearGenieCaches(userId, { clearCalls: true, clearStats: true });

    res.json({
      success: true,
      message: `Call ${isLead ? 'marked as lead' : 'unmarked as lead'}`,
      data: sanitizeObject(call)
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to update call');
  }
};

// =====================================================
// CAMPAIGNS ENDPOINTS
// =====================================================

/**
 * Get all campaigns
 * @route   GET /api/genie/campaigns
 * @access  Private (genie.campaigns.view)
 */
export const getAllCampaigns = async (req, res) => {
  try {
    const { page, limit, status, ownerUserId } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Validate ownerUserId if provided
    if (ownerUserId && !isValidUUID(ownerUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid owner user ID format'
      });
    }

    console.log('📅 Fetching campaigns:', { page: pageNum, limit: limitNum, status, isSystemAdmin, ownerUserId });

    let query = supabase
      .from('genie_scheduled_calls')
      .select(`
        id,
        scheduled_at,
        status,
        contacts_count,
        calls_completed,
        calls_failed,
        error_message,
        created_at,
        updated_at,
        runtime_call_status,
        tz,
        owner_user_id,
        genie_bots (
          id,
          name
        ),
        genie_contact_lists (
          id,
          name
        )
      `, { count: 'exact' })
      .order('scheduled_at', { ascending: false });

    // Filter by owner_user_id if provided
    if (ownerUserId) {
      query = query.eq('owner_user_id', ownerUserId);
      console.log(`✅ Filtering campaigns by owner_user_id: ${ownerUserId}`);
    } else if (!isSystemAdmin) {
      // Non-admin users only see their own campaigns (when not filtering by specific owner)
      query = query.eq('owner_user_id', userId);
    }

    if (status) {
      query = query.eq('status', sanitizeString(status, 50));
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: campaigns, error, count } = await executeWithTimeout(query);

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      return handleApiError(error, res, 'Failed to fetch campaigns');
    }

    // Add progress percentage to each campaign
    const campaignsWithProgress = (campaigns || []).map(c => ({
      ...c,
      progress_percent: c.contacts_count > 0 
        ? Math.round((c.calls_completed / c.contacts_count) * 100) 
        : 0
    }));

    const result = createPaginatedResponse(
      sanitizeArray(campaignsWithProgress),
      count || 0,
      pageNum,
      limitNum
    );

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch campaigns');
  }
};

/**
 * Get campaign by ID
 * @route   GET /api/genie/campaigns/:id
 * @access  Private (genie.campaigns.read)
 */
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid campaign ID format'
      });
    }

    const { data: campaign, error } = await executeWithTimeout(
      supabase
        .from('genie_scheduled_calls')
        .select(`
          *,
          genie_bots (
            id,
            name,
            company_name,
            goal,
            voice,
            language
          ),
          genie_contact_lists (
            id,
            name,
            description
          )
        `)
        .eq('id', id)
        .eq('owner_user_id', userId)
        .single()
    );

    if (error) {
      console.error('❌ Error fetching campaign:', error);
      return handleApiError(error, res, 'Failed to fetch campaign');
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    // Get associated calls for this campaign
    const { data: calls, error: callsError } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id, name, phone, call_status, duration, is_lead, created_at')
        .eq('scheduled_list_id', id)
        .order('created_at', { ascending: false })
        .limit(100)
    );

    res.json({
      success: true,
      data: {
        ...sanitizeObject(campaign),
        progress_percent: campaign.contacts_count > 0 
          ? Math.round((campaign.calls_completed / campaign.contacts_count) * 100) 
          : 0,
        calls: sanitizeArray(calls || [])
      }
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch campaign');
  }
};

/**
 * Create new campaign
 * @route   POST /api/genie/campaigns
 * @access  Private (genie.campaigns.create)
 */
export const createCampaign = async (req, res) => {
  try {
    const { botId, listId, scheduledAt, timezone } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!botId || !listId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'botId, listId, and scheduledAt are required'
      });
    }

    if (!isValidUUID(botId) || !isValidUUID(listId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid bot ID or list ID format'
      });
    }

    // Get contact count from list
    const { count: contactsCount, error: countError } = await executeWithTimeout(
      supabase
        .from('genie_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', listId)
    );

    if (countError) {
      console.error('❌ Error getting contacts count:', countError);
      return handleApiError(countError, res, 'Failed to get contacts count');
    }

    const { data: campaign, error } = await executeWithTimeout(
      supabase
        .from('genie_scheduled_calls')
        .insert({
          owner_user_id: userId,
          bot_id: botId,
          list_id: listId,
          scheduled_at: scheduledAt,
          tz: timezone || 'UTC',
          status: 'scheduled',
          contacts_count: contactsCount || 0,
          calls_completed: 0,
          calls_failed: 0
        })
        .select(`
          *,
          genie_bots (id, name),
          genie_contact_lists (id, name)
        `)
        .single()
    );

    if (error) {
      console.error('❌ Error creating campaign:', error);
      return handleApiError(error, res, 'Failed to create campaign');
    }

    // Clear caches
    await clearGenieCaches(userId, { clearCampaigns: true });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: sanitizeObject(campaign)
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to create campaign');
  }
};

/**
 * Update campaign
 * @route   PATCH /api/genie/campaigns/:id
 * @access  Private (genie.campaigns.update)
 */
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, status, timezone } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid campaign ID format'
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (scheduledAt) updateData.scheduled_at = scheduledAt;
    if (status) updateData.status = sanitizeString(status, 50);
    if (timezone) updateData.tz = sanitizeString(timezone, 50);

    const { data: campaign, error } = await executeWithTimeout(
      supabase
        .from('genie_scheduled_calls')
        .update(updateData)
        .eq('id', id)
        .eq('owner_user_id', userId)
        .select()
        .single()
    );

    if (error) {
      console.error('❌ Error updating campaign:', error);
      return handleApiError(error, res, 'Failed to update campaign');
    }

    // Clear caches
    await clearGenieCaches(userId, { clearCampaigns: true });

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: sanitizeObject(campaign)
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to update campaign');
  }
};

/**
 * Cancel/delete campaign
 * @route   DELETE /api/genie/campaigns/:id
 * @access  Private (genie.campaigns.delete)
 */
export const cancelCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid campaign ID format'
      });
    }

    // Check if campaign exists and is cancellable
    const { data: existing, error: fetchError } = await executeWithTimeout(
      supabase
        .from('genie_scheduled_calls')
        .select('status')
        .eq('id', id)
        .eq('owner_user_id', userId)
        .single()
    );

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Campaign not found'
      });
    }

    if (existing.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cannot cancel a completed campaign'
      });
    }

    // Update status to cancelled
    const { error } = await executeWithTimeout(
      supabase
        .from('genie_scheduled_calls')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_user_id', userId)
    );

    if (error) {
      console.error('❌ Error cancelling campaign:', error);
      return handleApiError(error, res, 'Failed to cancel campaign');
    }

    // Clear caches
    await clearGenieCaches(userId, { clearCampaigns: true });

    res.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to cancel campaign');
  }
};

// =====================================================
// LEADS ENDPOINTS
// =====================================================

/**
 * Get all leads
 * @route   GET /api/genie/leads
 * @access  Private (genie.leads.view)
 */
export const getAllLeads = async (req, res) => {
  try {
    const { page, limit, botId, startDate, endDate, search, ownerUserId } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;
    const loggedInUserId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Validate ownerUserId if provided
    if (ownerUserId && !isValidUUID(ownerUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid owner user ID format'
      });
    }

    console.log('🎯 Fetching leads:', { page: pageNum, limit: limitNum, isSystemAdmin, ownerUserId, loggedInUserId });

    let query = supabase
      .from('genie_leads')
      .select(`
        id,
        name,
        phone,
        email,
        call_id,
        transcript,
        summary,
        recording_url,
        agent,
        bot_id,
        contact_id,
        list_id,
        created_at,
        updated_at,
        metadata,
        genie_bots (
          id,
          name,
          owner_user_id
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by owner_user_id via bot relationship if provided
    if (ownerUserId) {
      // First get all bot IDs for this owner
      const { data: ownerBots } = await supabase
        .from('genie_bots')
        .select('id')
        .eq('owner_user_id', ownerUserId);
      
      if (ownerBots && ownerBots.length > 0) {
        const botIds = ownerBots.map(b => b.id);
        query = query.in('bot_id', botIds);
        console.log(`✅ Filtering leads by ${botIds.length} bot(s) for owner ${ownerUserId}`);
      } else {
        // No bots found for this owner, return empty result
        query = query.eq('bot_id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
        console.log(`ℹ️ No bots found for owner ${ownerUserId}, returning empty leads result`);
      }
    }

    if (botId && isValidUUID(botId)) {
      query = query.eq('bot_id', botId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (search) {
      const searchTerm = sanitizeString(search, 100);
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    query = query.range(offset, offset + limitNum - 1);

    const { data: leads, error, count } = await executeWithTimeout(query);

    if (error) {
      console.error('❌ Error fetching leads:', error);
      return handleApiError(error, res, 'Failed to fetch leads');
    }

    const result = createPaginatedResponse(
      sanitizeArray(leads || []),
      count || 0,
      pageNum,
      limitNum
    );

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch leads');
  }
};

/**
 * Get lead by ID
 * @route   GET /api/genie/leads/:id
 * @access  Private (genie.leads.read)
 */
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid lead ID format'
      });
    }

    // TEMPORARILY NO OWNER FILTER - to debug
    const { data: lead, error } = await executeWithTimeout(
      supabase
        .from('genie_leads')
        .select(`
          *,
          genie_bots (
            id,
            name,
            company_name
          ),
          genie_contacts (
            id,
            name,
            phone_number,
            email,
            extra_data
          ),
          genie_contact_lists (
            id,
            name
          )
        `)
        .eq('id', id)
        .maybeSingle() // Use maybeSingle instead of single to avoid error when no rows
    );

    if (error) {
      console.error('❌ Error fetching lead:', error);
      return handleApiError(error, res, 'Failed to fetch lead');
    }

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: sanitizeObject(lead)
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch lead');
  }
};

/**
 * Update lead
 * @route   PATCH /api/genie/leads/:id
 * @access  Private (genie.leads.update)
 */
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, metadata } = req.body;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid lead ID format'
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (summary !== undefined) updateData.summary = sanitizeString(summary, 5000);
    if (metadata !== undefined) updateData.metadata = sanitizeObject(metadata);

    const { data: lead, error } = await executeWithTimeout(
      supabase
        .from('genie_leads')
        .update(updateData)
        .eq('id', id)
        .eq('owner_user_id', userId)
        .select()
        .single()
    );

    if (error) {
      console.error('❌ Error updating lead:', error);
      return handleApiError(error, res, 'Failed to update lead');
    }

    // Clear caches
    await clearGenieCaches(userId, { clearLeads: true });

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: sanitizeObject(lead)
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to update lead');
  }
};

/**
 * Delete lead
 * @route   DELETE /api/genie/leads/:id
 * @access  Private (genie.leads.delete)
 */
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid lead ID format'
      });
    }

    const { error } = await executeWithTimeout(
      supabase
        .from('genie_leads')
        .delete()
        .eq('id', id)
        .eq('owner_user_id', userId)
    );

    if (error) {
      console.error('❌ Error deleting lead:', error);
      return handleApiError(error, res, 'Failed to delete lead');
    }

    // Clear caches
    await clearGenieCaches(userId, { clearLeads: true, clearStats: true });

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (err) {
    return handleApiError(err, res, 'Failed to delete lead');
  }
};

/**
 * Export leads to CSV
 * @route   GET /api/genie/leads/export
 * @access  Private (genie.leads.export)
 */
export const exportLeads = async (req, res) => {
  try {
    const { startDate, endDate, botId, ownerUserId } = req.query;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Validate ownerUserId if provided
    if (ownerUserId && !isValidUUID(ownerUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid owner user ID format'
      });
    }

    console.log('📤 Exporting leads with filters:', { startDate, endDate, botId, ownerUserId });

    let query = supabase
      .from('genie_leads')
      .select(`
        name,
        phone,
        email,
        summary,
        created_at,
        bot_id,
        genie_bots (name, owner_user_id)
      `)
      .order('created_at', { ascending: false });

    // Filter by owner_user_id via bot relationship if provided and user is system admin
    if (ownerUserId && isSystemAdmin) {
      // First get all bot IDs for this owner
      const { data: ownerBots } = await supabase
        .from('genie_bots')
        .select('id')
        .eq('owner_user_id', ownerUserId);
      
      if (ownerBots && ownerBots.length > 0) {
        const botIds = ownerBots.map(b => b.id);
        query = query.in('bot_id', botIds);
      } else {
        // No bots found for this owner, return empty result
        query = query.eq('bot_id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
      }
    }

    if (botId && isValidUUID(botId)) {
      query = query.eq('bot_id', botId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: leads, error } = await executeWithTimeout(query);

    console.log('📤 Export leads result:', { count: leads?.length || 0, hasError: !!error });

    if (error) {
      console.error('❌ Error exporting leads:', error);
      return handleApiError(error, res, 'Failed to export leads');
    }

    // Generate CSV
    const headers = ['Name', 'Phone', 'Email', 'Bot', 'Summary', 'Created At'];
    const rows = (leads || []).map(lead => [
      lead.name || '',
      lead.phone || '',
      lead.email || '',
      lead.genie_bots?.name || '',
      (lead.summary || '').replace(/"/g, '""'),
      lead.created_at || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Set headers to prevent caching and force download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
    res.status(200).send(csv);
  } catch (err) {
    return handleApiError(err, res, 'Failed to export leads');
  }
};

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * Get call analytics
 * @route   GET /api/genie/analytics/calls
 * @access  Private (genie.analytics.view)
 */
export const getCallAnalytics = async (req, res) => {
  try {
    const { period = 'week', groupBy = 'day' } = req.query;
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Calculate date range
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    // Check cache
    const cacheKey = CACHE_KEYS.ANALYTICS(isSystemAdmin ? 'admin' : userId, 'calls', period);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT for call analytics');
      return res.json(cachedData);
    }

    // Get calls data - TEMPORARILY NO FILTERING to debug
    const { data: calls, error } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('created_at, call_status, is_lead, duration')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
    );

    if (error) {
      console.error('❌ Error fetching call analytics:', error);
      return handleApiError(error, res, 'Failed to fetch call analytics');
    }

    // Group by date
    const groupedData = {};
    (calls || []).forEach(call => {
      const date = new Date(call.created_at);
      let key;
      if (groupBy === 'hour') {
        key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = { date: key, total: 0, completed: 0, failed: 0, leads: 0, totalDuration: 0 };
      }
      groupedData[key].total++;
      if (call.call_status === 'completed') groupedData[key].completed++;
      if (call.call_status === 'failed') groupedData[key].failed++;
      if (call.is_lead) groupedData[key].leads++;
      if (call.duration) groupedData[key].totalDuration += call.duration;
    });

    // Convert to array and add averages
    const chartData = Object.values(groupedData).map(d => ({
      ...d,
      avgDuration: d.total > 0 ? Math.round(d.totalDuration / d.total) : 0
    }));

    const result = {
      success: true,
      data: {
        chartData,
        period,
        groupBy
      }
    };

    await cacheService.set(cacheKey, result, STATS_CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch call analytics');
  }
};

/**
 * Get conversion metrics
 * @route   GET /api/genie/analytics/conversion
 * @access  Private (genie.analytics.view)
 */
export const getConversionMetrics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Calculate date range
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    // Check cache
    const cacheKey = CACHE_KEYS.ANALYTICS(isSystemAdmin ? 'admin' : userId, 'conversion', period);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // TEMPORARILY NO FILTERING to debug
    // Get total calls
    const { count: totalCalls } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
    );

    // Get completed calls
    const { count: completedCalls } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .eq('call_status', 'completed')
        .gte('created_at', startDate.toISOString())
    );

    // Get leads from call_logs
    const { count: callLeads } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select('id', { count: 'exact', head: true })
        .eq('is_lead', true)
        .gte('created_at', startDate.toISOString())
    );

    // Get leads from genie_leads table
    const { count: totalLeads } = await executeWithTimeout(
      supabase
        .from('genie_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
    );

    const result = {
      success: true,
      data: {
        funnel: [
          { stage: 'Calls Made', count: totalCalls || 0 },
          { stage: 'Completed', count: completedCalls || 0 },
          { stage: 'Leads', count: Math.max(callLeads || 0, totalLeads || 0) }
        ],
        conversionRate: totalCalls > 0 
          ? ((Math.max(callLeads || 0, totalLeads || 0) / totalCalls) * 100).toFixed(2)
          : 0,
        completionRate: totalCalls > 0
          ? ((completedCalls / totalCalls) * 100).toFixed(2)
          : 0,
        period
      }
    };

    await cacheService.set(cacheKey, result, STATS_CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch conversion metrics');
  }
};

/**
 * Get bot performance
 * @route   GET /api/genie/analytics/bots
 * @access  Private (genie.analytics.view)
 */
export const getBotPerformance = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Calculate date range
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Check cache
    const cacheKey = CACHE_KEYS.ANALYTICS(isSystemAdmin ? 'admin' : userId, 'bots', period);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Get calls grouped by bot - TEMPORARILY NO FILTERING to debug
    const { data: calls, error } = await executeWithTimeout(
      supabase
        .from('call_logs')
        .select(`
          bot_id,
          call_status,
          is_lead,
          duration,
          genie_bots (id, name)
        `)
        .gte('created_at', startDate.toISOString())
    );

    if (error) {
      console.error('❌ Error fetching bot performance:', error);
      return handleApiError(error, res, 'Failed to fetch bot performance');
    }

    // Group by bot
    const botStats = {};
    (calls || []).forEach(call => {
      const botId = call.bot_id || 'unknown';
      const botName = call.genie_bots?.name || 'Unknown Bot';
      
      if (!botStats[botId]) {
        botStats[botId] = {
          botId,
          botName,
          totalCalls: 0,
          completedCalls: 0,
          leads: 0,
          totalDuration: 0
        };
      }
      
      botStats[botId].totalCalls++;
      if (call.call_status === 'completed') botStats[botId].completedCalls++;
      if (call.is_lead) botStats[botId].leads++;
      if (call.duration) botStats[botId].totalDuration += call.duration;
    });

    // Calculate metrics and convert to array
    const botPerformance = Object.values(botStats).map(bot => ({
      ...bot,
      successRate: bot.totalCalls > 0 
        ? ((bot.completedCalls / bot.totalCalls) * 100).toFixed(1)
        : 0,
      conversionRate: bot.totalCalls > 0
        ? ((bot.leads / bot.totalCalls) * 100).toFixed(1)
        : 0,
      avgDuration: bot.totalCalls > 0
        ? Math.round(bot.totalDuration / bot.totalCalls)
        : 0
    })).sort((a, b) => b.totalCalls - a.totalCalls);

    const result = {
      success: true,
      data: {
        bots: botPerformance,
        period
      }
    };

    await cacheService.set(cacheKey, result, STATS_CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch bot performance');
  }
};

// =====================================================
// SUPPORTING ENDPOINTS
// =====================================================

/**
 * Get all bots
 * @route   GET /api/genie/bots
 * @access  Private (genie.view)
 */
export const getAllBots = async (req, res) => {
  try {
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;
    const { ownerUserId } = req.query;

    // Check cache (skip cache if filtering by ownerUserId)
    if (!ownerUserId) {
      const cacheKey = CACHE_KEYS.BOTS_LIST(isSystemAdmin ? 'admin' : userId);
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
    }

    // Build query
    let query = supabase
      .from('genie_bots')
      .select('id, name, company_name, goal, voice, language, created_at, owner_user_id, vapi_account_assigned')
      .order('name', { ascending: true });

    // Filter by owner_user_id if provided
    if (ownerUserId && isValidUUID(ownerUserId)) {
      query = query.eq('owner_user_id', ownerUserId);
      console.log(`✅ Filtering bots by owner_user_id: ${ownerUserId}`);
    } else if (!isSystemAdmin && !ownerUserId) {
      // Non-admin users only see their own bots (when not filtering by specific owner)
      query = query.eq('owner_user_id', userId);
    }

    const { data: bots, error } = await executeWithTimeout(query);

    if (error) {
      console.error('❌ Error fetching bots:', error);
      return handleApiError(error, res, 'Failed to fetch bots');
    }

    const result = {
      success: true,
      data: sanitizeArray(bots || [])
    };

    // Only cache if not filtering by ownerUserId
    if (!ownerUserId) {
      const cacheKey = CACHE_KEYS.BOTS_LIST(isSystemAdmin ? 'admin' : userId);
      await cacheService.set(cacheKey, result, CACHE_TTL);
    }

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch bots');
  }
};

/**
 * Get all contact lists
 * @route   GET /api/genie/contact-lists
 * @access  Private (genie.view)
 */
export const getAllContactLists = async (req, res) => {
  try {
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;
    const { ownerUserId } = req.query;

    // Validate ownerUserId if provided
    if (ownerUserId && !isValidUUID(ownerUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid owner user ID format'
      });
    }

    // Check cache (skip cache if filtering by ownerUserId)
    if (!ownerUserId) {
      const cacheKey = CACHE_KEYS.CONTACT_LISTS(isSystemAdmin ? 'admin' : userId);
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
    }

    // Build query
    let query = supabase
      .from('genie_contact_lists')
      .select('id, name, description, created_at, owner_user_id')
      .order('name', { ascending: true });

    // Filter by owner_user_id if provided
    if (ownerUserId) {
      query = query.eq('owner_user_id', ownerUserId);
      console.log(`✅ Filtering contact lists by owner_user_id: ${ownerUserId}`);
    } else if (!isSystemAdmin) {
      // Non-admin users only see their own lists (when not filtering by specific owner)
      query = query.eq('owner_user_id', userId);
    }

    const { data: lists, error } = await executeWithTimeout(query);

    if (error) {
      console.error('❌ Error fetching contact lists:', error);
      return handleApiError(error, res, 'Failed to fetch contact lists');
    }

    // Get contact counts for each list
    const listsWithCounts = await Promise.all(
      (lists || []).map(async (list) => {
        const { count } = await executeWithTimeout(
          supabase
            .from('genie_contacts')
            .select('id', { count: 'exact', head: true })
            .eq('list_id', list.id)
        );
        return { ...list, contacts_count: count || 0 };
      })
    );

    const result = {
      success: true,
      data: sanitizeArray(listsWithCounts)
    };

    // Only cache if not filtering by ownerUserId
    if (!ownerUserId) {
      const cacheKey = CACHE_KEYS.CONTACT_LISTS(isSystemAdmin ? 'admin' : userId);
      await cacheService.set(cacheKey, result, CACHE_TTL);
    }

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch contact lists');
  }
};

/**
 * Get all Vapi accounts
 * @route   GET /api/genie/vapi-accounts
 * @access  Private (genie.view)
 */
export const getVapiAccounts = async (req, res) => {
  try {
    // Check for cache-busting parameter
    const { nocache } = req.query;
    const cacheKey = 'genie:vapi_accounts:all';
    
    if (!nocache) {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('✅ Cache HIT for Vapi accounts');
        return res.json(cachedData);
      }
    } else {
      console.log('🔄 Cache bypass requested');
    }

    console.log('❌ Cache MISS for Vapi accounts - fetching from database');

    // Use supabaseAdmin to bypass RLS policies (admin operation)
    const client = supabaseAdmin || supabase;
    
    // PostgREST expects lowercase table name 'vapi_accounts' (hint from error: "Perhaps you meant the table 'public.vapi_accounts'")
    // Try lowercase table name with * first (simplest approach)
    let query = client
      .from('vapi_accounts')
      .select('*')
      .order('account_name', { ascending: true });

    let { data: accounts, error } = await executeWithTimeout(query);

    // If lowercase columns fail, try with exact case column names (Account_name)
    if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.log('⚠️ Lowercase column names failed, trying exact case column names...');
      query = client
        .from('vapi_accounts')
        .select('*')
        .order('Account_name', { ascending: true });
      
      const result = await executeWithTimeout(query);
      accounts = result.data;
      error = result.error;
    }

    // If * selector fails, try specific column names with lowercase
    if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.log('⚠️ * selector failed, trying specific lowercase column names...');
      query = client
        .from('vapi_accounts')
        .select('id, account_name, account_description, created_at')
        .order('account_name', { ascending: true });
      
      const result = await executeWithTimeout(query);
      accounts = result.data;
      error = result.error;
    }

    // Last resort: try exact case column names with specific columns
    if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.log('⚠️ Trying exact case column names with specific columns...');
      query = client
        .from('vapi_accounts')
        .select('id, Account_name, Account_description, created_at')
        .order('Account_name', { ascending: true });
      
      const result = await executeWithTimeout(query);
      accounts = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Error fetching Vapi accounts:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Return the actual error message to help debug
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: `Failed to fetch Vapi accounts: ${error.message || 'Unknown error'}`,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      });
    }

    console.log(`✅ Fetched ${accounts?.length || 0} Vapi account(s) from database`);
    
    // Log the actual data structure for debugging
    if (accounts && accounts.length > 0) {
      console.log('📋 Sample account data:', JSON.stringify(accounts[0], null, 2));
    } else {
      console.log('⚠️ No accounts found in vapi_accounts table. Make sure data exists.');
    }

    // Map accounts to ensure consistent field names (handle both Account_name and account_name)
    const mappedAccounts = (accounts || []).map(account => ({
      id: account.id,
      Account_name: account.Account_name || account.account_name || account.Account_Name,
      Account_description: account.Account_description || account.account_description || account.Account_Description,
      created_at: account.created_at
    }));

    const result = {
      success: true,
      data: sanitizeArray(mappedAccounts)
    };

    // Only cache if we got data or if it's a successful empty result
    if (!error) {
      await cacheService.set(cacheKey, result, CACHE_TTL);
    }
    
    res.json(result);
  } catch (err) {
    console.error('❌ Exception in getVapiAccounts:', err);
    return handleApiError(err, res, 'Failed to fetch Vapi accounts');
  }
};

/**
 * Update vapi_account_assigned for all bots owned by a specific user
 * @route   PATCH /api/genie/bots/assign-vapi-account
 * @access  Private (genie.view)
 */
export const updateBotsVapiAccount = async (req, res) => {
  try {
    const { ownerUserId, vapiAccountId } = req.body;
    const userId = req.user.id;
    const isSystemAdmin = req.userProfile?.is_systemadmin === true;

    // Validate inputs
    if (!ownerUserId || !isValidUUID(ownerUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Valid owner user ID is required'
      });
    }

    // Validate vapiAccountId (can be null to unassign)
    if (vapiAccountId !== null && vapiAccountId !== undefined) {
      if (typeof vapiAccountId !== 'number' && !Number.isInteger(Number(vapiAccountId))) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid Vapi account ID format'
        });
      }
    }

    // Check if user has permission (admin or the owner themselves)
    if (!isSystemAdmin && ownerUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update bots for your own account'
      });
    }

    // If vapiAccountId is provided, verify it exists
    if (vapiAccountId !== null && vapiAccountId !== undefined) {
      // Use supabaseAdmin to bypass RLS policies
      const client = supabaseAdmin || supabase;
      
      // Try lowercase table name first
      let accountQuery = client
        .from('vapi_accounts')
        .select('id')
        .eq('id', vapiAccountId)
        .single();

      let { data: account, error: accountError } = await executeWithTimeout(accountQuery);

      // If lowercase fails, try exact case table name
      if (accountError && (accountError.code === 'PGRST116' || accountError.message?.includes('relation') || accountError.message?.includes('does not exist'))) {
        accountQuery = client
          .from('Vapi_accounts')
          .select('id')
          .eq('id', vapiAccountId)
          .single();
        
        const result = await executeWithTimeout(accountQuery);
        account = result.data;
        accountError = result.error;
      }

      if (accountError || !account) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Vapi account not found'
        });
      }
    }

    // Update all bots for this owner
    const updateData = { vapi_account_assigned: vapiAccountId || null };
    
    const { data: updatedBots, error: updateError } = await executeWithTimeout(
      supabase
        .from('genie_bots')
        .update(updateData)
        .eq('owner_user_id', ownerUserId)
        .select('id, name, vapi_account_assigned')
    );

    if (updateError) {
      console.error('❌ Error updating bots:', updateError);
      return handleApiError(updateError, res, 'Failed to update bots');
    }

    // Clear relevant caches
    await clearGenieCaches(ownerUserId, { clearAll: true });
    await cacheService.delByPattern('genie:vapi_accounts:*');

    const result = {
      success: true,
      message: `Successfully updated ${updatedBots?.length || 0} bot(s)`,
      data: {
        updatedCount: updatedBots?.length || 0,
        bots: sanitizeArray(updatedBots || [])
      }
    };

    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to update bots Vapi account');
  }
};

