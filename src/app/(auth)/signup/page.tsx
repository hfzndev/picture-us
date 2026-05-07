// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Camera } from "lucide-react";

export default function SignUpPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    const { error: oAuthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (oAuthError) {
      setError(oAuthError.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-frost-white px-6">
        <div className="card-admin w-full max-w-sm mx-auto px-8 py-10 flex flex-col items-center text-center gap-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-deep-shadow">
              Account created!
            </h2>
            <p className="text-sm text-whisper-gray">
              Please sign in to access your events
            </p>
          </div>
          <Link href="/admin/login" className="btn-primary w-full no-underline">
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-frost-white px-6">
      <div className="card-admin w-full max-w-sm mx-auto px-8 py-10 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <Link href="/" className="no-underline">
            <Camera
              size={32}
              className="text-deep-shadow hover:opacity-70 transition-opacity"
              strokeWidth={1.5}
            />
          </Link>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-deep-shadow">
              Create Account
            </h2>
            <p className="text-xs text-whisper-gray">
              Sign up to start creating events
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-admin"
            required
            disabled={loading}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-admin"
            required
            minLength={8}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-admin"
            required
            minLength={8}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-black/[0.08]" />
          <span className="text-xs text-whisper-gray">or continue with</span>
          <div className="flex-1 h-px bg-black/[0.08]" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-black/[0.12] bg-white text-deep-shadow text-sm font-medium hover:bg-black/[0.02] transition-colors disabled:opacity-50"
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
          Continue with Google
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-whisper-gray">
          Already have an account?{" "}
          <Link
            href="/admin/login"
            className="text-deep-shadow hover:opacity-70 transition-opacity font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}