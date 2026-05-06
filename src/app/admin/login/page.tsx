// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
        emailRedirectTo: `${window.location.origin}/admin/events`,
      },
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    setSent(true);
  };

  return (
    <main className="guest-screen items-center justify-center text-center gap-6">
      <Camera size={48} className="text-[var(--color-amber-500)]" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Host Login
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
        Enter your email to receive a magic link. No password needed.
      </p>

      {sent ? (
        <div className="bg-[var(--color-amber-50)] border border-[var(--color-amber-200)] rounded-xl p-4 max-w-xs">
          <p className="text-sm text-[var(--color-amber-700)]">
            Magic link sent! Check your email and click the link to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-base"
            required
            autoFocus
          />
          {error && (
            <p className="text-sm text-[var(--color-error)]" role="alert">
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