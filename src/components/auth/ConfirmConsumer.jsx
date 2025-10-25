"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/Development/client";

export default function ConfirmPage() {
  const supabase = createClient();
  const params = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Update user details
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError("Failed to update password: " + updateError.message);
        setSaving(false);
        return;
      }

      if (!updateError) {
        // ✅ Update user_profiles table
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ full_name: name })
          .eq("user_id", sessionUser.id); // or updatedUser.id if you have it

        if (profileError) {
          console.error("Profile update error:", profileError);
          setError("Failed to update name in profile: " + profileError.message);
          setSaving(false);
          return;
        }

        setSaved(true);
      }
    } catch (error) {
      console.log(error);
      setError("Failed to save account details.");
    } finally {
      setSaving(false);
      setSaved(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  };

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");

    if (!access_token || !refresh_token) {
      setError("Invalid confirmation link.");
      setLoading(false);
      return;
    }

    const confirmSession = async () => {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      console.log("User data:", data);

      if (error) {
        console.error(error);
        setError("Failed to confirm session.");
        setLoading(false);
        return;
      }

      setSessionUser(data.user);
      setMetadata(data.user?.user_metadata || {});
      setLoading(false);
    };

    confirmSession();
  }, [supabase]);

  // 🌀 Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-600">Confirming your account...</p>
      </div>
    );
  }

  // ⚠️ Error
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-xl shadow-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-3">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ✅ Show setup form
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <h2
          className="text-2xl font-semibold text-center mb-4"
          onClick={() => {
            console.log(sessionUser);
          }}
        >
          Complete Your Account Setup
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Welcome <strong>{sessionUser?.email}</strong>
        </p>

        {saved ? (
          <div className="text-center text-green-600 font-semibold">
            ✅ Account updated! Redirecting...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Create Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
            >
              {saving ? "Saving..." : "Save and Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
