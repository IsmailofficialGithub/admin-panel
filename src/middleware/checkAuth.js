import { createClient } from "../lib/supabase/Production/client";

export async function checkAdminAuth() {
  try {
    const supabase = createClient();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log("User not authenticated");
      return null;
    }
    
    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return null;
    }
    
    // Check if user has admin role
    if (profile?.role !== "admin") {
      console.log("User is not an admin");
      return null;
    }
    
    // Return the profile if user is admin
    return profile;
  } catch (error) {
    console.error("checkAdminAuth error:", error);
    return null;
  }
}
