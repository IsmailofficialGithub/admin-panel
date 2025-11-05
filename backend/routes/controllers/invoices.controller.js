import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendInvoiceCreatedEmail } from '../../services/emailService.js';

/**
 * Invoices Controller
 * Handles invoice-related operations
 */

/**
 * Get consumer's accessed products with prices for invoice creation
 * @route   GET /api/invoices/consumer/:consumerId/products
 * @access  Private (Admin or Reseller)
 */
export const getConsumerProductsForInvoice = async (req, res) => {
  try {
    const { consumerId } = req.params;
    console.log('🔍 getConsumerProductsForInvoice called with consumerId:', consumerId);
    console.log('🔍 Request user:', req.user?.id);
    console.log('🔍 Request params:', req.params);
    
    const senderId = req.user.id; // Admin or Reseller creating the invoice
    const senderRole = req.userProfile?.role;
    
    console.log('🔍 Sender ID:', senderId, 'Role:', senderRole);

    // Verify consumer exists and is a consumer
    const { data: consumer, error: consumerError } = await supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, referred_by')
      .eq('user_id', consumerId)
      .eq('role', 'consumer')
      .single();

    console.log('🔍 Consumer query result:', { consumer, error: consumerError });

    if (consumerError || !consumer) {
      console.error('❌ Consumer not found:', consumerError);
      console.error('❌ ConsumerId searched:', consumerId);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // If reseller, verify this consumer is referred by them
    if (senderRole === 'reseller') {
      if (!consumer.referred_by || consumer.referred_by !== senderId) {
        console.error('❌ Reseller permission denied:', {
          consumerReferredBy: consumer.referred_by,
          senderId: senderId
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only create invoices for your referred consumers'
        });
      }
    }

    // Get consumer's accessed products from user_product_access
    const { data: productAccess, error: accessError } = await supabaseAdmin
      .from('user_product_access')
      .select('product_id, granted_at')
      .eq('user_id', consumerId);
    
    console.log('🔍 Product access query result:', { productAccess, error: accessError });

    if (accessError) {
      console.error('Error fetching product access:', accessError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch product access'
      });
    }

    if (!productAccess || productAccess.length === 0) {
      return res.json({
        success: true,
        data: {
          consumer: {
            user_id: consumer.user_id,
            full_name: consumer.full_name,
            email: consumer.email
          },
          products: []
        }
      });
    }

    // Get product details with prices
    const productIds = productAccess.map(pa => pa.product_id);
    console.log('🔍 Fetching products for IDs:', productIds);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, description')
      .in('id', productIds);
    
    console.log('🔍 Products query result:', { products, error: productsError });

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch products'
      });
    }

    // Combine product access with product details
    const productsWithAccess = products.map(product => {
      const access = productAccess.find(pa => pa.product_id === product.id);
      return {
        product_id: product.id,
        product_name: product.name,
        price: parseFloat(product.price || 0),
        description: product.description,
        granted_at: access?.granted_at
      };
    });

    return res.json({
      success: true,
      data: {
        consumer: {
          user_id: consumer.user_id,
          full_name: consumer.full_name,
          email: consumer.email
        },
        products: productsWithAccess
      }
    });
  } catch (error) {
    console.error('Error in getConsumerProductsForInvoice:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get all invoices (admin only)
 * @route   GET /api/invoices
 * @access  Private (Admin)
 */
export const getAllInvoices = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const senderRole = req.userProfile?.role;

    // Only admin can see all invoices
    if (senderRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    // Build query for invoices
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        sender_id,
        receiver_id,
        issue_date,
        due_date,
        total_amount,
        tax_total,
        status,
        notes,
        created_at,
        updated_at,
        sender:profiles!invoices_sender_id_fkey(user_id, full_name, role),
        receiver:profiles!invoices_receiver_id_fkey(user_id, full_name, role, referred_by),
        invoice_items (
          id,
          product_id,
          quantity,
          unit_price,
          tax_rate,
          total_price,
          products (
            id,
            name,
            price
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply search filter (if needed, would need to search in related tables)
    // For now, we'll do search filtering in the application layer

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch invoices'
      });
    }

    // Enrich with email from auth_role_with_profiles view
    const receiverIds = Array.from(new Set((invoices || []).map(inv => inv.receiver?.user_id || inv.receiver_id).filter(Boolean)));
    const senderIds = Array.from(new Set((invoices || []).map(inv => inv.sender?.user_id || inv.sender_id).filter(Boolean)));

    const { data: receiverProfiles } = await supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, email, full_name, role, referred_by')
      .in('user_id', receiverIds.length ? receiverIds : ['00000000-0000-0000-0000-000000000000']);

    const { data: senderProfiles } = await supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, email, full_name, role')
      .in('user_id', senderIds.length ? senderIds : ['00000000-0000-0000-0000-000000000000']);

    const receiverIdToEmail = new Map((receiverProfiles || []).map(p => [p.user_id, p.email]));
    const senderIdToProfile = new Map((senderProfiles || []).map(p => [p.user_id, { email: p.email, full_name: p.full_name, role: p.role }]));

    // Format invoices for frontend
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      invoice_number: `INV-${invoice.created_at?.split('T')[0]?.replace(/-/g, '')}-${invoice.id.substring(0, 8).toUpperCase()}`,
      consumer_id: invoice.receiver?.user_id || invoice.receiver_id,
      consumer_name: invoice.receiver?.full_name || 'Unknown',
      consumer_email: receiverIdToEmail.get(invoice.receiver?.user_id || invoice.receiver_id) || '',
      referred_by: invoice.receiver?.referred_by || null,
      reseller_id: invoice.sender?.user_id || invoice.sender_id,
      reseller_name: (senderIdToProfile.get(invoice.sender?.user_id || invoice.sender_id)?.role === 'reseller')
        ? (senderIdToProfile.get(invoice.sender?.user_id || invoice.sender_id)?.full_name || 'Unknown Reseller')
        : null,
      invoice_date: invoice.issue_date,
      due_date: invoice.due_date,
      amount: parseFloat((invoice.total_amount || 0) - (invoice.tax_total || 0)).toFixed(2),
      tax: parseFloat(invoice.tax_total || 0).toFixed(2),
      total: parseFloat(invoice.total_amount || 0).toFixed(2),
      status: invoice.status || 'unpaid',
      payment_date: invoice.status === 'paid' ? invoice.updated_at : null,
      products: invoice.invoice_items?.map(item => ({
        name: item.products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: parseFloat(item.unit_price || 0).toFixed(2),
        total: parseFloat(item.total_price || 0).toFixed(2)
      })) || [],
      notes: invoice.notes,
      created_at: invoice.created_at
    }));

    // Apply search filter if provided
    let filteredInvoices = formattedInvoices;
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filteredInvoices = formattedInvoices.filter(inv => 
        inv.invoice_number?.toLowerCase().includes(searchLower) ||
        inv.consumer_name?.toLowerCase().includes(searchLower) ||
        inv.consumer_email?.toLowerCase().includes(searchLower) ||
        inv.reseller_name?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    return res.json({
      success: true,
      data: paginatedInvoices,
      pagination: {
        total: filteredInvoices.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredInvoices.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAllInvoices:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get invoices for reseller's referred consumers
 * @route   GET /api/invoices/my-invoices
 * @access  Private (Reseller)
 */
export const getMyInvoices = async (req, res) => {
  try {
    const senderId = req.user.id;
    const senderRole = req.userProfile?.role;
    const { search, status, page = 1, limit = 50 } = req.query;

    // Only resellers can access this endpoint
    if (senderRole !== 'reseller') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Reseller access required'
      });
    }

    // Get invoices where sender is this reseller
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        sender_id,
        receiver_id,
        issue_date,
        due_date,
        total_amount,
        tax_total,
        status,
        notes,
        created_at,
        updated_at,
        reseller_commission_percentage,
        applied_offer_id,
        commission_calculated_at,
        receiver:profiles!invoices_receiver_id_fkey(user_id, full_name, role, referred_by),
        invoice_items (
          id,
          product_id,
          quantity,
          unit_price,
          tax_rate,
          total_price,
          products (
            id,
            name,
            price
          )
        )
      `)
      .eq('sender_id', senderId)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching reseller invoices:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch invoices'
      });
    }

    // Enrich with email from auth_role_with_profiles view
    const receiverIds = Array.from(new Set((invoices || []).map(inv => inv.receiver?.user_id || inv.receiver_id).filter(Boolean)));
    const { data: receiverProfiles } = await supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, email, full_name, role, referred_by')
      .in('user_id', receiverIds.length ? receiverIds : ['00000000-0000-0000-0000-000000000000']);
    const receiverIdToEmail = new Map((receiverProfiles || []).map(p => [p.user_id, p.email]));

    // Fetch offer details for invoices that have applied_offer_id
    const offerIds = Array.from(new Set((invoices || []).map(inv => inv.applied_offer_id).filter(Boolean)));
    let offerMap = new Map();
    if (offerIds.length > 0) {
      const { data: offers, error: offersError } = await supabaseAdmin
        .from('offers')
        .select('id, name, commission_percentage')
        .in('id', offerIds);

      if (!offersError && offers) {
        offers.forEach(offer => {
          offerMap.set(offer.id, offer);
        });
      }
    }

    // Format invoices for frontend
    const formattedInvoices = invoices.map(invoice => {
      const offer = invoice.applied_offer_id ? offerMap.get(invoice.applied_offer_id) : null;
      
      return {
        id: invoice.id,
        invoice_number: `INV-${invoice.created_at?.split('T')[0]?.replace(/-/g, '')}-${invoice.id.substring(0, 8).toUpperCase()}`,
        consumer_id: invoice.receiver?.user_id || invoice.receiver_id,
        consumer_name: invoice.receiver?.full_name || 'Unknown',
        consumer_email: receiverIdToEmail.get(invoice.receiver?.user_id || invoice.receiver_id) || '',
        referred_by: invoice.receiver?.referred_by || null,
        reseller_id: senderId,
        reseller_name: null, // Not needed for reseller view
        invoice_date: invoice.issue_date,
        due_date: invoice.due_date,
        amount: parseFloat((invoice.total_amount || 0) - (invoice.tax_total || 0)).toFixed(2),
        tax: parseFloat(invoice.tax_total || 0).toFixed(2),
        total: parseFloat(invoice.total_amount || 0).toFixed(2),
        total_amount: parseFloat(invoice.total_amount || 0), // Keep as number for calculations
        status: invoice.status || 'unpaid',
        payment_date: invoice.status === 'paid' ? invoice.updated_at : null,
        reseller_commission_percentage: invoice.reseller_commission_percentage ? parseFloat(invoice.reseller_commission_percentage) : null,
        applied_offer_id: invoice.applied_offer_id || null,
        commission_calculated_at: invoice.commission_calculated_at || null,
        applied_offer: offer ? {
          id: offer.id,
          name: offer.name,
          commission_percentage: parseFloat(offer.commission_percentage)
        } : null,
        products: invoice.invoice_items?.map(item => ({
          name: item.products?.name || 'Unknown Product',
          quantity: item.quantity,
          price: parseFloat(item.unit_price || 0).toFixed(2),
          total: parseFloat(item.total_price || 0).toFixed(2)
        })) || [],
        notes: invoice.notes,
        created_at: invoice.created_at
      };
    });

    // Apply search filter if provided
    let filteredInvoices = formattedInvoices;
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filteredInvoices = formattedInvoices.filter(inv => 
        inv.invoice_number?.toLowerCase().includes(searchLower) ||
        inv.consumer_name?.toLowerCase().includes(searchLower) ||
        inv.consumer_email?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    return res.json({
      success: true,
      data: paginatedInvoices,
      pagination: {
        total: filteredInvoices.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredInvoices.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getMyInvoices:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get invoices for a specific consumer
 * @route   GET /api/invoices/consumer/:consumerId
 * @access  Private (Admin or Reseller)
 */
export const getConsumerInvoices = async (req, res) => {
  try {
    const { consumerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const senderId = req.user.id;
    const senderRole = req.userProfile?.role;

    // Verify consumer exists
    const { data: consumer, error: consumerError } = await supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, referred_by')
      .eq('user_id', consumerId)
      .eq('role', 'consumer')
      .single();

    if (consumerError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // If reseller, verify this consumer is referred by them
    if (senderRole === 'reseller') {
      if (!consumer.referred_by || consumer.referred_by !== senderId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only view invoices for your referred consumers'
        });
      }
    }

    // Build query for invoices count (for pagination)
    let countQuery = supabaseAdmin
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', consumerId);

    // For resellers, only show invoices they created
    if (senderRole === 'reseller') {
      countQuery = countQuery.eq('sender_id', senderId);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting consumer invoices:', countError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to count invoices'
      });
    }

    // Build query for invoices with pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        sender_id,
        receiver_id,
        issue_date,
        due_date,
        total_amount,
        tax_total,
        status,
        notes,
        created_at,
        updated_at,
        reseller_commission_percentage,
        applied_offer_id,
        commission_calculated_at,
        sender:profiles!invoices_sender_id_fkey(user_id, full_name, role),
        invoice_items (
          id,
          product_id,
          quantity,
          unit_price,
          tax_rate,
          total_price,
          products (
            id,
            name,
            price
          )
        )
      `)
      .eq('receiver_id', consumerId)
      .order('created_at', { ascending: false })
      .range(from, to);

    // For resellers, only show invoices they created
    if (senderRole === 'reseller') {
      query = query.eq('sender_id', senderId);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching consumer invoices:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch invoices'
      });
    }

    // Get sender profiles for admin view
    const senderIds = Array.from(new Set((invoices || []).map(inv => inv.sender_id).filter(Boolean)));
    const { data: senderProfiles } = await supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, email, full_name, role')
      .in('user_id', senderIds.length ? senderIds : ['00000000-0000-0000-0000-000000000000']);

    const senderIdToProfile = new Map((senderProfiles || []).map(p => [p.user_id, { email: p.email, full_name: p.full_name, role: p.role }]));

    // Fetch offer details for invoices that have applied_offer_id
    const offerIds = Array.from(new Set((invoices || []).map(inv => inv.applied_offer_id).filter(Boolean)));
    let offerMap = new Map();
    if (offerIds.length > 0) {
      const { data: offers, error: offersError } = await supabaseAdmin
        .from('offers')
        .select('id, name, commission_percentage')
        .in('id', offerIds);

      if (!offersError && offers) {
        offers.forEach(offer => {
          offerMap.set(offer.id, offer);
        });
      }
    }

    // Format invoices for frontend
    const formattedInvoices = invoices.map(invoice => {
      const offer = invoice.applied_offer_id ? offerMap.get(invoice.applied_offer_id) : null;
      
      return {
        id: invoice.id,
        invoice_number: `INV-${invoice.created_at?.split('T')[0]?.replace(/-/g, '')}-${invoice.id.substring(0, 8).toUpperCase()}`,
        consumer_id: consumerId,
        consumer_name: consumer.full_name || 'Unknown',
        consumer_email: consumer.email || '',
        reseller_id: invoice.sender_id,
        reseller_name: senderIdToProfile.get(invoice.sender_id)?.full_name || 'Unknown',
        invoice_date: invoice.issue_date,
        due_date: invoice.due_date,
        amount: parseFloat((invoice.total_amount || 0) - (invoice.tax_total || 0)).toFixed(2),
        tax: parseFloat(invoice.tax_total || 0).toFixed(2),
        total: parseFloat(invoice.total_amount || 0).toFixed(2),
        total_amount: parseFloat(invoice.total_amount || 0), // Keep as number for calculations
        status: invoice.status || 'unpaid',
        payment_date: invoice.status === 'paid' ? invoice.updated_at : null,
        reseller_commission_percentage: invoice.reseller_commission_percentage ? parseFloat(invoice.reseller_commission_percentage) : null,
        applied_offer_id: invoice.applied_offer_id || null,
        commission_calculated_at: invoice.commission_calculated_at || null,
        applied_offer: offer ? {
          id: offer.id,
          name: offer.name,
          commission_percentage: parseFloat(offer.commission_percentage)
        } : null,
        products: invoice.invoice_items?.map(item => ({
          name: item.products?.name || 'Unknown Product',
          quantity: item.quantity,
          price: parseFloat(item.unit_price || 0).toFixed(2),
          total: parseFloat(item.total_price || 0).toFixed(2)
        })) || [],
        notes: invoice.notes,
        created_at: invoice.created_at
      };
    });

    res.json({
      success: true,
      count: formattedInvoices.length,
      total: totalCount || 0,
      data: formattedInvoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getConsumerInvoices:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create invoice with invoice items
 * @route   POST /api/invoices
 * @access  Private (Admin or Reseller)
 */
export const createInvoice = async (req, res) => {
  try {
    const senderId = req.user.id; // Admin or Reseller creating the invoice
    const senderRole = req.userProfile?.role;
    const {
      receiver_id,
      issue_date,
      due_date,
      tax_rate,
      notes,
      items // Array of { product_id, quantity, unit_price, tax_rate }
    } = req.body;

    // Validate required fields
    if (!receiver_id || !issue_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: receiver_id, issue_date, due_date, and items are required'
      });
    }

    // Verify consumer exists and get their info
    const { data: consumer, error: consumerError } = await supabase
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email, role, referred_by')
      .eq('user_id', receiver_id)
      .single();

    if (consumerError || !consumer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Consumer not found'
      });
    }

    // Verify consumer role
    if (consumer.role !== 'consumer') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Receiver must be a consumer'
      });
    }

    // If reseller, verify this consumer is referred by them
    if (senderRole === 'reseller') {
      if (!consumer.referred_by || consumer.referred_by !== senderId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only create invoices for your referred consumers'
        });
      }
    }

    // Validate items first
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Each item must have product_id, quantity > 0, and unit_price >= 0'
        });
      }
    }

    // Batch verify all products at once
    const productIds = items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', productIds);

    if (productsError || !products || products.length !== productIds.length) {
      const foundIds = products?.map(p => p.id) || [];
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        error: 'Not Found',
        message: `Products not found: ${missingIds.join(', ')}`
      });
    }

    // Create products map for quick lookup
    const productsMap = new Map(products.map(p => [p.id, p]));

    // Check if resellers can override product prices (only for resellers)
    const { getResellerSettings } = await import('../../utils/resellerSettings.js');
    const resellerSettings = await getResellerSettings();
    const allowPriceOverride = resellerSettings.allowResellerPriceOverride !== false; // Default to true

    // Validate and calculate totals
    let totalAmount = 0;
    let taxTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!productsMap.has(item.product_id)) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Product with id ${item.product_id} not found`
        });
      }

      const product = productsMap.get(item.product_id);
      const originalPrice = parseFloat(product.price || 0);
      const requestedPrice = parseFloat(item.unit_price || 0);

      // If reseller is creating invoice and price override is not allowed, use original price
      if (senderRole === 'reseller' && !allowPriceOverride) {
        // Use original product price if override is not allowed
        item.unit_price = originalPrice;
      } else if (senderRole === 'reseller' && allowPriceOverride) {
        // If override is allowed, ensure price is >= original price
        if (requestedPrice < originalPrice) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Price override not allowed. Product "${product.name}" has a minimum price of $${originalPrice.toFixed(2)}. You cannot set a price lower than the original.`
          });
        }
      }

      const itemTaxRate = item.tax_rate || tax_rate || 0;
      const finalUnitPrice = parseFloat(item.unit_price);
      const itemTotal = finalUnitPrice * item.quantity;
      const itemTax = itemTotal * (itemTaxRate / 100);
      const itemTotalWithTax = itemTotal + itemTax;

      validatedItems.push({
        product_id: item.product_id,
        quantity: parseInt(item.quantity),
        unit_price: finalUnitPrice,
        tax_rate: parseFloat(itemTaxRate),
        total_price: parseFloat(itemTotalWithTax)
      });

      totalAmount += itemTotal;
      taxTotal += itemTax;
    }

    const finalTotalAmount = totalAmount + taxTotal;

    // Check minimum invoice amount setting
    if (resellerSettings.minInvoiceAmount !== null && resellerSettings.minInvoiceAmount > 0) {
      if (finalTotalAmount < resellerSettings.minInvoiceAmount) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invoice amount ($${finalTotalAmount.toFixed(2)}) is below the minimum allowed amount of $${resellerSettings.minInvoiceAmount.toFixed(2)}`
        });
      }
    }

    // Check for active offer at the invoice creation date/time
    let activeOffer = null;
    let resellerCommissionPercentage = null;
    const invoiceDate = issue_date || new Date().toISOString();
    
    try {
      const { data: offers, error: offerError } = await supabaseAdmin
        .from('offers')
        .select('id, commission_percentage')
        .eq('is_active', true)
        .lte('start_date', invoiceDate)
        .gte('end_date', invoiceDate)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!offerError && offers && offers.length > 0) {
        activeOffer = offers[0];
        resellerCommissionPercentage = parseFloat(activeOffer.commission_percentage);
        console.log(`✅ Active offer found for invoice: ${activeOffer.id} with ${resellerCommissionPercentage}% commission`);
      } else {
        // No active offer found - use reseller's default commission
        // If reseller is creating invoice, use their commission
        if (senderRole === 'reseller') {
          // Get reseller's effective commission (custom or default) from profiles table
          const { data: resellerProfile } = await supabaseAdmin
            .from('profiles')
            .select('commission_rate')
            .eq('user_id', senderId)
            .eq('role', 'reseller')
            .single();

          if (resellerProfile?.commission_rate !== null && resellerProfile?.commission_rate !== undefined) {
            resellerCommissionPercentage = parseFloat(resellerProfile.commission_rate);
            console.log(`✅ Using reseller's custom commission: ${resellerCommissionPercentage}%`);
          } else {
            // Get default commission from app_settings
            const { data: defaultSetting } = await supabaseAdmin
              .from('app_settings')
              .select('setting_value')
              .eq('setting_key', 'default_reseller_commission')
              .single();

            if (defaultSetting?.setting_value) {
              resellerCommissionPercentage = parseFloat(defaultSetting.setting_value);
              console.log(`✅ Using default reseller commission: ${resellerCommissionPercentage}%`);
            } else {
              // Fallback to 10.00 if no default is set
              resellerCommissionPercentage = 10.00;
              console.log(`⚠️ No default commission found, using fallback: ${resellerCommissionPercentage}%`);
            }
          }
        } else if (senderRole === 'admin') {
          // For admin-created invoices, get the reseller's commission (consumer's reseller)
          if (consumer.referred_by) {
            const { data: resellerProfile } = await supabaseAdmin
              .from('profiles')
              .select('commission_rate')
              .eq('user_id', consumer.referred_by)
              .eq('role', 'reseller')
              .single();

            if (resellerProfile?.commission_rate !== null && resellerProfile?.commission_rate !== undefined) {
              resellerCommissionPercentage = parseFloat(resellerProfile.commission_rate);
              console.log(`✅ Using consumer's reseller custom commission: ${resellerCommissionPercentage}%`);
            } else {
              const { data: defaultSetting } = await supabaseAdmin
                .from('app_settings')
                .select('setting_value')
                .eq('setting_key', 'default_reseller_commission')
                .single();

              if (defaultSetting?.setting_value) {
                resellerCommissionPercentage = parseFloat(defaultSetting.setting_value);
                console.log(`✅ Using default reseller commission: ${resellerCommissionPercentage}%`);
              } else {
                // Fallback to 10.00 if no default is set
                resellerCommissionPercentage = 10.00;
                console.log(`⚠️ No default commission found, using fallback: ${resellerCommissionPercentage}%`);
              }
            }
          }
        }
      }
    } catch (offerCheckError) {
      console.error('Error checking for active offer:', offerCheckError);
      // If offer check fails, still try to get reseller's default commission
      if (senderRole === 'reseller' && resellerCommissionPercentage === null) {
        try {
          const { data: resellerProfile } = await supabaseAdmin
            .from('profiles')
            .select('commission_rate')
            .eq('user_id', senderId)
            .eq('role', 'reseller')
            .single();

          if (resellerProfile?.commission_rate !== null && resellerProfile?.commission_rate !== undefined) {
            resellerCommissionPercentage = parseFloat(resellerProfile.commission_rate);
            console.log(`✅ Fallback: Using reseller's custom commission: ${resellerCommissionPercentage}%`);
          } else {
            const { data: defaultSetting } = await supabaseAdmin
              .from('app_settings')
              .select('setting_value')
              .eq('setting_key', 'default_reseller_commission')
              .single();

            if (defaultSetting?.setting_value) {
              resellerCommissionPercentage = parseFloat(defaultSetting.setting_value);
              console.log(`✅ Fallback: Using default reseller commission: ${resellerCommissionPercentage}%`);
            } else {
              resellerCommissionPercentage = 10.00;
              console.log(`⚠️ Fallback: No default commission found, using fallback: ${resellerCommissionPercentage}%`);
            }
          }
        } catch (fallbackError) {
          console.error('Error getting fallback commission:', fallbackError);
        }
      }
    }

    // Create invoice using transaction (Supabase doesn't support transactions directly, so we'll use a workaround)
    // First, insert the invoice
    const invoiceData = {
      sender_id: senderId,
      receiver_id: receiver_id,
      issue_date: issue_date,
      due_date: due_date,
      total_amount: finalTotalAmount,
      tax_total: taxTotal,
      status: 'unpaid',
      notes: notes || null
    };

    // Always store commission percentage and offer info if available
    // This ensures we track the commission rate used at invoice creation time
    if (resellerCommissionPercentage !== null) {
      invoiceData.reseller_commission_percentage = resellerCommissionPercentage;
      invoiceData.commission_calculated_at = new Date().toISOString();
      
      if (activeOffer) {
        invoiceData.applied_offer_id = activeOffer.id;
        console.log(`✅ Invoice will use offer commission: ${resellerCommissionPercentage}% from offer ${activeOffer.id}`);
      } else {
        console.log(`✅ Invoice will use default reseller commission: ${resellerCommissionPercentage}%`);
      }
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create invoice: ' + (invoiceError?.message || 'Unknown error')
      });
    }

    // Insert invoice items
    const invoiceItems = validatedItems.map(item => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate
      // total_price is auto-calculated by the database
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .insert(invoiceItems)
      .select();

    if (itemsError || !insertedItems) {
      console.error('Error creating invoice items:', itemsError);
      // Try to delete the invoice if items insertion failed
      await supabaseAdmin.from('invoices').delete().eq('id', invoice.id);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create invoice items: ' + (itemsError?.message || 'Unknown error')
      });
    }

    // Build response with invoice data (we already have consumer data)
    const invoiceNumber = `INV-${(invoice.created_at || new Date().toISOString()).split('T')[0].replace(/-/g, '')}-${String(invoice.id).substring(0,8).toUpperCase()}`;
    
    // Build items for response using products map
    const invoiceItemsWithProducts = insertedItems.map(item => {
      const product = productsMap.get(item.product_id);
      return {
        ...item,
        products: product ? { id: product.id, name: product.name, price: product.price } : null
      };
    });

    const completeInvoice = {
      ...invoice,
      invoice_items: invoiceItemsWithProducts
    };

    // Send invoice created email in background (non-blocking)
    // Use consumer data we already have instead of fetching again
    const emailItems = validatedItems.map((item, idx) => {
      const product = productsMap.get(item.product_id);
      return {
        name: product?.name || 'Product',
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total_price
      };
    });

    // Send email asynchronously in background (don't wait for it)
    if (consumer.email) {
      const senderProfile = req.userProfile || { full_name: 'Admin', role: senderRole || 'admin' };
      // Don't await - let it run in background
      sendInvoiceCreatedEmail({
        email: consumer.email,
        full_name: consumer.full_name || 'Customer',
        invoice_number: invoiceNumber,
        invoice_id: invoice.id,
        user_id: receiver_id,
        issue_date: issue_date || invoice.issue_date,
        due_date: due_date || invoice.due_date || '',
        subtotal: totalAmount,
        tax_total: taxTotal,
        total: finalTotalAmount,
        items: emailItems,
        created_by_name: senderProfile.full_name || 'Admin',
        created_by_role: senderProfile.role || 'admin'
      }).catch(e => {
        console.warn('⚠️ Failed to send invoice created email:', e?.message);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: completeInvoice
    });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Resend invoice email
 * @route   POST /api/invoices/:id/resend
 * @access  Private (Admin)
 */
export const resendInvoice = async (req, res) => {
  try {
    const senderId = req.user.id;
    const senderRole = req.userProfile?.role;
    const { id } = req.params;
    
    console.log('Resend invoice request - ID:', id, 'Type:', typeof id);

    // Only admin can resend invoices
    if (senderRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    // Fetch invoice with receiver and items in one query
    // Ensure id is a string for comparison
    const invoiceId = String(id).trim();
    console.log('Looking for invoice with ID (string):', invoiceId);
    
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        sender_id,
        receiver_id,
        issue_date,
        due_date,
        total_amount,
        tax_total,
        status,
        notes,
        created_at,
        receiver:auth_role_with_profiles!invoices_receiver_id_fkey(user_id, full_name, email, role),
        invoice_items (
          id,
          product_id,
          quantity,
          unit_price,
          tax_rate,
          total_price,
          products (
            id,
            name,
            price
          )
        )
      `)
      .eq('id', invoiceId)
      .single();
      console.log('Invoice query result:', invoice);

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      console.error('Invoice ID searched:', id);
      return res.status(404).json({
        error: 'Not Found',
        message: `Invoice not found: ${invoiceError.message || 'Database error'}`
      });
    }

    if (!invoice) {
      console.error('Invoice not found for ID:', id);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found'
      });
    }
    
    console.log('Invoice found:', invoice.id);

    // Use receiver data from the invoice query
    const receiver = invoice.receiver;
    if (!receiver || !receiver.email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Receiver email not found'
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${(invoice.created_at || new Date().toISOString()).split('T')[0].replace(/-/g, '')}-${String(invoice.id).substring(0,8).toUpperCase()}`;

    // Build items for email
    const emailItems = (invoice.invoice_items || []).map((it) => ({
      name: it.products?.name || 'Product',
      quantity: it.quantity,
      price: it.unit_price,
      total: it.total_price || (Number(it.unit_price) * Number(it.quantity))
    }));

    // Use sender profile from req.userProfile (already available from middleware)
    const senderProfile = req.userProfile || { full_name: 'Admin', role: 'admin' };

    // Send invoice email in background (non-blocking)
    sendInvoiceCreatedEmail({
      email: receiver.email,
      full_name: receiver.full_name || 'Customer',
      invoice_number: invoiceNumber,
      invoice_id: invoice.id,
      user_id: invoice.receiver_id,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || '',
      subtotal: invoice.total_amount - (invoice.tax_total || 0),
      tax_total: invoice.tax_total || 0,
      total: invoice.total_amount,
      items: emailItems,
      created_by_name: senderProfile.full_name || 'Admin',
      created_by_role: senderProfile.role || 'admin'
    }).catch(emailError => {
      console.error('Error sending invoice email:', emailError);
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice email resent successfully'
    });
  } catch (error) {
    console.error('Error in resendInvoice:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

