import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, from }) {
  try {
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, or html");
    }

    const response = await resend.emails.send({
      from: from || `Your App <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { success: false, error: error.message };
  }
}
