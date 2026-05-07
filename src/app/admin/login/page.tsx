// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { Camera } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error: loginError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    setSent(true);
  };

  return (
    <main className="admin-screen items-center justify-center text-center gap-6 py-24">
      <Link href="/" className="no-underline">
        <Camera
          size={40}
          className="text-deep-shadow hover:opacity-70 transition-opacity"
          strokeWidth={1.5}
        />
      </Link>
      <h1 className="text-2xl font-bold text-deep-shadow">Host Login</h1>
      <p className="text-sm text-whisper-gray max-w-xs">
        Enter your email to receive a magic link. No password needed.
      </p>

      {sent ? (
        <div className="card-admin max-w-xs text-center border-green-200">
          <p className="text-sm text-deep-shadow">
            Magic link sent! Check your email and click the link to continue.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 w-full max-w-xs"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-admin text-center"
            required
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full">
            Send Magic Link
          </button>
        </form>
      )}
    </main>
  );
}