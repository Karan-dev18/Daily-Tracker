"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import { signInWithGoogle } from "@/lib/supabase/oauth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await login(formData);
    } catch {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8 fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-300/40 mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
            Daily Tracker
          </h1>
          <p className="text-pink-400 mt-2 text-sm font-medium">
            Your pink productivity companion ✨
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card-strong rounded-2xl p-8 fade-in-up delay-100">
          <h2 className="text-xl font-semibold text-pink-900 mb-6">
            Welcome back
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm">
              {decodeURIComponent(message)}
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            id="google-signin-btn"
            className="btn-outline w-full flex items-center justify-center gap-3 mb-6"
          >
            {isGoogleLoading ? (
              <div className="spinner border-pink-300 border-t-pink-600" />
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="divider-pink mb-6">or sign in with email</div>

          {/* Email/Password Form */}
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-pink-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="input-pink"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-pink-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                minLength={6}
                className="input-pink"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              id="login-submit-btn"
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Sign Up Link */}
        <p className="text-center mt-6 text-pink-400 text-sm fade-in-up delay-200">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-pink-600 font-semibold hover:text-pink-700 underline underline-offset-2 transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-mesh-gradient flex items-center justify-center">
          <div className="spinner border-pink-300 border-t-pink-600 w-8 h-8" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
