import { createServerSupabaseClient } from "@/lib/supabase/Development/server";
import { NextResponse } from "next/server";

// 🔧 Helper: Check if the user is admin
async function isAdmin(supabase, userId) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return profile?.role === "admin";
}

// 🔧 Helper: Check if brand belongs to user
async function isBrandOwner(supabase, brandId, userId) {
  const { data: brand } = await supabase
    .from("brands")
    .select("owner_user_id")
    .eq("id", brandId)
    .maybeSingle();

  return brand?.owner_user_id === userId;
}

// 🗑️ DELETE — admin can delete any, user can delete own
export async function DELETE(req, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await isAdmin(supabase, user.id);
    const owner = await isBrandOwner(supabase, id, user.id);

    if (!admin && !owner) {
      return NextResponse.json(
        { error: "Forbidden: Not allowed to delete this brand" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("brands").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✏️ PUT — admin can update any, user can update own
export async function PUT(req, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = params;
    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await isAdmin(supabase, user.id);
    const owner = await isBrandOwner(supabase, id, user.id);

    if (!admin && !owner) {
      return NextResponse.json(
        { error: "Forbidden: Not allowed to edit this brand" },
        { status: 403 }
      );
    }

    const updateData = {
      name: body.name,
      website_url: body.website_url,
      niche: body.niche,
      target_market: body.target_market,
      timezone: body.timezone,
      brand_colors: body.brand_colors,
      logo: body.logo,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedBrand, error } = await supabase
      .from("brands")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Brand updated successfully",
      data: updatedBrand,
    });
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const supabase = await createServerSupabaseClient();

    // ✅ Validate session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // ✅ Check permissions
    const [admin, owner] = await Promise.all([
      isAdmin(supabase, userId),
      isBrandOwner(supabase, id, userId),
    ]);

    if (!admin && !owner) {
      return NextResponse.json(
        { error: "Forbidden: Admin or owner access required" },
        { status: 403 }
      );
    }

    // ✅ Fetch brand data
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (brandError || !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // ✅ Fetch owner email from auth.users using admin client
    const adminClient = createAdminClient();
    const { data: ownerData } = await adminClient.auth.admin.getUserById(
      brand.owner_user_id
    );

    // ✅ Combine and send
    const response = {
      ...brand,
      owner_email: ownerData?.user?.email || null,
    };

    return NextResponse.json({ brand: response }, { status: 200 });
  } catch (error) {
    console.error("Error fetching brand:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



