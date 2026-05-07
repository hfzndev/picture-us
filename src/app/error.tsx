// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { Camera, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center text-center gap-6 px-6 bg-frost-white">
      <Camera size={48} className="text-black/15" strokeWidth={1.5} />
      <div>
        <h1 className="text-2xl font-bold text-deep-shadow">
          Something went wrong
        </h1>
        <p className="text-sm text-whisper-gray mt-2 max-w-xs">
          The photo didn't develop. Let's try again.
        </p>
      </div>
      <button onClick={reset} className="btn-primary">
        <RefreshCw size={16} />
        Try Again
      </button>
    </main>
  );
}