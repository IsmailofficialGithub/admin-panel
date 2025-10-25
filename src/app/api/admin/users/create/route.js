import { EmailTemplateUserCreated } from "@/lib/email/templete/EmailTempleteUserCreated";
import { createAdminClient } from "@/lib/supabase/Production/admin";
import { createServerSupabaseClient } from "@/lib/supabase/Production/server";
import { NextResponse } from "next/server";
import { transporter } from "@/lib/email/config/nodemailer/nodemailer";

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(user)

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
      console.log(profile)

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get request data
    const { email, password, full_name, role, phone } = await request.json();

    // Validate input
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "FullName , Email , password are required" },
        { status: 400 }
      );
    }

    // Create user using admin client
    const adminClient = createAdminClient();

    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        ...(phone ? { phone } : {}), // ✅ only include phone if it's defined
        user_metadata: {
          full_name: full_name || "",
        },
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Update user role in profiles table
    const { error: insertError } = await adminClient
      .from("profiles")
      .upsert([
        {
          user_id: newUser.user.id, // use the new auth user’s ID
          full_name,
          role: role || "user", // default role if not provided
          phone: phone || null,
          // email,
        },
      ]);

    if (insertError) {
      console.error("Error inserting profile:", insertError);
      return NextResponse.json(
        { error: "User created but profile insert failed" },
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

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: role || "user",
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
