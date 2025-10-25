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
    const { email, metadata } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Email are required" },
        { status: 400 }
      );
    }

    // Create user using admin client
    const adminClient = createAdminClient();
    if (!metadata.role) {
      metadata.role = "user";
    }
    const { data, error: sendError } =
      await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_API_URL}/auth/user/confirm/`,
        },
        {
          data: metadata, // ✅ this becomes user_metadata
        }
      );

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 400 });
    }

    const invitedUser = data?.user;
    if (invitedUser) {
      const { id, email: invitedEmail } = invitedUser;

      // Create or update user profile
      const { error: profileError } = await adminClient
        .from("user_profiles")
        .upsert(
          {
            id,
            email: invitedEmail,
            role: metadata.role || "user",
            // department: metadata.department || null,
            // invited_by: metadata.invited_by || null,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error("⚠️ Failed to create profile:", profileError);
        // We don’t throw — invite was still sent
      }
    }
    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
