// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Mail, Camera } from "lucide-react";

export default function SignUpPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
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
        <h2 className="text-lg font-semibold text-deep-shadow">
          Create Account
        </h2>
        <p className="text-xs text-whisper-gray">
          Enter your email to receive a magic link. No password needed.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs text-red-600 text-center">{error}</p>
        </div>
      )}

      {/* Form */}
      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <p className="text-sm text-deep-shadow">
            Magic link sent! Check your email and click the link to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-admin text-center"
            required
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Sending link..." : "Send Magic Link"}
          </button>
        </form>
      )}

      {/* Footer link */}
      <p className="text-center text-xs text-whisper-gray">
        Already have an account?{" "}
        <Link
          href="/admin/login"
          className="text-deep-shadow hover:opacity-70 transition-opacity"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}