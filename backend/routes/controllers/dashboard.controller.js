import { supabaseAdmin } from '../../config/database.js';

/**
 * Dashboard Controller
 * Handles dashboard statistics and analytics
 */

/**
 * Get dashboard statistics (admin only)
 * @route   GET /api/dashboard/stats
 * @access  Private (Admin)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userRole = req.userProfile?.role;

    // Only admin can access dashboard stats
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Execute all queries in parallel for better performance
    const [
      totalUsersResult,
      totalConsumersResult,
      activeConsumersResult,
      expiredConsumersResult,
      totalResellersResult,
      newUsersThisMonthResult,
      activeSubscriptionsResult,
      invoiceStatsResult,
      totalProductsResult
    ] = await Promise.all([
      // Total users (admin, user, viewer)
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'user', 'viewer']),
      
      // Total consumers
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'consumer'),
      
      // Active consumers
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'consumer')
        .eq('account_status', 'active'),
      
      // Expired consumers
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'consumer')
        .eq('account_status', 'expired_subscription'),
      
      // Total resellers
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'reseller'),
      
      // New users this month
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonthISO),
      
      // Active subscriptions - try RPC first, fallback to fetch
      (async () => {
        try {
          const rpcResult = await supabaseAdmin.rpc('count_unique_subscriptions');
          if (rpcResult.data !== null && rpcResult.data !== undefined && !rpcResult.error) {
            return { data: rpcResult.data, error: null };
          }
        } catch (e) {
          // RPC function doesn't exist, fallback to regular query
        }
        // Fallback: fetch and deduplicate
        return supabaseAdmin
          .from('user_product_access')
          .select('user_id', { count: 'exact', head: false })
          .limit(50000);
      })(),
      
      // Invoice stats - fetch in parallel for better performance
      Promise.all([
        // Total invoices count
        supabaseAdmin
          .from('invoices')
          .select('*', { count: 'exact', head: true }),
        // Paid invoices count
        supabaseAdmin
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'paid'),
        // Unpaid invoices count
        supabaseAdmin
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unpaid'),
        // Total revenue from paid invoices - try RPC first
        (async () => {
          try {
            const rpcResult = await supabaseAdmin.rpc('sum_paid_invoices_total');
            if (rpcResult.data !== null && rpcResult.data !== undefined && !rpcResult.error) {
              return { data: rpcResult.data, error: null };
            }
          } catch (e) {
            // RPC function doesn't exist, fallback to regular query
          }
          // Fallback: fetch and calculate
          return supabaseAdmin
            .from('invoices')
            .select('total_amount')
            .eq('status', 'paid');
        })(),
        // Revenue this month - try RPC first
        (async () => {
          try {
            const rpcResult = await supabaseAdmin.rpc('sum_paid_invoices_this_month', { start_date: startOfMonthISO });
            if (rpcResult.data !== null && rpcResult.data !== undefined && !rpcResult.error) {
              return { data: rpcResult.data, error: null };
            }
          } catch (e) {
            // RPC function doesn't exist, fallback to regular query
          }
          // Fallback: fetch and calculate
          return supabaseAdmin
            .from('invoices')
            .select('total_amount')
            .eq('status', 'paid')
            .gte('created_at', startOfMonthISO);
        })()
      ]),
      
      // Total products
      supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
    ]);

    // Extract counts from profile queries
    const totalUsers = totalUsersResult.count || 0;
    const totalConsumers = totalConsumersResult.count || 0;
    const activeConsumers = activeConsumersResult.count || 0;
    const expiredConsumers = expiredConsumersResult.count || 0;
    const totalResellers = totalResellersResult.count || 0;
    const newUsersThisMonth = newUsersThisMonthResult.count || 0;
    const totalProducts = totalProductsResult.count || 0;

    // Calculate unique subscriptions
    let uniqueSubscriptions = 0;
    if (activeSubscriptionsResult.data !== null && activeSubscriptionsResult.data !== undefined && !activeSubscriptionsResult.error) {
      // If RPC returned a number directly
      if (typeof activeSubscriptionsResult.data === 'number') {
        uniqueSubscriptions = activeSubscriptionsResult.data;
      } else if (Array.isArray(activeSubscriptionsResult.data)) {
        // Fallback: deduplicate array
        uniqueSubscriptions = new Set(activeSubscriptionsResult.data.map(s => s.user_id)).size;
      }
    }

    // Extract invoice stats
    let totalInvoices = 0;
    let paidInvoicesCount = 0;
    let unpaidInvoicesCount = 0;
    let totalRevenue = 0;
    let revenueThisMonth = 0;

    if (invoiceStatsResult && Array.isArray(invoiceStatsResult)) {
      const [totalInvoicesRes, paidInvoicesRes, unpaidInvoicesRes, totalRevenueRes, revenueThisMonthRes] = invoiceStatsResult;
      
      totalInvoices = totalInvoicesRes?.count || 0;
      paidInvoicesCount = paidInvoicesRes?.count || 0;
      unpaidInvoicesCount = unpaidInvoicesRes?.count || 0;
      
      // Calculate total revenue from paid invoices
      if (totalRevenueRes?.data !== null && totalRevenueRes?.data !== undefined && !totalRevenueRes.error) {
        // If RPC returned a number directly
        if (typeof totalRevenueRes.data === 'number' || typeof totalRevenueRes.data === 'string') {
          totalRevenue = parseFloat(totalRevenueRes.data) || 0;
        } else if (Array.isArray(totalRevenueRes.data)) {
          // Fallback: calculate from array
          totalRevenue = totalRevenueRes.data.reduce((sum, inv) => {
            return sum + (parseFloat(inv.total_amount) || 0);
          }, 0);
        }
      }
      
      // Calculate revenue this month
      if (revenueThisMonthRes?.data !== null && revenueThisMonthRes?.data !== undefined && !revenueThisMonthRes.error) {
        // If RPC returned a number directly
        if (typeof revenueThisMonthRes.data === 'number' || typeof revenueThisMonthRes.data === 'string') {
          revenueThisMonth = parseFloat(revenueThisMonthRes.data) || 0;
        } else if (Array.isArray(revenueThisMonthRes.data)) {
          // Fallback: calculate from array
          revenueThisMonth = revenueThisMonthRes.data.reduce((sum, inv) => {
            return sum + (parseFloat(inv.total_amount) || 0);
          }, 0);
        }
      }
    }

    // Prepare response
    const stats = {
      totalUsers,
      totalConsumers,
      activeConsumers,
      expiredConsumers,
      totalResellers,
      newUsersThisMonth,
      activeSubscriptions: uniqueSubscriptions,
      totalRevenue,
      revenueThisMonth,
      totalInvoices,
      paidInvoices: paidInvoicesCount,
      unpaidInvoices: unpaidInvoicesCount,
      totalProducts,
      serverStatus: 'online'
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get reseller business statistics
 * @route   GET /api/dashboard/reseller-stats
 * @access  Private (Admin)
 */
