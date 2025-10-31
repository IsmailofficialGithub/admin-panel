import { createTransport } from "nodemailer";
import dotenv from "dotenv";
import {
  AdminEmailTemplateUserCreated,
  PasswordResetTemplate,
  TrialPeriodChangeTemplate,
  TrialExtensionTemplate,
  InvoiceCreatedTemplate,
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

/**
 * Send trial period change email
 * @param {Object} params - Email parameters
 * @param {string} params.email - Recipient email
 * @param {string} params.full_name - User's full name
 * @param {string} params.old_trial_date - Previous trial expiry date
 * @param {string} params.new_trial_date - New trial expiry date
 * @returns {Promise<Object>} Email send result
 */
export const sendTrialPeriodChangeEmail = async ({
  email,
  full_name,
  old_trial_date,
  new_trial_date,
}) => {
  try {
    // Verify transporter is ready
    await transporter.verify();

    const website_url = process.env.CLIENT_URL || "http://localhost:3000";

    const htmlContent = TrialPeriodChangeTemplate({
      full_name,
      old_trial_date,
      new_trial_date,
      website_url,
    });

    const mail = {
      from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
      to: email,
      subject: `Trial Period Updated: ${full_name}`,
      html: htmlContent,
    };

    console.log("📧 Sending trial period change email to:", email);
    await transporter.sendMail(mail);
    console.log("✅ Trial period change email sent successfully");

    return {
      success: true,
      message: "Trial period change email sent successfully",
      email,
    };
  } catch (error) {
    console.error("❌ Error sending trial period change email:", error);
    throw error;
  }
};

/**
 * Send trial extension email
 * @param {Object} params - Email parameters
 * @param {string} params.email - Recipient email
 * @param {string} params.full_name - User's full name
 * @param {string} params.new_trial_date - New trial expiry date
 * @param {number} params.extension_days - Number of days extended
 * @returns {Promise<Object>} Email send result
 */
export const sendTrialExtensionEmail = async ({
  email,
  full_name,
  new_trial_date,
  extension_days,
}) => {
  try {
    // Verify transporter is ready
    await transporter.verify();

    const website_url = process.env.CLIENT_URL || "http://localhost:3000";

    const htmlContent = TrialExtensionTemplate({
      full_name,
      new_trial_date,
      extension_days,
      website_url,
    });

    const mail = {
      from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
      to: email,
      subject: `Trial Extended: ${full_name}`,
      html: htmlContent,
    };

    console.log("📧 Sending trial extension email to:", email);
    await transporter.sendMail(mail);
    console.log("✅ Trial extension email sent successfully");

    return {
      success: true,
      message: "Trial extension email sent successfully",
      email,
    };
  } catch (error) {
    console.error("❌ Error sending trial extension email:", error);
    throw error;
  }
};

export default {
  transporter,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTrialPeriodChangeEmail,
  sendTrialExtensionEmail,
  testEmailConfiguration,
};

/**
 * Send invoice created email
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.full_name
 * @param {string} params.invoice_number
 * @param {string|number} params.total
 * @param {string} params.due_date
 */
export const sendInvoiceCreatedEmail = async ({ email, full_name, invoice_number, invoice_id = '', user_id = '', issue_date, due_date, subtotal, tax_total, total, items = [], created_by_name = 'Admin', created_by_role = 'admin' }) => {
  try {
    await transporter.verify();
    const website_url = process.env.CLIENT_URL || "http://localhost:3000";
    const htmlContent = InvoiceCreatedTemplate({
      full_name,
      invoice_number,
      invoice_id: invoice_id || '',
      user_id: user_id || '',
      issue_date,
      subtotal,
      tax_total,
      total: typeof total === 'number' ? total.toFixed(2) : String(total),
      due_date,
      items,
      created_by_name,
      created_by_role,
      website_url,
    });
    const mail = {
      from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
      to: email,
      subject: `Invoice Created: ${invoice_number}`,
      html: htmlContent,
    };
    console.log("📧 Sending invoice created email to:", email);
    await transporter.sendMail(mail);
    console.log("✅ Invoice created email sent successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending invoice created email:", error);
    return { success: false, error: error.message };
  }
};
