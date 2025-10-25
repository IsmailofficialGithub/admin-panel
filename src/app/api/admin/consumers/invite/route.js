import { createAdminClient } from "@/lib/supabase/Development/admin";
import { createServerSupabaseClient } from "@/lib/supabase/Development/server";
import { NextResponse } from "next/server";

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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get request data
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if user already exists
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Step 1: Invite user (creates in Authentication tab ONLY)
    const { data, error: sendError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_API_URL}/auth/consumer/confirm/`,
        data: {
          user_type: 'consumer',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        }
      });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 400 });
    }

    const invitedUser = data?.user;
    
    if (!invitedUser) {
      return NextResponse.json(
        { error: "Failed to invite user" },
        { status: 500 }
      );
    }

    // Step 2: Manually create in profiles table ONLY
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: invitedUser.id,
        email:email,
        full_name: null,
        avatar_url: null,
      });

    if (profileError) {
      console.error("⚠️ Failed to create profile:", profileError);
      
      // Rollback: delete the invited user from authentication
      await adminClient.auth.admin.deleteUser(invitedUser.id);
      
      return NextResponse.json(
        { error: "Failed to create consumer profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Consumer invitation sent successfully",
      data: {
        user_id: invitedUser.id,
        email: invitedUser.email,
      }
    });

  } catch (error) {
    console.error("Error inviting consumer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}