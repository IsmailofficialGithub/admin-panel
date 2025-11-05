import { supabaseAdmin } from '../../config/database.js';
import { getActorInfo, logActivity, getClientIp, getUserAgent } from '../../services/activityLogger.js';

/**
 * Settings Controller
 * Handles application settings including default commission
 */

/**
 * Get default reseller commission
 * @route   GET /api/settings/default-commission
 * @access  Private (Admin)
 */
export const getDefaultCommission = async (req, res) => {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('app_settings')
      .select('setting_key, setting_value, description, updated_at')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    if (error) {
      console.error('Error fetching default commission:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch default commission'
      });
    }

    if (!setting) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Default commission setting not found'
      });
    }

    res.json({
      success: true,
      data: {
        commissionRate: parseFloat(setting.setting_value) || 0,
        description: setting.description,
        updatedAt: setting.updated_at
      }
    });
  } catch (error) {
    console.error('Error in getDefaultCommission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update default reseller commission
 * @route   PUT /api/settings/default-commission
 * @access  Private (Admin)
 */
export const updateDefaultCommission = async (req, res) => {
  try {
    const { commissionRate } = req.body;
    const adminId = req.user?.id;

    // Validate commission rate
    if (commissionRate === undefined || commissionRate === null) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Commission rate is required'
      });
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Commission rate must be a number between 0 and 100'
      });
    }

    // Update or insert default commission setting
    const { data: setting, error: upsertError } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        setting_key: 'default_reseller_commission',
        setting_value: rate.toFixed(2),
        description: 'Default commission rate for resellers (percentage)',
        updated_at: new Date().toISOString(),
        updated_by: adminId
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error updating default commission:', upsertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update default commission'
      });
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: null,
      actionType: 'update',
      tableName: 'app_settings',
      changedFields: {
        setting_key: 'default_reseller_commission',
        old_value: setting?.setting_value || null,
        new_value: rate.toFixed(2)
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: 'Default commission updated successfully',
      data: {
        commissionRate: rate,
        updatedAt: setting.updated_at
      }
    });
  } catch (error) {
    console.error('Error in updateDefaultCommission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get reseller's own commission (effective commission - custom or default)
 * @route   GET /api/resellers/my-commission
 * @access  Private (Reseller)
 */
export const getMyCommission = async (req, res) => {
  try {
    const resellerId = req.user.id;
    
    // Fetch user profile to check role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, account_status')
      .eq('user_id', resellerId)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found'
      });
    }

    // Only resellers can access this endpoint
    if (userProfile.role !== 'reseller') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Reseller access required'
      });
    }

    // Check if account is deactivated
    if (userProfile.account_status === 'deactive') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    // Get reseller profile
    const { data: reseller, error: resellerError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, commission_rate, commission_updated_at')
      .eq('user_id', resellerId)
      .eq('role', 'reseller')
      .single();

    if (resellerError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller profile not found'
      });
    }

    // Get default commission
    const { data: defaultSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    const defaultCommission = defaultSetting ? parseFloat(defaultSetting.setting_value) : 10.00;
    const effectiveCommission = reseller.commission_rate !== null 
      ? parseFloat(reseller.commission_rate) 
      : defaultCommission;

    res.json({
      success: true,
      data: {
        resellerId: resellerId,
        commissionRate: effectiveCommission,
        commissionType: reseller.commission_rate !== null ? 'custom' : 'default',
        customCommission: reseller.commission_rate ? parseFloat(reseller.commission_rate) : null,
        defaultCommission: defaultCommission,
        updatedAt: reseller.commission_updated_at
      }
    });
  } catch (error) {
    console.error('Error in getMyCommission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get reseller commission (effective commission - custom or default)
 * @route   GET /api/resellers/:id/commission
 * @access  Private (Admin)
 */
export const getResellerCommission = async (req, res) => {
  try {
    const { id } = req.params;

    // Get reseller profile
    const { data: reseller, error: resellerError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, commission_rate, commission_updated_at')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (resellerError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    // Get default commission
    const { data: defaultSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    const defaultCommission = defaultSetting ? parseFloat(defaultSetting.setting_value) : 10.00;
    const effectiveCommission = reseller.commission_rate !== null 
      ? parseFloat(reseller.commission_rate) 
      : defaultCommission;

    res.json({
      success: true,
      data: {
        resellerId: id,
        commissionRate: effectiveCommission,
        commissionType: reseller.commission_rate !== null ? 'custom' : 'default',
        customCommission: reseller.commission_rate ? parseFloat(reseller.commission_rate) : null,
        defaultCommission: defaultCommission,
        updatedAt: reseller.commission_updated_at
      }
    });
  } catch (error) {
    console.error('Error in getResellerCommission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Set custom commission for a reseller
 * @route   PUT /api/resellers/:id/commission
 * @access  Private (Admin)
 */
export const setResellerCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    // Validate commission rate
    if (commissionRate === undefined || commissionRate === null) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Commission rate is required'
      });
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Commission rate must be a number between 0 and 100'
      });
    }

    // Check if reseller exists
    const { data: reseller, error: resellerError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, commission_rate')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (resellerError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    // Update commission
    const { data: updatedReseller, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        commission_rate: rate.toFixed(2),
        commission_updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .select('user_id, commission_rate, commission_updated_at')
      .single();

    if (updateError) {
      console.error('Error updating reseller commission:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update reseller commission'
      });
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'update',
      tableName: 'profiles',
      changedFields: {
        commission_rate: {
          old: reseller.commission_rate,
          new: rate.toFixed(2)
        }
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: 'Reseller commission updated successfully',
      data: {
        resellerId: id,
        commissionRate: rate,
        commissionType: 'custom',
        updatedAt: updatedReseller.commission_updated_at
      }
    });
  } catch (error) {
    console.error('Error in setResellerCommission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get all reseller settings
 * @route   GET /api/settings/reseller
 * @access  Private (Admin)
 */
export const getResellerSettings = async (req, res) => {
  try {
    // Get all reseller-related settings
    const settingKeys = [
      'max_consumers_per_reseller',
      'default_reseller_commission',
      'min_invoice_amount',
      'require_reseller_approval',
      'allow_reseller_price_override'
    ];

    const { data: settings, error } = await supabaseAdmin
      .from('app_settings')
      .select('setting_key, setting_value, description, updated_at')
      .in('setting_key', settingKeys);

    if (error) {
      console.error('Error fetching reseller settings:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch reseller settings'
      });
    }

    // Convert array to object with default values
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    res.json({
      success: true,
      data: {
        maxConsumersPerReseller: settingsMap['max_consumers_per_reseller'] || null,
        defaultCommissionRate: settingsMap['default_reseller_commission'] ? parseFloat(settingsMap['default_reseller_commission']) : null,
        minInvoiceAmount: settingsMap['min_invoice_amount'] ? parseFloat(settingsMap['min_invoice_amount']) : null,
        requireResellerApproval: settingsMap['require_reseller_approval'] === 'true',
        allowResellerPriceOverride: settingsMap['allow_reseller_price_override'] === 'true'
      }
    });
  } catch (error) {
    console.error('Error in getResellerSettings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update all reseller settings
 * @route   PUT /api/settings/reseller
 * @access  Private (Admin)
 */
export const updateResellerSettings = async (req, res) => {
  try {
    const {
      maxConsumersPerReseller,
      defaultCommissionRate,
      minInvoiceAmount,
      requireResellerApproval,
      allowResellerPriceOverride
    } = req.body;

    const adminId = req.user?.id;
    const settingsToUpdate = [];

    // Validate and prepare settings for update
    if (maxConsumersPerReseller !== undefined) {
      const maxConsumers = maxConsumersPerReseller === '' || maxConsumersPerReseller === null 
        ? null 
        : parseInt(maxConsumersPerReseller);
      if (maxConsumers !== null && (isNaN(maxConsumers) || maxConsumers < 0)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Maximum consumers per reseller must be a positive number or empty'
        });
      }
      settingsToUpdate.push({
        setting_key: 'max_consumers_per_reseller',
        setting_value: maxConsumers === null ? '' : maxConsumers.toString(),
        description: 'Maximum number of consumers allowed per reseller (empty = unlimited)',
        updated_at: new Date().toISOString(),
        updated_by: adminId
      });
    }

    if (defaultCommissionRate !== undefined && defaultCommissionRate !== null && defaultCommissionRate !== '') {
      const rate = parseFloat(defaultCommissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Default commission rate must be a number between 0 and 100'
        });
      }
      settingsToUpdate.push({
        setting_key: 'default_reseller_commission',
        setting_value: rate.toFixed(2),
        description: 'Default commission rate for resellers (percentage)',
        updated_at: new Date().toISOString(),
        updated_by: adminId
      });
    }

    if (minInvoiceAmount !== undefined && minInvoiceAmount !== null && minInvoiceAmount !== '') {
      const amount = parseFloat(minInvoiceAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Minimum invoice amount must be a positive number'
        });
      }
      settingsToUpdate.push({
        setting_key: 'min_invoice_amount',
        setting_value: amount.toFixed(2),
        description: 'Minimum invoice amount allowed',
        updated_at: new Date().toISOString(),
        updated_by: adminId
      });
    }

    if (requireResellerApproval !== undefined) {
      settingsToUpdate.push({
        setting_key: 'require_reseller_approval',
        setting_value: requireResellerApproval ? 'true' : 'false',
        description: 'Require admin approval for new resellers',
        updated_at: new Date().toISOString(),
        updated_by: adminId
      });
    }

    if (allowResellerPriceOverride !== undefined) {
      settingsToUpdate.push({
        setting_key: 'allow_reseller_price_override',
        setting_value: allowResellerPriceOverride ? 'true' : 'false',
        description: 'Allow resellers to override product prices (must be equal or greater than original)',
        updated_at: new Date().toISOString(),
        updated_by: adminId
      });
    }

    // Upsert all settings
    const { data: updatedSettings, error: upsertError } = await supabaseAdmin
      .from('app_settings')
      .upsert(settingsToUpdate, {
        onConflict: 'setting_key'
      })
      .select();

    if (upsertError) {
      console.error('Error updating reseller settings:', upsertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update reseller settings'
      });
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: null,
      actionType: 'update',
      tableName: 'app_settings',
      changedFields: {
        settings: settingsToUpdate.map(s => ({
          key: s.setting_key,
          value: s.setting_value
        }))
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: 'Reseller settings updated successfully',
      data: {
        maxConsumersPerReseller: maxConsumersPerReseller === '' || maxConsumersPerReseller === null ? null : parseInt(maxConsumersPerReseller),
        defaultCommissionRate: defaultCommissionRate !== undefined && defaultCommissionRate !== null && defaultCommissionRate !== '' ? parseFloat(defaultCommissionRate) : null,
        minInvoiceAmount: minInvoiceAmount !== undefined && minInvoiceAmount !== null && minInvoiceAmount !== '' ? parseFloat(minInvoiceAmount) : null,
        requireResellerApproval: requireResellerApproval || false,
        allowResellerPriceOverride: allowResellerPriceOverride || false
      }
    });
  } catch (error) {
    console.error('Error in updateResellerSettings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Reset reseller commission to default
 * @route   DELETE /api/resellers/:id/commission
 * @access  Private (Admin)
 */
export const resetResellerCommission = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reseller exists
    const { data: reseller, error: resellerError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, commission_rate')
      .eq('user_id', id)
      .eq('role', 'reseller')
      .single();

    if (resellerError || !reseller) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Reseller not found'
      });
    }

    // Reset to default (set to NULL)
    const { data: updatedReseller, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        commission_rate: null,
        commission_updated_at: null
      })
      .eq('user_id', id)
      .select('user_id, commission_rate, commission_updated_at')
      .single();

    if (updateError) {
      console.error('Error resetting reseller commission:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to reset reseller commission'
      });
    }

    // Get default commission for response
    const { data: defaultSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'default_reseller_commission')
      .single();

    const defaultCommission = defaultSetting ? parseFloat(defaultSetting.setting_value) : 10.00;

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: id,
      actionType: 'update',
      tableName: 'profiles',
      changedFields: {
        commission_rate: {
          old: reseller.commission_rate,
          new: null
        }
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      message: 'Reseller commission reset to default',
      data: {
        resellerId: id,
        commissionRate: defaultCommission,
        commissionType: 'default'
      }
    });
  } catch (error) {
    console.error('Error in resetResellerCommission:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

