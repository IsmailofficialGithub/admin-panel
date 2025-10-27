// src/api/getAdminUsers.js
import { checkAdminAuth } from "../../middleware/checkAuth";
import { createClient } from "../../lib/supabase/Production/client";

export async function getAdminUsers() {
  try {
    const profile = await checkAdminAuth();
    // if (!profile) return { error: "Unauthorized" };
    // ✅ Get all non-consumer users
    const { data: users, error } = await createClient()
      .from("profiles")
      .select("*")
      .neq("role", "consumer")
      .order("created_at", { ascending: false })
      // .eq("role", "admin");
    if (error) return { error: error };

    return users;
  } catch (err) {
    console.error("getAdminUsers Error:", err);
    return { error: err };
  }
}
