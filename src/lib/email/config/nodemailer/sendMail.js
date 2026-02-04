import { transporter } from "./nodemailer";

export const sendEmail = async (params = {}) => {
  const { to, subject, html } = params;
  
  if (!to) {
    console.error("❌ sendEmail error: missing 'to' address.");
    return;
  }
  if (!subject) {
    console.error("❌ sendEmail error: missing 'subject'.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Testing" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
