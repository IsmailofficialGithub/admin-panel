import { supabaseAdmin } from '../../config/database.js';

/**
 * Activity Logs Controller
 * Handles activity log retrieval and filtering
 */

/**
 * Get all activity logs with filters (admin only)
 * @route   GET /api/activity-logs?action_type=create&actor_id=xxx&target_id=xxx&page=1&limit=50
 * @access  Private (Admin)
 */
export const getActivityLogs = async (req, res) => {
  try {
    const { 
      action_type, 
      actor_id, 
      target_id, 
      actor_role,
      table_name,
      page = 1, 
      limit = 50,
      start_date,
      end_date
    } = req.query;

    console.log('📋 Fetching activity logs with filters:', {
      action_type,
      actor_id,
      target_id,
      actor_role,
      table_name,
      page,
      limit
    });

    // Build query
    let query = supabaseAdmin
      .from('activity_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (actor_id) {
      query = query.eq('actor_id', actor_id);
    }

    if (target_id) {
      query = query.eq('target_id', target_id);
    }

    if (actor_role) {
      query = query.eq('actor_role', actor_role);
    }

    if (table_name) {
      query = query.eq('table_name', table_name);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching activity logs:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    // Get actor and target names for better display
    const logsWithNames = await Promise.all(
      (logs || []).map(async (log) => {
        let actorName = null;
        let targetName = null;

        // Get actor name
        if (log.actor_id) {
          try {
            const { data: actorProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('user_id', log.actor_id)
              .single();
            
            if (actorProfile) {
              actorName = actorProfile.full_name;
            }
          } catch (err) {
            console.error('Error fetching actor name:', err);
          }
        }

        // Get target name
        if (log.target_id) {
          try {
            const { data: targetProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('user_id', log.target_id)
              .single();
            
            if (targetProfile) {
              targetName = targetProfile.full_name;
            }
          } catch (err) {
            console.error('Error fetching target name:', err);
          }
        }

        return {
          ...log,
          actor_name: actorName,
          target_name: targetName
        };
      })
    );

    console.log(`✅ Found ${logsWithNames.length} activity logs (total: ${count})`);

    res.json({
      success: true,
      count: logsWithNames.length,
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
      data: logsWithNames
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get activity log by ID (admin only)
 * @route   GET /api/activity-logs/:id
 * @access  Private (Admin)
 */
export const getActivityLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: log, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Activity log not found'
      });
    }

    // Get actor and target names
    let actorName = null;
    let targetName = null;

    if (log.actor_id) {
      try {
        const { data: actorProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('user_id', log.actor_id)
          .single();
        
        if (actorProfile) {
          actorName = actorProfile.full_name;
        }
      } catch (err) {
        console.error('Error fetching actor name:', err);
      }
    }

    if (log.target_id) {
      try {
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('user_id', log.target_id)
          .single();
        
        if (targetProfile) {
          targetName = targetProfile.full_name;
        }
      } catch (err) {
        console.error('Error fetching target name:', err);
      }
    }

    res.json({
      success: true,
      data: {
        ...log,
        actor_name: actorName,
        target_name: targetName
      }
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

