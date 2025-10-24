import { transporter } from "@/lib/email/config/nodemailer/nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();

    // --- 1. Authenticate current user ---
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- 2. Verify admin role ---
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // --- 3. Extract and validate request data ---
    const { email, password, full_name = "", avatar_url = "", phone = null } =
      await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // --- 4. Create user via admin client ---
    const adminClient = createAdminClient();

    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        ...(phone ? { phone } : {}),
        email_confirm: true,
        user_metadata: { full_name, avatar_url },
      });

    if (createError) {
      console.error("User creation error:", createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    // --- 5. Insert profile record ---
    const { error: insertError } = await adminClient.from("profiles").insert([
      {
        user_id: newUser.user.id,
        full_name,
        phone,
        email,
        avatar_url,
      },
    ]);

    if (insertError) {
      console.error("Profile insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to insert user profile" },
        { status: 500 }
      );
    }
        const data = await transporter.verify();
    if (!data) {
      throw new Error("Email server not ready");
    }
    const website_url = process.env.NEXT_PUBLIC_API_URL;
    const emailHtml = EmailTemplateUserCreated({
      full_name,
      email,
      password,
      website_url,
    });

    const ownerMail = {
      from: `"Duha Nashrah.AI" <${process.env.AdminEmail}>`,
      to: email,
      subject: `New User Created: ${full_name}`,
      html: emailHtml,
    };

    await transporter.sendMail(ownerMail);

    // --- 6. Success response ---
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        phone,
        full_name,
        avatar_url,
      },
    });
  } catch (error) {
    console.error("Unexpected error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
