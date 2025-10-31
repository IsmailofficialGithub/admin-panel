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

