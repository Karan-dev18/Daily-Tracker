"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Initiates Google OAuth sign-in flow.
 * Called from client components (login/signup pages).
 */
export async function signInWithGoogle() {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Google OAuth error:", error.message);
  }
}
