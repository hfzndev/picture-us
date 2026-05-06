// src/app/admin/receptionist/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Copy, Check } from "lucide-react";

function ReceptionistContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event") || "";
  const token = searchParams.get("token") || "";

  const [currentCode, setCurrentCode] = useState("");
  const [codesUsed, setCodesUsed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Set receptionist token cookie
    if (token) {
      document.cookie = `receptionist_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }

    // Load event
    if (eventId && token) {
      fetch(`/api/codes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
        // Let cookie pass naturally
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setEventName(d.data.eventName);
        })
        .catch(() => {});
    }
  }, [eventId, token]);

  const generateCode = async () => {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      const json = await res.json();

      if (json.success) {
        setCurrentCode(json.data.displayFormat);
        setCodesUsed((prev) => prev + 1);
        setCopied(false);
      } else {
        setError(json.error === "INVALID_RECEPTIONIST_TOKEN" 
          ? "Invalid or expired receptionist link. Please ask the host for a new link." 
          : "Failed to generate code. Try again.");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!currentCode) return;
    await navigator.clipboard.writeText(currentCode.replace("-", ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="guest-screen items-center text-center gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <Camera size={40} className="text-[var(--color-amber-500)]" strokeWidth={1.5} />
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {eventName || "Event"}
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">Receptionist Panel</p>
      </div>

      {/* Code Card */}
      <div
        className={`bg-white rounded-2xl shadow-lg p-8 w-full cursor-pointer transition-all ${
          currentCode ? "hover:shadow-xl" : ""
        }`}
        onClick={copyCode}
      >
        {currentCode ? (
          <>
            <p className="text-4xl font-bold text-[var(--color-amber-600)] font-[var(--font-mono)] tracking-wider">
              {currentCode}
            </p>
            <div className="flex items-center justify-center gap-1 mt-3 text-sm text-[var(--color-text-muted)]">
              {copied ? (
                <>
                  <Check size={14} className="text-[var(--color-success)]" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Tap to copy
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold text-[var(--color-text-muted)] font-[var(--font-mono)] tracking-wider opacity-30">
              — — — — — —
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-3">
              Tap the button to generate a guest code
            </p>
          </>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-secondary)]">
        Show this to the next guest
      </p>

      {error && (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      {/* Generate Button */}
      <button
        onClick={generateCode}
        disabled={generating}
        className="btn-primary w-full"
      >
        {generating ? "Generating..." : "→ Next Guest Code"}
      </button>

      {/* Stats */}
      <p className="text-sm text-[var(--color-text-muted)] font-[var(--font-mono)]">
        Codes used: {codesUsed}
      </p>
    </main>
  );
}

export default function ReceptionistPage() {
  return (
    <Suspense
      fallback={
        <main className="guest-screen items-center justify-center">
          <p className="text-[var(--color-text-muted)]">Loading...</p>
        </main>
      }
    >
      <ReceptionistContent />
    </Suspense>
  );
}