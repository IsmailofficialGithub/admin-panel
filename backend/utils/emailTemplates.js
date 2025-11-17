/**
 * Email Templates for User Management
 */

export const AdminEmailTemplateUserCreated = ({
  full_name = "John Doe",
  email = "johndoe@example.com",
  password = "Demo@123456",
  website_url = "#",
} = {}) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome Email</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Poppins', Arial, sans-serif;">
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" bgcolor="#ffffff" style="max-width:600px; width:100%; background-color:#ffffff; text-align:left;">
            
            <!-- Hero Section -->
            <tr>
              <td bgcolor="#ffffff" style="background:linear-gradient(135deg, rgba(21,214,231,0.08), rgba(134,55,147,0.05));">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:40px;"></td></tr>
                  <tr>
                    <td align="center" style="padding:20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td align="center" style="background:linear-gradient(135deg, rgba(21,214,231,0.15), rgba(134,55,147,0.1)); border-radius:50%; width:140px; height:140px; border:3px solid rgba(134,55,147,0.4); vertical-align:middle;">
                            <span style="font-size:70px; line-height:140px; display:inline-block;">🤖</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:20px 40px 10px 40px;">
                      <h1 style="margin:0; color:#191919; font-size:28px; font-weight:700; line-height:1.4;">
                        Welcome, ${full_name}! 🎉
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        Your account has been successfully created.<br/>We're excited to have you on board!
                      </p>
                    </td>
                  </tr>

                  <tr><td style="height:40px;"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:2px; background:linear-gradient(90deg, transparent, rgba(134,55,147,0.2), transparent);"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Credentials Section -->
            <tr>
              <td bgcolor="#FAFAFA" style="padding:40px 45px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:15px;">
                      <p style="margin:0; color:#333333; font-size:15px; font-weight:600;">👋 Hi ${full_name},</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px; background-color:#ffffff; border-left:4px solid rgba(134,55,147,0.6); border-radius:8px;">
                      <p style="margin:0 0 15px 0; color:#555555; font-size:14px; line-height:1.7;">
                        Your account has been successfully created! Here are your login credentials:
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px;">
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">📧 Email:</strong>
                            <span style="color:#555555; margin-left:10px;">${email}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">🔑 Password:</strong>
                            <span style="color:#555555; margin-left:10px; font-family:monospace; background-color:#f0f0f0; padding:4px 8px; border-radius:4px;">${password}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        🔒 Please keep this information secure and change your password after your first login.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Section -->
            <tr>
              <td align="center" bgcolor="#04f6f1" style="padding:40px 30px; background:linear-gradient(135deg, rgba(4,246,241,0.9), rgba(21,214,231,0.8)); text-align:center;">
                <p style="margin:0; color:#1a1a1a; font-size:16px; font-weight:600;">
                  Get started with <span style="color:#863793; font-weight:700;">Admin Panel</span> today! ⚡
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;"></h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" style="border-radius:30px; background:linear-gradient(135deg, #863793, #A04DB5); box-shadow:0 5px 20px rgba(134,55,147,0.4);">
                      <a href="${website_url}/login" style="display:inline-block; padding:15px 50px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">→ Login Now</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8f8f8" style="padding:40px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:20px;">
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">🐦</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding:0 15px;">📘</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">📷</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding-left:15px;">💼</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 20px 10px 20px;">
                      <p style="margin:0; color:#999; font-size:12px;">
                        Having trouble with the button?<br/>Copy and paste this URL into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;">
                        <a href="${website_url}/login" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600; word-break: break-all;">
                          ${website_url}/login
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Admin Panel</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Powered by Supabase ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Admin Panel. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export const PasswordResetTemplate = ({
  full_name = "User",
  new_password = "NewPassword123!",
  website_url = "#",
} = {}) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Poppins', Arial, sans-serif;">
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" bgcolor="#ffffff" style="max-width:600px; width:100%; background-color:#ffffff; text-align:left;">
            
            <!-- Hero Section -->
            <tr>
              <td bgcolor="#ffffff" style="background:linear-gradient(135deg, rgba(21,214,231,0.08), rgba(134,55,147,0.05));">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:40px;"></td></tr>
                  <tr>
                    <td align="center" style="padding:20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td align="center" style="background:linear-gradient(135deg, rgba(21,214,231,0.15), rgba(134,55,147,0.1)); border-radius:50%; width:140px; height:140px; border:3px solid rgba(134,55,147,0.4); vertical-align:middle;">
                            <span style="font-size:70px; line-height:140px; display:inline-block;">🔑</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:20px 40px 10px 40px;">
                      <h1 style="margin:0; color:#191919; font-size:28px; font-weight:700; line-height:1.4;">
                        Password Reset Successful! 🔐
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        Your password has been successfully reset.<br/>Please use your new credentials to login.
                      </p>
                    </td>
                  </tr>

                  <tr><td style="height:40px;"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:2px; background:linear-gradient(90deg, transparent, rgba(134,55,147,0.2), transparent);"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Credentials Section -->
            <tr>
              <td bgcolor="#FAFAFA" style="padding:40px 45px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:15px;">
                      <p style="margin:0; color:#333333; font-size:15px; font-weight:600;">👋 Hi ${full_name},</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px; background-color:#ffffff; border-left:4px solid rgba(134,55,147,0.6); border-radius:8px;">
                      <p style="margin:0 0 15px 0; color:#555555; font-size:14px; line-height:1.7;">
                        Your password has been successfully reset! Here is your new temporary password:
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px;">
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">🔑 New Password:</strong>
                            <span style="color:#555555; margin-left:10px; font-family:monospace; background-color:#f0f0f0; padding:4px 8px; border-radius:4px;">${new_password}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        🔒 Please change this password after logging in for security purposes. Go to your account settings to update it.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Section -->
            <tr>
              <td align="center" bgcolor="#04f6f1" style="padding:40px 30px; background:linear-gradient(135deg, rgba(4,246,241,0.9), rgba(21,214,231,0.8)); text-align:center;">
                <p style="margin:0; color:#1a1a1a; font-size:16px; font-weight:600;">
                  Login with your <span style="color:#863793; font-weight:700;">new password</span> now! ⚡
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;"></h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" style="border-radius:30px; background:linear-gradient(135deg, #863793, #A04DB5); box-shadow:0 5px 20px rgba(134,55,147,0.4);">
                      <a href="${website_url}/login" style="display:inline-block; padding:15px 50px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">→ Login Now</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8f8f8" style="padding:40px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:20px;">
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">🐦</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding:0 15px;">📘</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">📷</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding-left:15px;">💼</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 20px 10px 20px;">
                      <p style="margin:0; color:#999; font-size:12px;">
                        Having trouble with the button?<br/>Copy and paste this URL into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;">
                        <a href="${website_url}/login" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600; word-break: break-all;">
                          ${website_url}/login
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Admin Panel</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Powered by Supabase ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Admin Panel. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export const TrialPeriodChangeTemplate = ({
  full_name = "User",
  old_trial_date = "2025-01-01",
  new_trial_date = "2025-01-08",
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Trial Period Updated</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Poppins', Arial, sans-serif;">
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" bgcolor="#ffffff" style="max-width:600px; width:100%; background-color:#ffffff; text-align:left;">
            
            <!-- Hero Section -->
            <tr>
              <td bgcolor="#ffffff" style="background:linear-gradient(135deg, rgba(21,214,231,0.08), rgba(134,55,147,0.05));">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:40px;"></td></tr>
                  <tr>
                    <td align="center" style="padding:20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td align="center" style="background:linear-gradient(135deg, rgba(21,214,231,0.15), rgba(134,55,147,0.1)); border-radius:50%; width:140px; height:140px; border:3px solid rgba(134,55,147,0.4); vertical-align:middle;">
                            <span style="font-size:70px; line-height:140px; display:inline-block;">📅</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:20px 40px 10px 40px;">
                      <h1 style="margin:0; color:#191919; font-size:28px; font-weight:700; line-height:1.4;">
                        Trial Period Updated 📆
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        Your trial period has been updated.<br/>Please check the new dates below.
                      </p>
                    </td>
                  </tr>

                  <tr><td style="height:40px;"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:2px; background:linear-gradient(90deg, transparent, rgba(134,55,147,0.2), transparent);"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Trial Info Section -->
            <tr>
              <td bgcolor="#FAFAFA" style="padding:40px 45px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:15px;">
                      <p style="margin:0; color:#333333; font-size:15px; font-weight:600;">👋 Hi ${full_name},</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px; background-color:#ffffff; border-left:4px solid rgba(134,55,147,0.6); border-radius:8px;">
                      <p style="margin:0 0 15px 0; color:#555555; font-size:14px; line-height:1.7;">
                        Your trial period expiration date has been updated. Here are the details:
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px;">
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">📅 Previous Trial Expiry:</strong>
                            <span style="color:#555555; margin-left:10px;">${formatDate(old_trial_date)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">✅ New Trial Expiry:</strong>
                            <span style="color:#74317e; margin-left:10px; font-weight:600;">${formatDate(new_trial_date)}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        💡 Your trial access will remain active until the new expiration date. Make the most of it!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Section -->
            <tr>
              <td align="center" bgcolor="#04f6f1" style="padding:40px 30px; background:linear-gradient(135deg, rgba(4,246,241,0.9), rgba(21,214,231,0.8)); text-align:center;">
                <p style="margin:0; color:#1a1a1a; font-size:16px; font-weight:600;">
                  Continue enjoying <span style="color:#863793; font-weight:700;">your extended trial</span>! ⚡
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;"></h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" style="border-radius:30px; background:linear-gradient(135deg, #863793, #A04DB5); box-shadow:0 5px 20px rgba(134,55,147,0.4);">
                      <a href="${website_url}/consumer/dashboard" style="display:inline-block; padding:15px 50px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">→ Go to Dashboard</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8f8f8" style="padding:40px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:20px;">
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">🐦</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding:0 15px;">📘</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">📷</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding-left:15px;">💼</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 20px 10px 20px;">
                      <p style="margin:0; color:#999; font-size:12px;">
                        Having trouble with the button?<br/>Copy and paste this URL into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;">
                        <a href="${website_url}/login" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600; word-break: break-all;">
                          ${website_url}/login
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Admin Panel</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Powered by Supabase ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Admin Panel. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Trial Extended</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Poppins', Arial, sans-serif;">
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" bgcolor="#ffffff" style="max-width:600px; width:100%; background-color:#ffffff; text-align:left;">
            
            <!-- Hero Section -->
            <tr>
              <td bgcolor="#ffffff" style="background:linear-gradient(135deg, rgba(21,214,231,0.08), rgba(134,55,147,0.05));">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:40px;"></td></tr>
                  <tr>
                    <td align="center" style="padding:20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td align="center" style="background:linear-gradient(135deg, rgba(21,214,231,0.15), rgba(134,55,147,0.1)); border-radius:50%; width:140px; height:140px; border:3px solid rgba(134,55,147,0.4); vertical-align:middle;">
                            <span style="font-size:70px; line-height:140px; display:inline-block;">🎉</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:20px 40px 10px 40px;">
                      <h1 style="margin:0; color:#191919; font-size:28px; font-weight:700; line-height:1.4;">
                        Trial Extended! 🚀
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        Great news! Your trial period has been extended.<br/>You now have more time to explore our services.
                      </p>
                    </td>
                  </tr>

                  <tr><td style="height:40px;"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:2px; background:linear-gradient(90deg, transparent, rgba(134,55,147,0.2), transparent);"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Extension Info Section -->
            <tr>
              <td bgcolor="#FAFAFA" style="padding:40px 45px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:15px;">
                      <p style="margin:0; color:#333333; font-size:15px; font-weight:600;">👋 Hi ${full_name},</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px; background-color:#ffffff; border-left:4px solid rgba(134,55,147,0.6); border-radius:8px;">
                      <p style="margin:0 0 15px 0; color:#555555; font-size:14px; line-height:1.7;">
                        We're excited to let you know that your trial period has been extended! Here are the details:
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px;">
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">⏰ Extended by:</strong>
                            <span style="color:#555555; margin-left:10px;">${extension_days} day${extension_days !== 1 ? 's' : ''}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">✅ New Trial Expiry Date:</strong>
                            <span style="color:#74317e; margin-left:10px; font-weight:600;">${formatDate(new_trial_date)}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        🎁 Enjoy the extended trial and continue exploring all the amazing features available to you!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Section -->
            <tr>
              <td align="center" bgcolor="#04f6f1" style="padding:40px 30px; background:linear-gradient(135deg, rgba(4,246,241,0.9), rgba(21,214,231,0.8)); text-align:center;">
                <p style="margin:0; color:#1a1a1a; font-size:16px; font-weight:600;">
                  Make the most of your <span style="color:#863793; font-weight:700;">extended trial</span>! ⚡
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;"></h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" style="border-radius:30px; background:linear-gradient(135deg, #863793, #A04DB5); box-shadow:0 5px 20px rgba(134,55,147,0.4);">
                      <a href="${website_url}/consumer/dashboard" style="display:inline-block; padding:15px 50px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">→ Go to Dashboard</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8f8f8" style="padding:40px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:20px;">
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">🐦</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding:0 15px;">📘</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">📷</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding-left:15px;">💼</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 20px 10px 20px;">
                      <p style="margin:0; color:#999; font-size:12px;">
                        Having trouble with the button?<br/>Copy and paste this URL into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;">
                        <a href="${paymentUrl}" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600; word-break: break-all;">
                          ${paymentUrl}
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Admin Panel</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Powered by Supabase ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Admin Panel. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export const InviteEmailTemplate = ({
  full_name = "User",
  email = "user@example.com",
  role = "user",
  invite_url = "#",
  website_url = "#",
  inviter_name = "Admin",
} = {}) => {
  const roleLabels = {
    user: "User",
    reseller: "Reseller",
    consumer: "Consumer"
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation Email</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Poppins', Arial, sans-serif;">
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" bgcolor="#ffffff" style="max-width:600px; width:100%; background-color:#ffffff; text-align:left;">
            
            <!-- Hero Section -->
            <tr>
              <td bgcolor="#ffffff" style="background:linear-gradient(135deg, rgba(21,214,231,0.08), rgba(134,55,147,0.05));">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:40px;"></td></tr>
                  <tr>
                    <td align="center" style="padding:20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td align="center" style="background:linear-gradient(135deg, rgba(21,214,231,0.15), rgba(134,55,147,0.1)); border-radius:50%; width:140px; height:140px; border:3px solid rgba(134,55,147,0.4); vertical-align:middle;">
                            <span style="font-size:70px; line-height:140px; display:inline-block;">📧</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:20px 40px 10px 40px;">
                      <h1 style="margin:0; color:#191919; font-size:28px; font-weight:700; line-height:1.4;">
                        You're Invited! 🎉
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        ${inviter_name} has invited you to join as a <strong>${roleLabels[role] || role}</strong>.<br/>Complete your registration to get started!
                      </p>
                    </td>
                  </tr>

                  <tr><td style="height:40px;"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:2px; background:linear-gradient(90deg, transparent, rgba(134,55,147,0.2), transparent);"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Invitation Details Section -->
            <tr>
              <td bgcolor="#FAFAFA" style="padding:40px 45px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:15px;">
                      <p style="margin:0; color:#333333; font-size:15px; font-weight:600;">👋 Hi there,</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px; background-color:#ffffff; border-left:4px solid rgba(134,55,147,0.6); border-radius:8px;">
                      <p style="margin:0 0 15px 0; color:#555555; font-size:14px; line-height:1.7;">
                        You've been invited to join our platform! Click the button below to complete your registration and create your account.
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px;">
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">📧 Email:</strong>
                            <span style="color:#555555; margin-left:10px;">${email}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">👤 Role:</strong>
                            <span style="color:#555555; margin-left:10px; text-transform:capitalize;">${roleLabels[role] || role}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        ⏰ This invitation link will expire in 7 days. Please complete your registration soon!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Section -->
            <tr>
              <td align="center" bgcolor="#04f6f1" style="padding:40px 30px; background:linear-gradient(135deg, rgba(4,246,241,0.9), rgba(21,214,231,0.8)); text-align:center;">
                <p style="margin:0; color:#1a1a1a; font-size:16px; font-weight:600;">
                  Complete your <span style="color:#863793; font-weight:700;">registration</span> now! ⚡
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;"></h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" style="border-radius:30px; background:linear-gradient(135deg, #863793, #A04DB5); box-shadow:0 5px 20px rgba(134,55,147,0.4);">
                      <a href="${invite_url}" style="display:inline-block; padding:15px 50px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">→ Accept Invitation</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8f8f8" style="padding:40px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:20px;">
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">🐦</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding:0 15px;">📘</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">📷</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding-left:15px;">💼</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 20px 10px 20px;">
                      <p style="margin:0; color:#999; font-size:12px;">
                        Having trouble with the button?<br/>Copy and paste this URL into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;">
                        <a href="${invite_url}" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600; word-break: break-all;">
                          ${invite_url}
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Admin Panel</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Powered by Supabase ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Admin Panel. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export default { AdminEmailTemplateUserCreated, PasswordResetTemplate, TrialPeriodChangeTemplate, TrialExtensionTemplate, InviteEmailTemplate };

export const InvoiceCreatedTemplate = ({
  full_name = 'Customer',
  invoice_number = 'INV-0001',
  invoice_id = '',
  user_id = '',
  issue_date = '',
  due_date = '',
  subtotal = '0.00',
  tax_total = '0.00',
  total = '0.00',
  items = [], // [{ name, quantity, price, total }]
  created_by_name = 'Admin',
  created_by_role = 'admin',
  website_url = '#',
  encrypted_data = null // Encrypted payment data
} = {}) => {
  // Normalize website_url - remove trailing slash to avoid double slashes
  const normalizedWebsiteUrl = website_url.replace(/\/+$/, '');
  
  // Generate payment URL - only use encrypted data (required)
  if (!encrypted_data) {
    throw new Error('Encrypted payment data is required to generate payment URL');
  }
  
  const paymentUrl = `${normalizedWebsiteUrl}/payment?data=${encodeURIComponent(encrypted_data)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice Created</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Poppins', Arial, sans-serif;">
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" bgcolor="#ffffff" style="max-width:600px; width:100%; background-color:#ffffff; text-align:left;">
            
            <!-- Hero Section -->
            <tr>
              <td bgcolor="#ffffff" style="background:linear-gradient(135deg, rgba(21,214,231,0.08), rgba(134,55,147,0.05));">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td style="height:40px;"></td></tr>
                  <tr>
                    <td align="center" style="padding:20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                        <tr>
                          <td align="center" style="background:linear-gradient(135deg, rgba(21,214,231,0.15), rgba(134,55,147,0.1)); border-radius:50%; width:140px; height:140px; border:3px solid rgba(134,55,147,0.4); vertical-align:middle;">
                            <span style="font-size:70px; line-height:140px; display:inline-block;">🧾</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:20px 40px 10px 40px;">
                      <h1 style="margin:0; color:#191919; font-size:28px; font-weight:700; line-height:1.4;">
                        Invoice Created! 🎉
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        Hi ${full_name}, a new invoice has been generated for your account.<br/>Please review the details below.
                      </p>
                    </td>
                  </tr>

                  <tr><td style="height:40px;"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:2px; background:linear-gradient(90deg, transparent, rgba(134,55,147,0.2), transparent);"></td></tr>
                </table>
              </td>
            </tr>

            <!-- Invoice Details Section -->
            <tr>
              <td bgcolor="#FAFAFA" style="padding:40px 45px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:15px;">
                      <p style="margin:0; color:#333333; font-size:15px; font-weight:600;">👋 Hi ${full_name},</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:15px; background-color:#ffffff; border-left:4px solid rgba(134,55,147,0.6); border-radius:8px;">
                      <p style="margin:0 0 15px 0; color:#555555; font-size:14px; line-height:1.7;">
                        Your invoice has been successfully created! Here are the details:
                      </p>
                      
                      <!-- Invoice Summary -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px; margin-bottom:15px;">
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">📄 Invoice #:</strong>
                            <span style="color:#555555; margin-left:10px; font-weight:600; color:#863793;">${invoice_number}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">📅 Issue Date:</strong>
                            <span style="color:#555555; margin-left:10px;">${issue_date || 'N/A'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">⏰ Due Date:</strong>
                            <span style="color:#555555; margin-left:10px;">${due_date || 'N/A'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;">
                            <strong style="color:#333333;">👤 Created By:</strong>
                            <span style="color:#555555; margin-left:10px;">${created_by_name} (${created_by_role})</span>
                          </td>
                        </tr>
                      </table>

                      <!-- Items Table -->
                      <p style="margin:20px 0 10px 0; color:#333333; font-size:14px; font-weight:600;">Invoice Items:</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; margin-top:10px;">
                        <thead>
                          <tr style="background-color:#f9f9f9;">
                            <th align="left" style="padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#333333; font-size:13px; font-weight:600;">Product</th>
                            <th align="right" style="padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#333333; font-size:13px; font-weight:600;">Qty</th>
                            <th align="right" style="padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#333333; font-size:13px; font-weight:600;">Price</th>
                            <th align="right" style="padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#333333; font-size:13px; font-weight:600;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${items.map(it => `
                            <tr>
                              <td style="padding:10px 8px; border-bottom:1px solid #f0f0f0; color:#555555; font-size:13px;">${it.name}</td>
                              <td align="right" style="padding:10px 8px; border-bottom:1px solid #f0f0f0; color:#555555; font-size:13px;">${it.quantity}</td>
                              <td align="right" style="padding:10px 8px; border-bottom:1px solid #f0f0f0; color:#555555; font-size:13px;">$${Number(it.price).toFixed(2)}</td>
                              <td align="right" style="padding:10px 8px; border-bottom:1px solid #f0f0f0; color:#555555; font-size:13px;">$${Number(it.total).toFixed(2)}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>

                      <!-- Totals Summary -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px; border-top:2px dashed #e5e7eb; padding-top:15px;">
                        <tr>
                          <td style="padding:6px 0;">
                            <span style="color:#666666; font-size:13px;">Subtotal:</span>
                            <span style="color:#333333; margin-left:10px; font-weight:600; float:right;">$${subtotal}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;">
                            <span style="color:#666666; font-size:13px;">Tax:</span>
                            <span style="color:#333333; margin-left:10px; font-weight:600; float:right;">$${tax_total}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0; border-top:2px solid #e5e7eb; margin-top:10px;">
                            <span style="color:#191919; font-size:15px; font-weight:700;">Total Amount:</span>
                            <span style="color:#863793; margin-left:10px; font-weight:700; font-size:18px; float:right;">$${total}</span>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        💳 Please proceed with the payment using the button below.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA Section -->
            <tr>
              <td align="center" bgcolor="#04f6f1" style="padding:40px 30px; background:linear-gradient(135deg, rgba(4,246,241,0.9), rgba(21,214,231,0.8)); text-align:center;">
                <p style="margin:0; color:#1a1a1a; font-size:16px; font-weight:600;">
                  Proceed to payment on <span style="color:#863793; font-weight:700;">Duha Nashrah</span>
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;"></h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" style="border-radius:30px; background:linear-gradient(135deg, #863793, #A04DB5); box-shadow:0 5px 20px rgba(134,55,147,0.4);">
                      <a href="${paymentUrl}" style="display:inline-block; padding:15px 50px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px;">→ Pay Now</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" bgcolor="#f8f8f8" style="padding:40px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom:20px;">
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">🐦</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding:0 15px;">📘</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px;">📷</a>
                      <a href="#" style="color:#666; text-decoration:none; font-size:24px; padding-left:15px;">💼</a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 20px 10px 20px;">
                      <p style="margin:0; color:#999; font-size:12px;">
                        Having trouble with the button?<br/>Copy and paste this URL into your browser:
                      </p>
                      <p style="margin:10px 0 0 0;">
                        <a href="${paymentUrl}" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600; word-break: break-all;">
                          ${paymentUrl}
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Admin Panel</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Powered by Supabase ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Admin Panel. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export { AdminEmailTemplateUserCreated as _Admin, PasswordResetTemplate as _Reset };

