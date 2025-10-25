import { createServerSupabaseClient } from "@/lib/supabase/Production/server";
import { createAdminClient } from "@/lib/supabase/Production/admin";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const supabase = await createServerSupabaseClient();

    // ✅ Check current session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify the current user is an admin (from your `user_profiles` table)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    // 🧭 Pagination parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    // 🧩 Fetch brands page
    const { data: brands, error: brandError, count } = await supabase
      .from("brands")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (brandError) throw brandError;

    // 🧩 Extract unique owner_user_ids for this page
    const ownerIds = [...new Set(brands.map((b) => b.owner_user_id))].filter(Boolean);

    // 🚀 Fetch only those users from auth
    const admin = createAdminClient();
    const ownerPromises = ownerIds.map((id) => admin.auth.admin.getUserById(id));
    const ownerResults = await Promise.all(ownerPromises);

    // 🧠 Map user_id -> email
    const ownersById = {};
    ownerResults.forEach((res) => {
      const authUser = res.data?.user;
      if (authUser) {
        ownersById[authUser.id] = { email: authUser.email };
      }
    });

    // 🧩 Merge email with brand info
    const brandsWithEmail = brands.map((b) => ({
      ...b,
      owner_email: ownersById[b.owner_user_id]?.email || null,
    }));

    return NextResponse.json({
      page,
      limit,
      total: count || 0,
      brands: brandsWithEmail,
    });
  } catch (error) {
    console.error("Error fetching brands with owner emails:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
