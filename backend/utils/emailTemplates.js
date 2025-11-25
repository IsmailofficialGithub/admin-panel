/**
 * Email Templates for User Management
 * All templates use the unified styling from text.html
 */

/**
 * Base Email Template - Unified styling for all emails
 * Outlook-compatible version using table-based layouts
 * @param {Object} params
 * @param {string} params.title - Email title/header text
 * @param {string} params.subtitle - Subtitle/date text (optional)
 * @param {string} params.content - Main HTML content
 * @param {string} params.buttonText - CTA button text (optional)
 * @param {string} params.buttonUrl - CTA button URL (optional)
 * @param {string} params.footerText - Footer text (optional)
 * @returns {string} HTML email template
 */
const BaseEmailTemplate = ({
  title = 'Email',
  subtitle = '',
  content = '',
  buttonText = '',
  buttonUrl = '',
  footerText = ''
} = {}) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${title} - DuhaNashrahAi</title>
    <!--[if mso]>
    <style type="text/css">
      body, table, td {font-family: Verdana, Geneva, sans-serif !important;}
    </style>
    <![endif]-->
    <style type="text/css">
      /* Use Verdana for general text - Outlook compatible */
      body, td, th, p, span, div, h1, h2, h3, h4, h5, h6, strong, em {
        font-family: Verdana, Geneva, sans-serif;
      }
      /* Use monospace for numbers - fallback for Outlook */
      .mono-num {
        font-family: 'Courier New', Courier, monospace;
        letter-spacing: 0.03em;
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; width: 100%; background-color: #f7f7f9; font-family: Verdana, Geneva, sans-serif;">
    <!--[if mso]>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
    <![endif]-->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #f7f7f9;">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <!--[if mso]>
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0">
          <![endif]-->
          <!--[if !mso]><!-->
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff;">
          <!--<![endif]-->
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding: 32px 0 16px 0; background-color: #ffffff;">
                <img src="https://duhanashrah.ai/wp-content/uploads/2025/10/Asset-3@2x.png" alt="DuhaNashrahAi" width="600" style="display: block; height: auto; max-height: 101px;" />
              </td>
            </tr>

            <!-- Title Header -->
            <tr>
              <td style="padding: 24px 40px 16px 40px; background-color: #8a3b9a; color: #ffffff;">
                <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #ffffff; font-family: Verdana, Geneva, sans-serif;">${title}</h1>
                ${subtitle ? `<p style="margin: 0; font-size: 15px; color: #ffffff; font-family: Verdana, Geneva, sans-serif;">${subtitle}</p>` : ''}
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 32px 40px; color: #232347; font-size: 16px; line-height: 1.5; font-family: Verdana, Geneva, sans-serif;">
                ${content}
                
                ${buttonText && buttonUrl ? `
                <!-- CTA Button -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 16px 0;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="background-color: #8a3b9a; padding: 14px 38px;">
                            <a href="${buttonUrl}" target="_blank" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 18px; font-family: Verdana, Geneva, sans-serif; display: block;">
                              ${buttonText}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                ` : ''}

                ${footerText ? `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 16px 0 0 0;">
                  <tr>
                    <td align="center" style="font-size: 14px; color: #66698c; font-family: Verdana, Geneva, sans-serif;">
                      ${footerText}
                    </td>
                  </tr>
                </table>
                ` : ''}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 28px 40px 24px 40px; background-color: #fafbfc;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-top: 1px solid #e6e6ec; padding: 0 0 16px 0;"></td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 8px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td style="padding: 0 6px;">
                            <a href="https://www.facebook.com/duhanashraai" style="text-decoration: none;">
                              <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-circle-dark-gray/facebook@2x.png" width="24" height="24" alt="Facebook" style="display: block;" />
                            </a>
                          </td>
                          <td style="padding: 0 6px;">
                            <a href="https://www.youtube.com/@DuhaNashrahAi" style="text-decoration: none;">
                              <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-circle-dark-gray/twitter@2x.png" width="24" height="24" alt="YouTube" style="display: block;" />
                            </a>
                          </td>
                          <td style="padding: 0 6px;">
                            <a href="https://www.instagram.com/duhanashrahai/" style="text-decoration: none;">
                              <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-circle-dark-gray/instagram@2x.png" width="24" height="24" alt="Instagram" style="display: block;" />
                            </a>
                          </td>
                          <td style="padding: 0 6px;">
                            <a href="https://www.tiktok.com/@duhanashrahai" style="text-decoration: none;">
                              <img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-circle-dark-gray/linkedin@2x.png" width="24" height="24" alt="TikTok" style="display: block;" />
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size: 15px; color: #8889a8; padding-top: 8px; font-family: Verdana, Geneva, sans-serif;">
                      Questions? Contact us at info@duhanashrah.ai
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size: 13px; color: #a5a6be; padding-top: 4px; font-family: Verdana, Geneva, sans-serif;">
                      © 2025 DuhaNashrahAi. All Rights Reserved
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
          <!--[if mso]>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
    <!--[if mso]>
        </td>
      </tr>
    </table>
    <![endif]-->
  </body>
</html>`;
};

/**
 * Welcome Email Template - User Created
 * @param {Object} params
 * @param {string} params.full_name - User's full name
 * @param {string} params.email - User's email
 * @param {string} params.password - Temporary password
 * @param {string} params.role - User role (user, reseller, consumer, admin)
 * @param {string} params.website_url - Website URL
 */
export const AdminEmailTemplateUserCreated = ({
  full_name = "John Doe",
  email = "johndoe@example.com",
  password = "Demo@123456",
  role = "user",
  website_url = process.env.CLIENT_URL || "#",
} = {}) => {
  // Role-based welcome messages
  const roleMessages = {
    consumer: {
      title: 'Welcome Consumer!',
      subtitle: 'Your Account has been created',
      greeting: `Hello <strong style="color: #8a3b9a;">${full_name}</strong>,`,
      message: `Welcome to DuhaNashrahAi! We're thrilled to have you as a consumer. Your account has been successfully created and you can start exploring our services right away.`,
      buttonText: 'Login Now'
    },
    reseller: {
      title: 'Welcome Reseller!',
      subtitle: 'Your reseller account is ready',
      greeting: `Hello <strong style="color: #8a3b9a;">${full_name}</strong>,`,
      message: `Welcome to DuhaNashrahAi! We're excited to have you join our reseller network. Your account has been successfully created and you can start managing your business right away.`,
      buttonText: 'Go to Dashboard'
    },
    admin: {
      title: 'Welcome Administrator!',
      subtitle: 'Your admin account is ready',
      greeting: `Hello <strong style="color: #8a3b9a;">${full_name}</strong>,`,
      message: `Welcome to DuhaNashrahAi! Your administrator account has been successfully created. You now have full access to manage the platform.`,
      buttonText: 'Access Admin Panel'
    },
    user: {
      title: 'Welcome Aboard!',
      subtitle: 'Your account is ready',
      greeting: `Hello <strong style="color: #8a3b9a;">${full_name}</strong>,`,
      message: `Thank you for joining us! We're excited to have you as part of our community. Your account has been successfully created.`,
      buttonText: 'Get Started'
    }
  };

  const roleInfo = roleMessages[role] || roleMessages.user;

  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding: 0 0 12px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
          ${roleInfo.greeting}
        </td>
      </tr>
      <tr>
        <td style="padding: 0 0 20px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
          ${roleInfo.message}
        </td>
      </tr>
    </table>

    <!-- Account Details - Outlook compatible -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9f9fb; border-left: 4px solid #8a3b9a;">
      <tr>
        <td style="padding: 20px; color: #232347; font-size: 15px; line-height: 1.6; font-family: Verdana, Geneva, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                Your Account Details
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Name:</strong> ${full_name}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Email:</strong> ${email}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Password:</strong> <span class="mono-num" style="background-color: #ffffff; padding: 4px 8px; font-weight: bold; color: #8a3b9a; font-family: 'Courier New', Courier, monospace;">${password}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0 0; font-size: 13px; color: #66698c; font-family: Verdana, Geneva, sans-serif;">
                For security, please change your password after logging in.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailTemplate({
    title: roleInfo.title,
    subtitle: roleInfo.subtitle,
    content,
    buttonText: roleInfo.buttonText,
    buttonUrl: website_url,
    footerText: 'If you didn\'t create this account, you can safely ignore this email.'
  });
};

