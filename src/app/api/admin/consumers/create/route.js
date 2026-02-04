import { transporter } from "@/lib/email/config/nodemailer/nodemailer";
import EmailTemplateUserCreated from "@/lib/email/templete/EmailTempleteUserCreated";
import { createAdminClient } from "@/lib/supabase/Production/admin";
import { createServerSupabaseClient } from "@/lib/supabase/Production/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();


    // // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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


    // --- 3. Extract and validate request data ---
    const {
      email,
      password,
      full_name = "",
      avatar_url = "",
      phone = null,
    } = await request.json();

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
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }


    // --- 5. Insert profile record ---
  // --- 5. Insert or update profile record ---
const { error: profileError } = await adminClient
  .from("profiles")
  .upsert({
    user_id: newUser.user.id,
    full_name,
    phone,
    avatar_url,
    role: "consumer",
  });

if (profileError) {
  console.error("Profile insert/update error:", profileError);
  return NextResponse.json(
    { error: "Failed to insert or update user profile" },
    { status: 500 }
  );
}



    // if (insertError) {
    //   console.error("Profile insert error:", insertError);
    //   return NextResponse.json(
    //     { error: "Failed to insert user profile" },
    //     { status: 500 }
    //   );
    // }
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
