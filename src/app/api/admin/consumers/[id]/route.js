import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/Production/admin";
import { createServerSupabaseClient } from "@/lib/supabase/Production/server";
import { redis } from "@/lib/redis/redisConfig"; // optional — only if you configured Redis

// =========================================================
// DELETE  — Delete a user and their Supabase auth account
// =========================================================
export async function DELETE(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } =await params;

    if (!id) {
      return NextResponse.json({ error: "Consumer ID required" }, { status: 400 });
    }

    // // ✅ Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    

    // ✅ Delete user (auth + related)
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Optionally delete from your public tables too
    // await supabase.from("profiles").delete().eq("user_id", id);
    // await supabase.from("brands").delete().eq("owner_user_id", id);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =========================================================
// GET — Fetch full consumer (user) details
// =========================================================
export async function GET(request, { params }) {
  try {
    const { id } =await params;
    if (!id)
      return NextResponse.json({ error: "Consumer ID is required" }, { status: 400 });

    const supabase = await createServerSupabaseClient();

    // ✅ Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // ✅ Try cache first (Redis)
    // const cacheKey = `consumer:${id}:details`;
    // let cached = null;
    // if (redis) {
    //   cached = await redis.get(cacheKey);
    //   if (cached) {
    //     return NextResponse.json(JSON.parse(cached));
    //   }
    // }

    // ✅ Fetch user profile
    const { data: userProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();
  

    if (profileErr) throw profileErr;

    // ✅ Fetch brands owned by this user
    const { data: brands } = await supabase
      .from("brands")
      .select("*")
      .eq("owner_user_id", id);

    // ✅ For each brand, fetch analysis, content_calendar, etc.
    const brandIds = brands?.map((b) => b.id) || [];

    const [{ data: analyses }, { data: calendars }, { data: socialAccounts }] =
      await Promise.all([
        supabase.from("analysis").select("*").in("brand_id", brandIds),
        supabase.from("content_calendar").select("*").in("brand_id", brandIds),
        supabase.from("social_accounts").select("*").in("brand_id", brandIds),
      ]);

    const fullUserDetail = {
      userProfile,
      brands,
      analyses,
      calendars,
      socialAccounts,
    };

    // ✅ Cache result if Redis is available
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(fullUserDetail), "EX", 60 * 5); // cache 5 mins
    }

    return NextResponse.json(fullUserDetail);
  } catch (error) {
    console.error("Error getting consumer details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