/**
 * Password Reset Email Template
 */
export const PasswordResetTemplate = ({
  full_name = "User",
  new_password = "NewPassword123!",
  website_url = process.env.CLIENT_URL || "#",
} = {}) => {
  const content = `
    <p style="margin: 0 0 12px 0; color: #232347;">
      Hello <strong style="color: #8a3b9a;">${full_name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #232347;">
      Your password has been successfully reset. Below is your new login password:
    </p>

    <!-- Password Info - Outlook compatible -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9f9fb; border-left: 4px solid #8a3b9a;">
      <tr>
        <td style="padding: 20px; color: #232347; font-size: 15px; line-height: 1.6; font-family: Verdana, Geneva, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                Your New Password
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Name:</strong> ${full_name}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>New Password:</strong> <span class="mono-num" style="background-color: #ffffff; padding: 4px 8px; font-weight: bold; color: #8a3b9a; font-family: 'Courier New', Courier, monospace;">${new_password}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0 0; font-size: 13px; color: #66698c; font-family: Verdana, Geneva, sans-serif;">
                For security, please change your password after logging in.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailTemplate({
    title: 'Password Reset',
    subtitle: 'Your password has been updated',
    content
  });
};

/**
 * Trial Period Change Email Template
 */
export const TrialPeriodChangeTemplate = ({
  full_name = "User",
  old_trial_date = "2025-01-01",
  new_trial_date = "2025-01-08",
  website_url = process.env.CLIENT_URL || "#",
} = {}) => {
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const content = `
    <p style="margin: 0 0 12px 0; color: #232347;">
      Hello <strong style="color: #8a3b9a;">${full_name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #232347;">
      Your trial period has been successfully updated! Here are the details:
    </p>

    <!-- Trial Details - Outlook compatible -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9f9fb; border-left: 4px solid #8a3b9a;">
      <tr>
        <td style="padding: 20px; color: #232347; font-size: 15px; line-height: 1.6; font-family: Verdana, Geneva, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                Trial Period Details
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Previous Expiry:</strong> ${formatDate(old_trial_date)}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>New Expiry:</strong> <span style="color: #8a3b9a; font-weight: bold;">${formatDate(new_trial_date)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0 0; font-size: 13px; color: #66698c; font-family: Verdana, Geneva, sans-serif;">
                Your trial has been extended. Enjoy all features until the new date!
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailTemplate({
    title: 'Trial Period Updated',
    subtitle: 'Your trial has been extended',
    content,
    buttonText: 'Go to Dashboard',
    buttonUrl: `${website_url}/consumer/dashboard`
  });
};

/**
 * Trial Extension Email Template
 */
export const TrialExtensionTemplate = ({
  full_name = "User",
  new_trial_date = "2025-01-08",
  extension_days = 3,
  website_url = "#",
} = {}) => {
  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const content = `
    <p style="margin: 0 0 12px 0; color: #232347;">
      Hello <strong style="color: #8a3b9a;">${full_name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #232347;">
      Great news — your trial has been extended! We've added <strong>${extension_days} extra days</strong> to your trial period.
    </p>

    <!-- Extension Details - Outlook compatible -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9f9fb; border-left: 4px solid #8a3b9a;">
      <tr>
        <td style="padding: 20px; color: #232347; font-size: 15px; line-height: 1.6; font-family: Verdana, Geneva, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                Your Updated Trial Details
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>New Trial End Date:</strong> <span style="color: #8a3b9a; font-weight: bold;">${formatDate(new_trial_date)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Extended By:</strong> <span class="mono-num" style="color: #8a3b9a; font-weight: bold; font-family: 'Courier New', Courier, monospace;">${extension_days} days</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0 0; font-size: 13px; color: #66698c; font-family: Verdana, Geneva, sans-serif;">
                If you did not request this extension, please contact support immediately.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailTemplate({
    title: 'Trial Extended 🎉',
    subtitle: 'Enjoy your extended trial',
    content,
    buttonText: 'Go to Dashboard',
    buttonUrl: `${website_url}/consumer/dashboard`
  });
};

/**
 * Invitation Email Template
 */
export const InviteEmailTemplate = ({
  full_name = "User",
  email = "user@example.com",
  role = "user",
  invite_url = "#",
  inviter_name = "Admin",
} = {}) => {
  const roleLabels = {
    user: "User",
    reseller: "Reseller",
    consumer: "Consumer"
  };

  const content = `
    <p style="margin: 0 0 12px 0; color: #232347;">
      Hello,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #232347;">
      <strong style="color: #8a3b9a;">${inviter_name}</strong> has invited you to join as a <strong>${roleLabels[role] || role}</strong>. Complete your registration to get started!
    </p>

    <!-- Invitation Details - Outlook compatible -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9f9fb; border-left: 4px solid #8a3b9a;">
      <tr>
        <td style="padding: 20px; color: #232347; font-size: 15px; line-height: 1.6; font-family: Verdana, Geneva, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                Invitation Details
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Email:</strong> ${email}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Role:</strong> <span style="color: #8a3b9a; font-weight: bold;">${roleLabels[role] || role}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0 0; font-size: 13px; color: #66698c; font-family: Verdana, Geneva, sans-serif;">
                This invitation link expires in 7 days. Please complete your registration soon!
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailTemplate({
    title: 'You\'re Invited!',
    subtitle: 'Join us today',
    content,
    buttonText: 'Accept Invitation',
    buttonUrl: invite_url
  });
};

/**
 * Invoice Created Email Template
 */
export const InvoiceCreatedTemplate = ({
  full_name = 'Customer',
  invoice_number = 'INV-0001',
  issue_date = '20 Nov 2025',
  due_date = '27 Nov 2025',
  subtotal = 0.0,
  tax_total = 0.0,
  total = 0.0,
  items = [], // [{ name, quantity, price, description? }]
  created_by_name = 'Admin',
  created_by_role = 'Administrator',
  website_url = '#',
  encrypted_data = null // Encrypted payment data
} = {}) => {

  if (!encrypted_data) {
    throw new Error('Encrypted payment data is required to generate payment URL');
  }

  const normalizedWebsiteUrl = website_url.replace(/\/+$/, '');
  const paymentUrl = `${normalizedWebsiteUrl}/payment?data=${encodeURIComponent(encrypted_data)}`;
  const invoiceUrl = `${normalizedWebsiteUrl}/invoice/${invoice_number}`;

  const formatCurrency = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  const content = `
    <p style="margin: 0 0 12px 0; color: #232347;">
      Hello <strong style="color: #8a3b9a;">${full_name}</strong>,
    </p>
    
    <p style="margin: 0 0 20px 0; color: #232347;">
      Thank you for your business! Here's your invoice summary:
    </p>

    <!-- Invoice Details Table -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0; border-collapse: collapse;">
      <tr style="background-color: #f9f9fb;">
        <td style="padding: 12px; border-bottom: 2px solid #e6e6ec; font-weight: bold; color: #232347;">Description</td>
        <td style="padding: 12px; border-bottom: 2px solid #e6e6ec; font-weight: bold; color: #232347; text-align: center;">Qty</td>
        <td style="padding: 12px; border-bottom: 2px solid #e6e6ec; font-weight: bold; color: #232347; text-align: right;">Price</td>
        <td style="padding: 12px; border-bottom: 2px solid #e6e6ec; font-weight: bold; color: #232347; text-align: right;">Amount</td>
      </tr>

      ${items.map(item => `
        <tr>
          <td style="padding: 14px 12px; border-bottom: 1px solid #f0f0f4; color: #232347;">
            <strong>${item.name || 'Item'}</strong>${item.description ? `<br/><span style="font-size: 14px; color: #66698c;">${item.description}</span>` : ''}
          </td>
          <td style="padding: 14px 12px; text-align: center;" class="mono-num">${item.quantity || 1}</td>
          <td style="padding: 14px 12px; text-align: right;" class="mono-num">${formatCurrency(item.price || 0)}</td>
          <td style="padding: 14px 12px; text-align: right;" class="mono-num">${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
        </tr>
      `).join('')}

      <tr>
        <td colspan="3" style="padding: 12px; border-top: 2px solid #e6e6ec; text-align: right;">Subtotal:</td>
        <td style="padding: 12px; text-align: right;" class="mono-num">${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 8px 12px; text-align: right;">Tax:</td>
        <td style="padding: 8px 12px; text-align: right;" class="mono-num">${formatCurrency(tax_total)}</td>
      </tr>
      <tr style="background-color: #f9f9fb;">
        <td colspan="3" style="padding: 14px 12px; font-weight: bold; font-size: 18px; text-align: right;">Total Amount:</td>
        <td style="padding: 14px 12px; font-weight: bold; font-size: 18px; color: #8a3b9a; text-align: right;" class="mono-num">${formatCurrency(total)}</td>
      </tr>
    </table>

    <!-- Payment Info - Outlook compatible -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; background-color: #f9f9fb; border-left: 4px solid #8a3b9a;">
      <tr>
        <td style="padding: 20px; color: #232347; font-size: 15px; line-height: 1.6; font-family: Verdana, Geneva, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                Payment Details
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Invoice #:</strong> <span class="mono-num" style="color: #8a3b9a; font-weight: bold; font-family: 'Courier New', Courier, monospace;">${invoice_number}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Issue Date:</strong> ${issue_date}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Due Date:</strong> ${due_date}
              </td>
            </tr>
            <tr>
              <td style="padding: 0; color: #232347; font-family: Verdana, Geneva, sans-serif;">
                <strong>Created By:</strong> ${created_by_name} (${created_by_role})
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailTemplate({
    title: `Invoice ${invoice_number}`,
    subtitle: `Date: ${issue_date}`,
    content,
    buttonText: 'Pay Now',
    buttonUrl: paymentUrl,
    footerText: `Questions about this invoice? Contact us at support@duhanashrah.ai`
  });
};

export default { 
  AdminEmailTemplateUserCreated, 
  PasswordResetTemplate, 
  TrialPeriodChangeTemplate, 
  TrialExtensionTemplate, 
  InviteEmailTemplate,
  InvoiceCreatedTemplate
};

export { AdminEmailTemplateUserCreated as _Admin, PasswordResetTemplate as _Reset };
