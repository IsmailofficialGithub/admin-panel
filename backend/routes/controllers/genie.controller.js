import { supabase } from '../../config/database.js';
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
    const isSystemAdmin = req.profile?.is_systemadmin === true;

    // Validate botId if provided
    if (botId && !isValidUUID(botId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid bot ID format'
      });
    }

    console.log('📞 Fetching calls with filters:', { page: pageNum, limit: limitNum, botId, status, isLead, isSystemAdmin });

    // Build query - TEMPORARILY NO FILTERING to debug
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

    // DEBUG: Log what we got from database
    console.log('📞 DEBUG - Calls query result:', {
      dataCount: calls?.length || 0,
      totalCount: count,
      hasError: !!error,
      error: error,
      firstCall: calls?.[0] ? { id: calls[0].id, name: calls[0].name, call_status: calls[0].call_status } : null
    });

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
    const isSystemAdmin = req.profile?.is_systemadmin === true;
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
    const { page, limit, status } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;
    const userId = req.user.id;
    const isSystemAdmin = req.profile?.is_systemadmin === true;

    console.log('📅 Fetching campaigns:', { page: pageNum, limit: limitNum, status, isSystemAdmin });

    // TEMPORARILY NO FILTERING to debug
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
    const { page, limit, botId, startDate, endDate, search } = req.query;
    const { pageNum, limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;
    const userId = req.user.id;
    const isSystemAdmin = req.profile?.is_systemadmin === true;

    console.log('🎯 Fetching leads:', { page: pageNum, limit: limitNum, isSystemAdmin });

    // TEMPORARILY NO FILTERING to debug
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
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

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
    const { startDate, endDate, botId } = req.query;

    console.log('📤 Exporting leads with filters:', { startDate, endDate, botId });

    // TEMPORARILY NO FILTERING to match getAllLeads behavior
    let query = supabase
      .from('genie_leads')
      .select(`
        name,
        phone,
        email,
        summary,
        created_at,
        genie_bots (name)
      `)
      .order('created_at', { ascending: false });

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
    const isSystemAdmin = req.profile?.is_systemadmin === true;

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
    const isSystemAdmin = req.profile?.is_systemadmin === true;

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
    const isSystemAdmin = req.profile?.is_systemadmin === true;

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
    const isSystemAdmin = req.profile?.is_systemadmin === true;

    // Check cache
    const cacheKey = CACHE_KEYS.BOTS_LIST(isSystemAdmin ? 'admin' : userId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // TEMPORARILY NO FILTERING to debug
    const { data: bots, error } = await executeWithTimeout(
      supabase
        .from('genie_bots')
        .select('id, name, company_name, goal, voice, language, created_at')
        .order('name', { ascending: true })
    );

    // DEBUG: Log what we got from database
    console.log('🤖 DEBUG - Bots query result:', {
      dataCount: bots?.length || 0,
      hasError: !!error,
      error: error,
      firstBot: bots?.[0] ? { id: bots[0].id, name: bots[0].name } : null
    });

    if (error) {
      console.error('❌ Error fetching bots:', error);
      return handleApiError(error, res, 'Failed to fetch bots');
    }

    const result = {
      success: true,
      data: sanitizeArray(bots || [])
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);
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
    const isSystemAdmin = req.profile?.is_systemadmin === true;

    // Check cache
    const cacheKey = CACHE_KEYS.CONTACT_LISTS(isSystemAdmin ? 'admin' : userId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // TEMPORARILY NO FILTERING to debug
    const { data: lists, error } = await executeWithTimeout(
      supabase
        .from('genie_contact_lists')
        .select('id, name, description, created_at')
        .order('name', { ascending: true })
    );

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

    await cacheService.set(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    return handleApiError(err, res, 'Failed to fetch contact lists');
  }
};

