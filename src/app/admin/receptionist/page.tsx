// src/app/admin/receptionist/page.tsx
"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

function ReceptionistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event") || "";
  const token = searchParams.get("token") || "";

  const supabase = createClient();

  const [currentCode, setCurrentCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [totalCodes, setTotalCodes] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");
  

  const fetchCodeCount = useCallback(async () => {
    if (!eventId) return;
    const { count } = await supabase
      .from("guest_codes")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    setTotalCodes(count ?? 0);
  }, [eventId, supabase]);

  useEffect(() => {
    if (token) {
      document.cookie = `receptionist_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }

    if (eventId && token) {
      fetch(`/api/codes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setEventName(d.data.eventName);
        })
        .catch(() => {});
    }

    fetchCodeCount();
  }, [eventId, token, fetchCodeCount]);

  // Generate QR data URL whenever currentCode changes
  useEffect(() => {
    if (!currentCode) { setQrUrl(""); return; }
    const raw = currentCode.replace("-", "");
    const url = `${window.location.origin}/e/${eventId}?code=${raw}`;
    import("qrcode").then(({ default: QRCodeLib }) => {
      QRCodeLib.toDataURL(url, { width: 160, margin: 1 }).then(setQrUrl);
    });
  }, [currentCode, eventId]);

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
        setCopied(false);
        fetchCodeCount();
      } else {
        setError(
          json.error === "INVALID_RECEPTIONIST_TOKEN"
            ? "Invalid or expired receptionist link. Please ask the host for a new link."
            : "Failed to generate code. Try again."
        );
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
    <main className="admin-screen py-16">

      {/* Page header */}
      <div className="text-left w-full mx-auto mb-10">
        <h1 className="text-2xl font-bold mb-4 text-deep-shadow uppercase">
          Code Generator
        </h1>
        <p className="text-whisper-gray text-sm">
          Generating codes for upcoming guest in this event. Tap <span className="font-bold">"Generate Code"</span> to generate new codes
        </p>
      </div>

      {/* Code Card */}
      <div
        className={`card-admin w-full min-h-80 max-w-lg mx-auto cursor-pointer transition-all duration-200 text-center ${
          currentCode ? "hover:border-black/20 hover:shadow-md" : ""
        }`}
        onClick={copyCode}
      >
        {currentCode ? (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-medium text-deep-shadow mb-2">Scan to join</h2>
            <div className="bg-white p-4 rounded-xl inline-block mb-2 shadow-sm border border-black/5">
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrUrl} alt="QR Code" width={160} height={160} />
              ) : (
                <div className="w-40 h-40 bg-black/5 rounded animate-pulse" />
              )}
            </div>
            
            <div className="w-full h-px bg-black/5 my-2" />
            
            <p className="text-sm text-whisper-gray mb-1">Or enter manual code</p>
            <p className="text-3xl font-bold text-deep-shadow font-mono tracking-widest">
              {currentCode}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-whisper-gray">
              {copied ? (
                <>
                  <Check size={14} className="text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Tap to copy
                </>
              )}
            </div>
          </div>
        ) : (
          <>
          <div className=" flex justify-center flex-col items-center">
            <p className="text-4xl font-bold text-black/10 font-mono tracking-[0.3em] select-none">
              — — &mdash; &mdash; &mdash; &mdash;
            </p>
            <p className="text-xs text-whisper-gray mt-3">
              Tap "Generate Code"
            </p>
          </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 max-w-xs" role="alert">
          {error}
        </p>
      )}

      {/* Generate Button */}
      <button
        onClick={generateCode}
        disabled={generating}
        className="btn-primary w-full mt-4 mb-2 max-w-md mx-auto"
      >
        {generating ? "Generating..." : "Generate Code"}
      </button>

      {/* Stats */}
      <p className="text-xs text-whisper-gray flex justify-center">
      Codes generated: {totalCodes ?? "—"}
      </p>
    </main>
  );
}

export default function ReceptionistPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-screen items-center text-center gap-8 py-16">
          <div className="text-left w-full max-w-sm mx-auto">
            <div className="h-7 w-40 bg-black/5 rounded animate-pulse" />
            <div className="h-4 w-32 mt-1 bg-black/5 rounded animate-pulse" />
          </div>
          <div className="card-admin w-full max-w-sm mx-auto animate-pulse">
            <div className="h-10 w-56 mx-auto bg-black/5 rounded" />
            <div className="h-4 w-20 mx-auto mt-3 bg-black/5 rounded" />
          </div>
          <div className="h-4 w-48 mx-auto bg-black/5 rounded animate-pulse" />
          <div className="h-12 w-full max-w-sm bg-black/5 rounded-full animate-pulse" />
        </main>
      }
    >
      <ReceptionistContent />
    </Suspense>
  );
}