export const getResellerStats = async (req, res) => {
  try {
    const userRole = req.userProfile?.role;

    // Only admin can access reseller stats
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const { month, year, status, limit = 10 } = req.query;
    
    // Default to current month if not specified
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth(); // month is 0-indexed
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    // First, get all reseller IDs
    const { data: resellers, error: resellerError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('role', 'reseller');

    if (resellerError) {
      console.error('Error fetching resellers:', resellerError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch reseller data'
      });
    }

    const resellerIds = (resellers || []).map(r => r.user_id);
    
    if (resellerIds.length === 0) {
      return res.json({
        success: true,
        data: {
          stats: [],
          summary: {
            total_resellers: 0,
            total_revenue: 0,
            total_invoices: 0,
            month: targetMonth + 1,
            year: targetYear,
            status: status || 'paid'
          }
        }
      });
    }

    // Build query for invoices (simplified - fetch sender profiles separately)
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        sender_id,
        receiver_id,
        total_amount,
        status,
        created_at
      `)
      .in('sender_id', resellerIds)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    // Filter by status (default to 'paid' if not specified)
    const invoiceStatus = status || 'paid';
    if (invoiceStatus !== 'all') {
      query = query.eq('status', invoiceStatus);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching reseller stats:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch reseller statistics',
        details: error.message
      });
    }

    // Fetch sender profiles separately
    const senderIdsFromInvoices = Array.from(new Set((invoices || []).map(inv => inv.sender_id).filter(Boolean)));
    
    let senderProfiles = {};
    if (senderIdsFromInvoices.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('auth_role_with_profiles')
        .select('user_id, full_name, email, role')
        .in('user_id', senderIdsFromInvoices);
      
      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          senderProfiles[profile.user_id] = {
            full_name: profile.full_name || 'Unknown',
            email: profile.email || '',
            role: profile.role
          };
        });
      }
    }

    // Group invoices by reseller (sender_id)
    const resellerStats = {};
    
    (invoices || []).forEach(invoice => {
      const senderId = invoice.sender_id;
      if (!senderId) return;

      const profile = senderProfiles[senderId];
      if (!profile) return; // Skip if profile not found

      if (!resellerStats[senderId]) {
        resellerStats[senderId] = {
          reseller_id: senderId,
          reseller_name: profile.full_name || 'Unknown',
          reseller_email: profile.email || '',
          total_revenue: 0,
          invoice_count: 0,
          invoices: []
        };
      }

      const amount = parseFloat(invoice.total_amount || 0);
      resellerStats[senderId].total_revenue += amount;
      resellerStats[senderId].invoice_count += 1;
      resellerStats[senderId].invoices.push({
        id: invoice.id,
        amount: amount,
        status: invoice.status,
        created_at: invoice.created_at
      });
    });

    // Convert to array and sort by total_revenue (descending)
    let statsArray = Object.values(resellerStats)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, parseInt(limit));

    // Calculate totals
    const totalRevenue = statsArray.reduce((sum, stat) => sum + stat.total_revenue, 0);
    const totalInvoices = statsArray.reduce((sum, stat) => sum + stat.invoice_count, 0);

    res.json({
      success: true,
      data: {
        stats: statsArray,
        summary: {
          total_resellers: statsArray.length,
          total_revenue: totalRevenue,
          total_invoices: totalInvoices,
          month: targetMonth + 1,
          year: targetYear,
          status: invoiceStatus
        }
      }
    });
  } catch (error) {
    console.error('Error in getResellerStats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

