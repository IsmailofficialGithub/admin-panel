export const EmailTemplateUserCreated = ({
  full_name = "John Doe",
  email = "johndoe@example.com",
  password = "Demo@123456",
  website_url = "#",
} = {}) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #f5f5f5;">
    <center>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
                <td style="padding: 20px 0;">
                    <!-- Main Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; max-width: 600px;">
                        
                        <!-- Hero Section -->
                        <tr>
                            <td style="padding: 0; background: linear-gradient(135deg, rgba(21, 214, 231, 0.08), rgba(134, 55, 147, 0.05));">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <!-- Top spacing -->
                                    <tr>
                                        <td style="height: 40px;"></td>
                                    </tr>
                                    
                                    <!-- Robot Icon Container -->
                                    <tr>
                                        <td style="text-align: center; padding: 20px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                                                <tr>
                                                    <td style="text-align: center; background: linear-gradient(135deg, rgba(21, 214, 231, 0.15), rgba(134, 55, 147, 0.1)); border-radius: 50%; width: 140px; height: 140px; border: 3px solid rgba(134, 55, 147, 0.4); vertical-align: middle;">
                                                        <!-- Robot Emoji -->
                                                        <span style="font-size: 70px; line-height: 140px; display: inline-block;">🤖</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    
                                    <!-- Welcome Heading -->
                                    <tr>
                                        <td style="text-align: center; padding: 20px 40px 10px 40px;">
                                            <h1 style="margin: 0; color: #191919; font-size: 28px; font-weight: 700; font-family: 'Poppins', Arial, sans-serif; line-height: 1.4;">
                                                Welcome, ${full_name}! 🎉
                                            </h1>
                                        </td>
                                    </tr>
                                    
                                    <!-- Description -->
                                    <tr>
                                        <td style="text-align: center; padding: 10px 40px 20px 40px;">
                                            <p style="margin: 0; color: #666666; font-size: 15px; font-family: 'Poppins', Arial, sans-serif; line-height: 1.6;">
                                                Your account has been successfully created.<br/>We're excited to have you on board!
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Verify Button -->
                                    <tr>
                                        <td style="text-align: center; padding: 20px 40px 40px 40px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                                <tr>
                                                    
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Divider -->
                        <tr>
                            <td style="padding: 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="height: 2px; background: linear-gradient(90deg, transparent, rgba(134, 55, 147, 0.2), transparent);"></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Credentials Section -->
                        <tr>
                            <td style="padding: 40px 45px; background-color: #FAFAFA;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="padding-bottom: 15px;">
                                            <p style="margin: 0; color: #333333; font-size: 15px; font-family: 'Poppins', Arial, sans-serif; font-weight: 600;">
                                                👋 Hi ${full_name},
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 15px; background-color: #ffffff; border-left: 4px solid rgba(134, 55, 147, 0.6); border-radius: 8px;">
                                            <p style="margin: 0 0 15px 0; color: #555555; font-size: 14px; font-family: 'Poppins', Arial, sans-serif; line-height: 1.7;">
                                                Your account has been successfully created! Here are your login credentials:
                                            </p>
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 15px;">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <strong style="color: #333333; font-size: 14px;">📧 Email:</strong>
                                                        <span style="color: #555555; font-size: 14px; margin-left: 10px;">${email}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <strong style="color: #333333; font-size: 14px;">🔑 Password:</strong>
                                                        <span style="color: #555555; font-size: 14px; margin-left: 10px; font-family: monospace; background-color: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${password}</span>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p style="margin: 15px 0 0 0; color: #888888; font-size: 13px; font-family: 'Poppins', Arial, sans-serif; line-height: 1.6;">
                                                🔒 Please keep this information secure and change your password after your first login.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- CTA Section -->
                        <tr>
                            <td style="padding: 40px 30px; background: linear-gradient(135deg, rgba(4, 246, 241, 0.9), rgba(21, 214, 231, 0.8)); text-align: center;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 10px;">
                                            <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">
                                                Get started with <span style="color: #863793; font-weight: 700;">Duha Nashrah.AI</span> today! ⚡
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center; padding: 15px 0 25px 0;">
                                            <h2 style="margin: 0; color: #000000; font-size: 34px; font-weight: 700; font-family: 'Poppins', Arial, sans-serif; line-height: 1.3;">
                                                Activate Your Account
                                            </h2>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                                <tr>
                                                    <td style="border-radius: 30px; background: linear-gradient(135deg, #863793, #A04DB5); box-shadow: 0 5px 20px rgba(134, 55, 147, 0.4);">
                                                        <a href=${`${website_url}/login`} style="display: inline-block; padding: 15px 50px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; font-family: 'Poppins', Arial, sans-serif;">
                                                            → Login Now
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer Section -->
                        <tr>
                            <td style="padding: 40px 30px; background-color: #f8f8f8; text-align: center;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <!-- Social Links as Text -->
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 20px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                                <tr>
                                                    <td style="padding: 0 15px;">
                                                        <a href="#" style="color: #666666; text-decoration: none; font-size: 24px;">🐦</a>
                                                    </td>
                                                    <td style="padding: 0 15px;">
                                                        <a href="#" style="color: #666666; text-decoration: none; font-size: 24px;">📘</a>
                                                    </td>
                                                    <td style="padding: 0 15px;">
                                                        <a href="#" style="color: #666666; text-decoration: none; font-size: 24px;">📷</a>
                                                    </td>
                                                    <td style="padding: 0 15px;">
                                                        <a href="#" style="color: #666666; text-decoration: none; font-size: 24px;">💼</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer Text -->
                                    <tr>
                                        <td style="text-align: center; padding: 20px 20px 10px 20px;">
                                            <p style="margin: 0; color: #999999; font-size: 12px; font-family: 'Poppins', Arial, sans-serif; line-height: 1.6;">
                                                Having trouble with the buttons?<br/>
                                                Copy and paste this URL into your browser:
                                            </p>
                                            <p style="margin: 10px 0 0 0;">
                                                <a href="https://app.chunk.africa" style="color: #863793; text-decoration: none; font-size: 13px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">
                                                    https://app.chunk.africa
                                                </a>
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Logo Text -->
                                    <tr>
                                        <td style="text-align: center; padding-top: 25px;">
                                            <div style="font-size: 20px; font-weight: 700; color: #863793; font-family: 'Poppins', Arial, sans-serif; letter-spacing: 1px;">
                                                Duha Nashrah.AI
                                            </div>
                                            <div style="font-size: 11px; color: #999999; font-family: 'Poppins', Arial, sans-serif; margin-top: 5px;">
                                                Automate Yourself ⚡
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Copyright -->
                                    <tr>
                                        <td style="text-align: center; padding-top: 25px; border-top: 1px solid #e0e0e0; margin-top: 20px;">
                                            <p style="margin: 0; color: #bbbbbb; font-size: 11px; font-family: 'Poppins', Arial, sans-serif;">
                                                © 2025 Duha Nashrah.AI. All rights reserved.
                                            </p>
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

export default EmailTemplateUserCreated;
