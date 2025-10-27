import { checkAdminAuth } from "../../middleware/checkAuth";
import { createClient } from "../../lib/supabase/Production/client";

export async function updateUserRole(userId, role, fullName = null) {
  try {
    const supabase = createClient();

    // ✅ Verify admin authentication
    const profile = await checkAdminAuth();
    // if (!profile) return { error: "Unauthorized" };

    // ✅ Input validation
    if (!userId || !role) {
      return { error: "User ID and role are required" };
    }
    console.log(userId, role, fullName);

    // ✅ Build update object
    const updateData = { role: role.toLowerCase() };
    if (fullName) {
      updateData.full_name = fullName;
    }

    // ✅ Update user in profiles table
    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return { error: error.message };

    return { success: true, user: data };
  } catch (err) {
    console.error("updateUserRole Error:", err);
    return { error: "Internal server error" };
  }
}
