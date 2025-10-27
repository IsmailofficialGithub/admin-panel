export const EmailTemplateForgetPassword = ({
  full_name = "John Doe",
  email = "johndoe@example.com",
  password = "NewPass@123456",
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
  <!-- Wrapper Table -->
  <center style="width:100%; background-color:#f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f5f5f5" align="center">
      <tr>
        <td align="center" style="padding:20px 0;">
          
          <!-- Main Container -->
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
                        Password Reset Successful! 🔓
                      </h1>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:10px 40px 20px 40px;">
                      <p style="margin:0; color:#666666; font-size:15px; line-height:1.6;">
                        Your password has been successfully reset.<br/>You can now login with your new credentials.
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
                        Your password has been reset as requested. Here are your new login credentials:
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
                            <strong style="color:#333333;">🔑 New Password:</strong>
                            <span style="color:#555555; margin-left:10px; font-family:monospace; background-color:#f0f0f0; padding:4px 8px; border-radius:4px;">${password}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:15px 0 0 0; color:#888888; font-size:13px; line-height:1.6;">
                        🔒 For security reasons, we recommend changing this password after your first login.
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
                  Continue with <span style="color:#863793; font-weight:700;">Duha Nashrah.AI</span> ⚡
                </p>
                <h2 style="margin:15px 0 25px 0; color:#000; font-size:34px; font-weight:700;">Login with New Password</h2>
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
                        <a href="${website_url}" style="color:#863793; text-decoration:none; font-size:13px; font-weight:600;">
                          ${website_url}
                        </a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px;">
                      <div style="font-size:20px; font-weight:700; color:#863793;">Duha Nashrah.AI</div>
                      <div style="font-size:11px; color:#999; margin-top:5px;">Automate Yourself ⚡</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:25px; border-top:1px solid #e0e0e0;">
                      <p style="margin:0; color:#bbb; font-size:11px;">© 2025 Duha Nashrah.AI. All rights reserved.</p>
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

export default EmailTemplateForgetPassword;
