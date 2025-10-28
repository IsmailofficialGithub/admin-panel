import { createTransport } from "nodemailer";
import dotenv from "dotenv";
import {
  AdminEmailTemplateUserCreated,
  PasswordResetTemplate,
} from "../utils/emailTemplates.js";

dotenv.config();

/**
 * Email Service for sending transactional emails
 */

// Create nodemailer transporter
const user = process.env.AdminEmail;
const pass = process.env.Nodemailer_Google_App_Password;

export const transporter = createTransport({
  service: "gmail",
  auth: {
    user,
    pass,
  },
});

/**
 * Send welcome email to new user
 * @param {Object} params - Email parameters
 * @param {string} params.email - Recipient email
 * @param {string} params.full_name - User's full name
 * @param {string} params.password - Temporary password
 * @returns {Promise<Object>} Email send result
 */
export const sendWelcomeEmail = async ({ email, full_name, password }) => {
  try {
    // Verify transporter is ready
    const verified = await transporter.verify();
    if (!verified) {
      throw new Error("Email server not ready");
    }

    const website_url = process.env.CLIENT_URL || "http://localhost:3000";

    const htmlContent = AdminEmailTemplateUserCreated({
      full_name,
      email,
      password,
      website_url,
    });

    const ownerMail = {
      from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
      to: email,
      subject: `New User Created: ${full_name}`,
      html: htmlContent,
    };

    console.log("📧 Sending custom welcome email to:", email);
    await transporter.sendMail(ownerMail);
    console.log("✅ Welcome email sent successfully");

    return {
      success: true,
      message: "Welcome email sent successfully",
      email,
    };
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {Object} params - Email parameters
 * @param {string} params.email - Recipient email
 * @param {string} params.full_name - User's full name
 * @param {string} params.new_password - New password
 * @returns {Promise<Object>} Email send result
 */
export const sendPasswordResetEmail = async ({
  email,
  full_name,
  new_password,
}) => {
  try {
    // Verify transporter is ready
    await transporter.verify();

    const website_url = process.env.CLIENT_URL || "http://localhost:3000";

    const htmlContent = PasswordResetTemplate({
      full_name,
      new_password,
      website_url,
    });

    const resetMail = {
      from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
      to: email,
      subject: `Password Reset: ${full_name}`,
      html: htmlContent,
    };

    console.log("📧 Sending password reset email to:", email);
    await transporter.sendMail(resetMail);
    console.log("✅ Password reset email sent successfully");

    return {
      success: true,
      message: "Password reset email sent successfully",
      email,
    };
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw error;
  }
};

/**
 * Test email configuration
 * @returns {Promise<boolean>} True if email is configured correctly
 */
export const testEmailConfiguration = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email service is ready to send emails");
    return true;
  } catch (error) {
    console.error("❌ Email configuration error:", error.message);
    console.warn(
      "⚠️  Email service will not work. Please configure AdminEmail and Nodemailer_Google_App_Password in .env"
    );
    return false;
  }
};

export default {
  transporter,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  testEmailConfiguration,
};
