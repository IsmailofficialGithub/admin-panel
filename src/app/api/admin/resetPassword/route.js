import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/Production/admin";
import { createServerSupabaseClient } from "@/lib/supabase/Production/server";
import { transporter } from "@/lib/email/config/nodemailer/nodemailer";
import { EmailTemplateForgetPassword } from "@/lib/email/templete/ForgetPasswordEmaiTemplete";

export async function POST(req) {
  try {
    // 1️⃣ Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { user_id, password } = requestBody;

    // 2️⃣ Validate user_id
    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    if (typeof user_id !== "string" || user_id.trim() === "") {
      return NextResponse.json(
        { error: "user_id must be a valid non-empty string" },
        { status: 400 }
      );
    }

    // 3️⃣ Check if current user is admin
    const supabase = await createServerSupabaseClient();
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();

    // if (authError || !user) {
    //   return NextResponse.json(
    //     { error: "Unauthorized: Please login" },
    //     { status: 401 }
    //   );
    // }

    // // 4️⃣ Verify admin role
    // const { data: profile, error: profileError } = await supabase
    //   .from("profiles")
    //   .select("role")
    //   .eq("user_id", user.id)
    //   .single();

    // if (profileError) {
    //   console.error("❌ Profile fetch error:", profileError);
    //   return NextResponse.json(
    //     { error: "Error verifying user permissions" },
    //     { status: 500 }
    //   );
    // }

    // if (profile?.role !== "admin") {
    //   return NextResponse.json(
    //     { error: "Forbidden: Admin access required" },
    //     { status: 403 }
    //   );
    // }

    // 5️⃣ Validate password if provided
    if (password !== undefined && password !== null) {
      if (typeof password !== "string") {
        return NextResponse.json(
          { error: "Password must be a string" },
          { status: 400 }
        );
      }
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long" },
          { status: 400 }
        );
      }
    }

    const supabaseAdmin = createAdminClient();

    // 6️⃣ Check if user exists first
    const { data: existingUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(user_id);

    if (getUserError) {
      console.error("❌ Get user error:", getUserError);
      return NextResponse.json(
        { error: "Error fetching user information" },
        { status: 500 }
      );
    }

    if (!existingUser?.user) {
      return NextResponse.json(
        { error: "User not found with provided user_id" },
        { status: 404 }
      );
    }

    const email = existingUser.user.email;
    const full_name =
      existingUser.user.user_metadata?.full_name || "User";

    if (!email) {
      return NextResponse.json(
        { error: "User has no email address associated" },
        { status: 400 }
      );
    }

    // 7️⃣ Generate new password
    const newPassword = password || crypto.randomBytes(8).toString("base64");

    // 8️⃣ Update Supabase Auth password
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("❌ Password update error:", updateError);
      return NextResponse.json(
        { error: `Failed to update password: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 9️⃣ Send email notification
    try {
      await sendPasswordResetEmail(email, full_name, newPassword);
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);
      // Password was updated successfully, but email failed
      return NextResponse.json(
        {
          success: true,
          message: "Password updated successfully, but email notification failed",
          email,
          warning: "Email notification could not be sent",
        },
        { status: 200 }
      );
    }

    // 🔟 Return success response
    return NextResponse.json({
      success: true,
      message: "Password reset successfully and email sent",
      email,
    });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while resetting password" },
      { status: 500 }
    );
  }
}

async function sendPasswordResetEmail(email, full_name, password) {
  // Verify email transporter
  const isReady = await transporter.verify();
  if (!isReady) {
    throw new Error("Email server is not ready");
  }

  const website_url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const emailHtml = EmailTemplateForgetPassword({
    full_name,
    email,
    password,
    website_url,
  });

  const mailOptions = {
    from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
    to: email,
    subject: `Password Reset - ${full_name}`,
    html: emailHtml,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Password reset email sent to ${email}`);
}
