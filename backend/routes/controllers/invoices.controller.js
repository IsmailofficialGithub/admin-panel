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

    // Format invoices for frontend
    const formattedInvoices = invoices.map(invoice => ({
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
      .order('created_at', { ascending: false });

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

    // Format invoices for frontend
    const formattedInvoices = invoices.map(invoice => ({
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

    res.json({
      success: true,
      count: formattedInvoices.length,
      data: formattedInvoices
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

    // Validate and calculate totals
    let totalAmount = 0;
    let taxTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Each item must have product_id, quantity > 0, and unit_price >= 0'
        });
      }

      // Verify product exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', item.product_id)
        .single();

      if (productError || !product) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Product with id ${item.product_id} not found`
        });
      }

      const itemTaxRate = item.tax_rate || tax_rate || 0;
      const itemTotal = item.unit_price * item.quantity;
      const itemTax = itemTotal * (itemTaxRate / 100);
      const itemTotalWithTax = itemTotal + itemTax;

      validatedItems.push({
        product_id: item.product_id,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        tax_rate: parseFloat(itemTaxRate),
        total_price: parseFloat(itemTotalWithTax)
      });

      totalAmount += itemTotal;
      taxTotal += itemTax;
    }

    const finalTotalAmount = totalAmount + taxTotal;

    // Create invoice using transaction (Supabase doesn't support transactions directly, so we'll use a workaround)
    // First, insert the invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        sender_id: senderId,
        receiver_id: receiver_id,
        issue_date: issue_date,
        due_date: due_date,
        total_amount: finalTotalAmount,
        tax_total: taxTotal,
        status: 'unpaid',
        notes: notes || null
      })
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

    // Fetch the complete invoice with items
    const { data: completeInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
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
      .eq('id', invoice.id)
      .single();

    if (fetchError || !completeInvoice) {
      console.error('Error fetching complete invoice:', fetchError);
    }

    // Send invoice created email (best-effort)
    try {
      // Fetch receiver email/name from auth_role_with_profiles
      const { data: rcvr } = await supabaseAdmin
        .from('auth_role_with_profiles')
        .select('user_id, full_name, email')
        .eq('user_id', receiver_id)
        .single();
      const invoiceNumber = `INV-${(invoice.created_at || new Date().toISOString()).split('T')[0].replace(/-/g, '')}-${String(invoice.id).substring(0,8).toUpperCase()}`;
      // Build items for email
      const emailItems = (completeInvoice?.invoice_items || insertedItems || []).map((it) => ({
        name: it.products?.name || 'Product',
        quantity: it.quantity,
        price: it.unit_price,
        total: it.total_price || (Number(it.unit_price) * Number(it.quantity))
      }));
      // Determine creator info
      const { data: senderProfile } = await supabaseAdmin
        .from('auth_role_with_profiles')
        .select('user_id, full_name, role')
        .eq('user_id', senderId)
        .single();
      if (rcvr?.email) {
        await sendInvoiceCreatedEmail({
          email: rcvr.email,
          full_name: rcvr.full_name || 'Customer',
          invoice_number: invoiceNumber,
          invoice_id: invoice.id,
          user_id: receiver_id,
          issue_date: issue_date || invoice.issue_date,
          due_date: due_date || invoice.due_date || '',
          subtotal: totalAmount,
          tax_total: taxTotal,
          total: finalTotalAmount,
          items: emailItems,
          created_by_name: senderProfile?.full_name || 'Admin',
          created_by_role: senderProfile?.role || 'admin'
        });
      }
    } catch (e) {
      console.warn('⚠️ Failed to send invoice created email:', e?.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: completeInvoice || invoice
    });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

