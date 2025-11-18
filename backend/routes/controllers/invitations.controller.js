import { supabase, supabaseAdmin } from '../../config/database.js';
import { sendInviteEmail } from '../../services/emailService.js';
import { logActivity, getActorInfo, getClientIp, getUserAgent } from '../../services/activityLogger.js';
import crypto from 'crypto';

/**
 * Invitations Controller
 * Handles invitation-related operations for users, resellers, and consumers
 */

/**
 * Generate a secure invitation token
 * @returns {string} Secure token
 */
const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Invite user/reseller/consumer (admin only)
 * @route   POST /api/invitations/invite
 * @access  Private (Admin)
 */
export const inviteUser = async (req, res) => {
  try {
    const { email, role, trial_expiry_date, subscribed_products } = req.body;
    const inviterId = req.user.id;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and role are required'
      });
    }

    if (!['user', 'reseller', 'consumer'].includes(role)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Role must be user, reseller, or consumer'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email === email);

    if (userExists) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User with this email already exists'
      });
    }

    // Check if invitation already exists and is not used
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'An active invitation already exists for this email'
      });
    }

    // Get inviter info
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', inviterId)
      .single();

    const inviterName = inviterProfile?.full_name || 'Admin';

    // Generate token and set expiry (7 days)
    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const invitationData = {
      email,
      token,
      role,
      invited_by: inviterId,
      referred_by: role === 'reseller' ? inviterId : null,
      expires_at: expiresAt.toISOString(),
      trial_expiry_date: trial_expiry_date ? new Date(trial_expiry_date).toISOString() : null,
      subscribed_products: subscribed_products && Array.isArray(subscribed_products) ? subscribed_products : []
    };

    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert([invitationData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create invitation'
      });
    }

    // Generate invite URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const inviteUrl = `${clientUrl}/signup?token=${token}`;

    // Send invitation email
    try {
      await sendInviteEmail({
        email,
        role,
        invite_url: inviteUrl,
        inviter_name: inviterName
      });
      console.log('✅ Invitation email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
      // Don't fail the request if email fails
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: invitation.id,
      actionType: 'create',
      tableName: 'invitations',
      changedFields: invitationData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Invite reseller (reseller can invite other resellers)
 * @route   POST /api/invitations/invite-reseller
 * @access  Private (Reseller)
 */
export const inviteReseller = async (req, res) => {
  try {
    const { email } = req.body;
    const inviterId = req.user.id;

    // Validate input
    if (!email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required'
      });
    }

    // Verify inviter is a reseller
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('user_id', inviterId)
      .single();

    if (!inviterProfile || inviterProfile.role !== 'reseller') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only resellers can invite other resellers'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email === email);

    if (userExists) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User with this email already exists'
      });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'An active invitation already exists for this email'
      });
    }

    const inviterName = inviterProfile.full_name || 'Reseller';

    // Generate token and set expiry (7 days)
    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const invitationData = {
      email,
      token,
      role: 'reseller',
      invited_by: inviterId,
      referred_by: inviterId, // Reseller invites reseller, so referred_by is the inviter
      expires_at: expiresAt.toISOString()
    };

    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert([invitationData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create invitation'
      });
    }

    // Generate invite URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const inviteUrl = `${clientUrl}/signup?token=${token}`;

    // Send invitation email
    try {
      await sendInviteEmail({
        email,
        role: 'reseller',
        invite_url: inviteUrl,
        inviter_name: inviterName
      });
      console.log('✅ Invitation email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email send error:', emailError);
    }

    // Log activity
    const { actorId, actorRole } = await getActorInfo(req);
    await logActivity({
      actorId,
      actorRole,
      targetId: invitation.id,
      actionType: 'create',
      tableName: 'invitations',
      changedFields: invitationData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at
      }
    });
  } catch (error) {
    console.error('Invite reseller error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Validate invitation token
 * @route   GET /api/invitations/validate/:token
 * @access  Public
 */
export const validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token is required'
      });
    }

    // Find invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid or expired invitation token'
      });
    }

    // Check if already used
    if (invitation.used_at) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has already been used'
      });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has expired'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email === invitation.email);

    if (userExists) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User with this email already exists'
      });
    }

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at
      }
    });
  } catch (error) {
    console.error('Validate invite token error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Sign up using invitation token
 * @route   POST /api/invitations/signup
 * @access  Public
 */
export const signupWithInvite = async (req, res) => {
  try {
    const { token, password, full_name, phone, country, city } = req.body;

    // Validate input
    if (!token || !password || !full_name || !country || !city) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Token, password, full_name, country, and city are required'
      });
    }

    // Find and validate invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid invitation token'
      });
    }

    // Check if already used
    if (invitation.used_at) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has already been used'
      });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has expired'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email === invitation.email);

    if (userExists) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User with this email already exists'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Admin client not configured'
      });
    }

    // Create user with Supabase Admin
    const createUserPayload = {
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        role: invitation.role,
        country: country || '',
        city: city || '',
      }
    };

    if (phone) {
      createUserPayload.phone = phone;
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: createError.message
      });
    }

    // Get reseller settings for account status
    const { getResellerSettings } = await import('../../utils/resellerSettings.js');
    const resellerSettings = await getResellerSettings();
    const accountStatus = invitation.role === 'reseller' && resellerSettings.requireResellerApproval 
      ? 'pending' 
      : 'active';

    // Create profile
    const profileData = {
      user_id: newUser.user.id,
      full_name,
      role: invitation.role,
      phone: phone || null,
      country: country || null,
      city: city || null,
      referred_by: invitation.referred_by || null,
      account_status: accountStatus
    };

    // Add trial expiry for consumer if provided
    if (invitation.role === 'consumer' && invitation.trial_expiry_date) {
      profileData.trial_expiry = new Date(invitation.trial_expiry_date);
    } else if (invitation.role === 'consumer') {
      // Default 3-day trial for consumers
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 3);
      profileData.trial_expiry = trialExpiry;
    }

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .upsert([profileData]);

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'User created but profile insert failed'
      });
    }

    // Store product access for consumers
    if (invitation.role === 'consumer' && invitation.subscribed_products && invitation.subscribed_products.length > 0) {
      try {
        const productAccessRecords = invitation.subscribed_products.map(productId => ({
          user_id: newUser.user.id,
          product_id: productId
        }));

        const { error: productAccessError } = await supabaseAdmin
          .from('user_product_access')
          .insert(productAccessRecords);

        if (productAccessError) {
          console.error('Error inserting product access:', productAccessError);
        }
      } catch (productAccessErr) {
        console.error('Error storing product access:', productAccessErr);
      }
    }

    // Mark invitation as used
    await supabase
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // Log activity
    await logActivity({
      actorId: newUser.user.id,
      actorRole: invitation.role,
      targetId: newUser.user.id,
      actionType: 'create',
      tableName: 'profiles',
      changedFields: profileData,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: invitation.role
      }
    });
  } catch (error) {
    console.error('Signup with invite error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};







