import { supabaseAdmin } from '../../config/database.js';

/**
 * Offers Controller
 * Handles offer/commission promotion-related operations
 */

/**
 * Get all offers
 * @route   GET /api/offers
 * @access  Private (Admin)
 */
export const getAllOffers = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    
    // Build query
    let query = supabaseAdmin
      .from('offers')
      .select(`
        id,
        name,
        description,
        commission_percentage,
        start_date,
        end_date,
        is_active,
        created_by,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status === 'active') {
      const now = new Date().toISOString();
      query = query
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);
    } else if (status === 'upcoming') {
      const now = new Date().toISOString();
      query = query
        .eq('is_active', true)
        .gt('start_date', now);
    } else if (status === 'expired') {
      const now = new Date().toISOString();
      query = query.lt('end_date', now);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const { data: offers, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching offers:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch offers'
      });
    }

    // Get creator profiles separately
    const creatorIds = Array.from(new Set((offers || []).map(offer => offer.created_by).filter(Boolean)));
    const { data: creatorProfiles } = await supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email')
      .in('user_id', creatorIds.length ? creatorIds : ['00000000-0000-0000-0000-000000000000']);

    const creatorIdToProfile = new Map((creatorProfiles || []).map(p => [p.user_id, { full_name: p.full_name, email: p.email }]));

    // Format offers for frontend
    const formattedOffers = (offers || []).map(offer => {
      const creator = creatorIdToProfile.get(offer.created_by);
      return {
        id: offer.id,
        name: offer.name,
        description: offer.description,
        commissionPercentage: parseFloat(offer.commission_percentage),
        startDate: offer.start_date,
        endDate: offer.end_date,
        isActive: offer.is_active,
        createdBy: offer.created_by,
        createdAt: offer.created_at,
        updatedAt: offer.updated_at,
        creatorName: creator?.full_name || 'Unknown'
      };
    });

    res.json({
      success: true,
      data: formattedOffers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getAllOffers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get a single offer by ID
 * @route   GET /api/offers/:id
 * @access  Private (Admin)
 */
export const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: offer, error } = await supabaseAdmin
      .from('offers')
      .select(`
        id,
        name,
        description,
        commission_percentage,
        start_date,
        end_date,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Offer not found'
        });
      }
      console.error('Error fetching offer:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch offer'
      });
    }

    if (!offer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offer not found'
      });
    }

    // Get creator profile separately
    const { data: creatorProfile } = await supabaseAdmin
      .from('auth_role_with_profiles')
      .select('user_id, full_name, email')
      .eq('user_id', offer.created_by)
      .single();

    res.json({
      success: true,
      data: {
        id: offer.id,
        name: offer.name,
        description: offer.description,
        commissionPercentage: parseFloat(offer.commission_percentage),
        startDate: offer.start_date,
        endDate: offer.end_date,
        isActive: offer.is_active,
        createdBy: offer.created_by,
        createdAt: offer.created_at,
        updatedAt: offer.updated_at,
        creatorName: creatorProfile?.full_name || 'Unknown'
      }
    });
  } catch (error) {
    console.error('Error in getOfferById:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create a new offer
 * @route   POST /api/offers
 * @access  Private (Admin)
 */
export const createOffer = async (req, res) => {
  try {
    const { name, description, commissionPercentage, startDate, endDate, isActive } = req.body;
    const createdBy = req.user.id;

    // Validation
    if (!name || !commissionPercentage || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, commission percentage, start date, and end date are required'
      });
    }

    if (parseFloat(commissionPercentage) < 0 || parseFloat(commissionPercentage) > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Commission percentage must be between 0 and 100'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid date format'
      });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'End date must be after start date'
      });
    }

    // Insert offer
    const { data: offer, error } = await supabaseAdmin
      .from('offers')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        commission_percentage: parseFloat(commissionPercentage),
        start_date: startDate,
        end_date: endDate,
        is_active: isActive !== undefined ? isActive : true,
        created_by: createdBy
      })
      .select(`
        id,
        name,
        description,
        commission_percentage,
        start_date,
        end_date,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error creating offer:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create offer'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: {
        id: offer.id,
        name: offer.name,
        description: offer.description,
        commissionPercentage: parseFloat(offer.commission_percentage),
        startDate: offer.start_date,
        endDate: offer.end_date,
        isActive: offer.is_active,
        createdBy: offer.created_by,
        createdAt: offer.created_at,
        updatedAt: offer.updated_at
      }
    });
  } catch (error) {
    console.error('Error in createOffer:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update an offer
 * @route   PUT /api/offers/:id
 * @access  Private (Admin)
 */
export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, commissionPercentage, startDate, endDate, isActive } = req.body;

    // Check if offer exists
    const { data: existingOffer, error: fetchError } = await supabaseAdmin
      .from('offers')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingOffer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offer not found'
      });
    }

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (commissionPercentage !== undefined) {
      const commission = parseFloat(commissionPercentage);
      if (commission < 0 || commission > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Commission percentage must be between 0 and 100'
        });
      }
      updateData.commission_percentage = commission;
    }
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Validate dates if both are provided
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid date format'
        });
      }

      if (endDateObj <= startDateObj) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'End date must be after start date'
        });
      }
    }

    updateData.updated_at = new Date().toISOString();

    // Update offer
    const { data: offer, error } = await supabaseAdmin
      .from('offers')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        commission_percentage,
        start_date,
        end_date,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating offer:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update offer'
      });
    }

    res.json({
      success: true,
      message: 'Offer updated successfully',
      data: {
        id: offer.id,
        name: offer.name,
        description: offer.description,
        commissionPercentage: parseFloat(offer.commission_percentage),
        startDate: offer.start_date,
        endDate: offer.end_date,
        isActive: offer.is_active,
        createdBy: offer.created_by,
        createdAt: offer.created_at,
        updatedAt: offer.updated_at
      }
    });
  } catch (error) {
    console.error('Error in updateOffer:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete an offer
 * @route   DELETE /api/offers/:id
 * @access  Private (Admin)
 */
export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if offer exists
    const { data: existingOffer, error: fetchError } = await supabaseAdmin
      .from('offers')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingOffer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offer not found'
      });
    }

    // Delete offer
    const { error } = await supabaseAdmin
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting offer:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete offer'
      });
    }

    res.json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteOffer:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get active offer for a specific date
 * @route   GET /api/offers/active/:date
 * @access  Private (Admin or Reseller)
 */
export const getActiveOffer = async (req, res) => {
  try {
    const { date } = req.params;
    const checkDate = date || new Date().toISOString();

    const { data: offers, error } = await supabaseAdmin
      .from('offers')
      .select('id, name, commission_percentage, start_date, end_date')
      .eq('is_active', true)
      .lte('start_date', checkDate)
      .gte('end_date', checkDate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching active offer:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch active offer'
      });
    }

    if (!offers || offers.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active offer found for this date'
      });
    }

    const offer = offers[0];
    res.json({
      success: true,
      data: {
        id: offer.id,
        name: offer.name,
        commissionPercentage: parseFloat(offer.commission_percentage),
        startDate: offer.start_date,
        endDate: offer.end_date
      }
    });
  } catch (error) {
    console.error('Error in getActiveOffer:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

