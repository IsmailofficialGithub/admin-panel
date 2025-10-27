import { createAdminClient } from "../lib/supabase/Production/admin";
import { createClient } from "../lib/supabase/Production/client";
import { transporter } from "../Email/nodemailer/nodemailerConfig";
import { EmailTemplateForgetPassword } from "../Email/templete/ForgetPasswordEmaiTemplete";
import { generatePassword } from "../helper/rmPassword";

export async function resetUserPassword(user_id, password) {
  try {
    if (!user_id || typeof user_id !== "string" || user_id.trim() === "") {
      return { error: "user_id must be a valid non-empty string" };
    }

    // Create Supabase clients
    const supabase = createClient();
    const supabaseAdmin = createAdminClient();

    // 1️⃣ Check if user exists
    const { data: existingUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(user_id);

    if (getUserError) {
      console.error("❌ Get user error:", getUserError);
      return { error: "Error fetching user information" };
    }

    if (!existingUser?.user) {
      return { error: "User not found with provided user_id" };
    }

    const email = existingUser.user.email;
    const full_name = existingUser.user.user_metadata?.full_name || "User";

    if (!email) return { error: "User has no email address associated" };

    // 2️⃣ Generate or validate new password
    const newPassword = generatePassword();

    // 3️⃣ Update password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("❌ Password update error:", updateError);
      return { error: `Failed to update password: ${updateError.message}` };
    }

    // 4️⃣ Send email with new password
    try {
      await sendPasswordResetEmail(email, full_name, newPassword);
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);
      return {
        success: true,
        message:
          "Password updated successfully, but email notification failed.",
        email,
      };
    }

    return {
      success: true,
      message: "Password reset successfully and email sent.",
      email,
    };
  } catch (error) {
    console.error("❌ resetUserPassword Error:", error);
    return { error: "Internal error resetting password" };
  }
}

// async function sendPasswordResetEmail(email, full_name, password) {
//   const isReady = await transporter.verify();
//   if (!isReady) throw new Error("Email server not ready");

//   const website_url = process.env.REACT_APP_API_URL || "http://localhost:3000";

//   const emailHtml = EmailTemplateForgetPassword({
//     full_name,
//     email,
//     password,
//     website_url,
//   });

//   const mailOptions = {
//     from: `"Duha Nashrah.AI" <${process.env.REACT_APP_ADMIN_EMAIL}>`,
//     to: email,
//     subject: `Password Reset - ${full_name}`,
//     html: emailHtml,
//   };

//   await transporter.sendMail(mailOptions);
//   console.log(`📧 Password reset email sent to ${email}`);
// }
