import { createServerSupabaseClient } from "@/lib/supabase/Production/server";
import { NextResponse } from "next/server";

export async function GET(request) {
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
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get all users
    const { data: users, error } = await supabase
      .from("auth_role_with_profiles")
      .select("*")
      .neq("role", "consumer")
      .order("created_at", { ascending: false });


    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
