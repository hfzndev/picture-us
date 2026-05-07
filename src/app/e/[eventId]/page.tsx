// src/app/e/[eventId]/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, RefreshCw, MessageSquare, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import {
  generateDeviceFingerprint,
  formatCode,
  formatDateStamp,
  getPhotosRemaining,
} from "@/lib/utils";
import type { ApiResponse } from "@/lib/utils";

type GuestScreen = "code" | "camera" | "farewell" | "ended";

interface SessionData {
  sessionToken: string;
  sessionId: string;
  photosLeft: number;
  photoLimit: number;
  eventName: string;
}

export default function EventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const supabase = createClient();

  // Screen state
  const [screen, setScreen] = useState<GuestScreen>("code");

  // Code entry
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(""));
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Session
  const [session, setSession] = useState<SessionData | null>(null);
  const [eventName, setEventName] = useState("");

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [caption, setCaption] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Farewell
  const [message, setMessage] = useState("");
  const [messageSending, setMessageSending] = useState(false);

  // Load event info on mount
  useEffect(() => {
    async function loadEvent() {
      const { data: event } = await supabase
        .from("events")
        .select("name, photo_limit")
        .eq("id", eventId)
        .single();

      if (event) {
        setEventName(event.name);
      }
    }
    loadEvent();
  }, [eventId, supabase]);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
        setCameraError("");
      }

      // Check for multiple cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        setHasMultipleCameras(false);
      }
    } catch {
      setCameraError(
        "Camera access needed. Please allow camera permissions and refresh."
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (screen === "camera") {
      initCamera();
      return () => {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    }
  }, [screen, initCamera]);

  // Switch camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setCameraReady(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setTimeout(initCamera, 200);
  };

  // --- Code Entry Handlers ---
  const handleCodeDigit = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!char) return;

    const newDigits = [...codeDigits];
    newDigits[index] = char;
    setCodeDigits(newDigits);
    setCodeError("");

    // Auto-tab forward
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      const newDigits = [...codeDigits];
      if (codeDigits[index]) {
        newDigits[index] = "";
        setCodeDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = "";
        setCodeDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newDigits = [...codeDigits];
    for (let i = 0; i < Math.min(6, paste.length); i++) {
      newDigits[i] = paste[i];
    }
    setCodeDigits(newDigits);
    // Focus next empty or last
    const nextEmpty = newDigits.findIndex((d) => !d);
    if (nextEmpty >= 0 && nextEmpty < 6) {
      inputRefs.current[nextEmpty]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const submitCode = async () => {
    const rawCode = codeDigits.join("");
    if (rawCode.length !== 6) return;

    setCodeLoading(true);
    setCodeError("");

    const deviceFp = generateDeviceFingerprint();

    try {
      const res = await fetch("/api/codes/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode, eventId, deviceFp }),
      });

      const json: ApiResponse<SessionData> = await res.json();

      if (!json.success || !json.data) {
        setCodeError(json.error === "TOO_MANY_ATTEMPTS" ? "Too many attempts. Wait a moment." : "That code didn't work. Try again?");
        return;
      }

      // Store session
      localStorage.setItem("pictureus_token", json.data.sessionToken);
      localStorage.setItem("pictureus_session_id", json.data.sessionId);
      localStorage.setItem("pictureus_device_fp", deviceFp);

      setSession(json.data);
      setScreen("camera");
    } catch {
      setCodeError("Network error. Check your connection and try again.");
    } finally {
      setCodeLoading(false);
    }
  };

  const isCodeComplete = codeDigits.every((d) => d.length === 1);

  // --- Photo Capture ---
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing || isUploading) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0);

    // Apply retro filter: warmth + vignette
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Warm temperature shift (+10% red, -5% blue)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1);     // R
      data[i + 1] = data[i + 1];                    // G unchanged
      data[i + 2] = Math.max(0, data[i + 2] * 0.95); // B
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw date stamp
    const stamp = formatDateStamp();
    ctx.font = "14px 'Space Mono', monospace";
    ctx.fillStyle = "#F97316";
    ctx.shadowColor = "rgba(249, 115, 22, 0.3)";
    ctx.shadowBlur = 4;
    ctx.textAlign = "right";
    ctx.fillText(stamp, canvas.width - 16, canvas.height - 16);
    ctx.shadowBlur = 0;

    // Show preview
    setPreviewSrc(canvas.toDataURL("image/jpeg", 0.85));
    setIsCapturing(false);
  };

  const uploadPhoto = async () => {
    if (!previewSrc || !canvasRef.current || !session) return;
    setIsUploading(true);
    setUploadError("");

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
      });

      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");
      formData.append("sessionId", session.sessionId);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      const token = localStorage.getItem("pictureus_token");
      const deviceFp = localStorage.getItem("pictureus_device_fp");

      const res = await fetch("/api/photos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Device-FP": deviceFp || "",
        },
        body: formData,
      });

      const json: ApiResponse<{ photosLeft: number }> = await res.json();

      if (!json.success || !json.data) {
        if (json.error === "SESSION_INVALID") {
          setScreen("ended");
          return;
        }
        if (json.error === "QUOTA_EXCEEDED") {
          setScreen("farewell");
          return;
        }
        setUploadError("Upload failed. Try again.");
        return;
      }

      const photosLeft = json.data.photosLeft;
      setSession((prev) => prev ? { ...prev, photosLeft } : prev);
      setPreviewSrc(null);
      setCaption("");
      setShowCaption(false);

      if (photosLeft <= 0) {
        setScreen("farewell");
      }
    } catch {
      setUploadError("Network error. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const dismissPreview = () => {
    setPreviewSrc(null);
    setCaption("");
    setShowCaption(false);
  };

  // --- Farewell ---
  const sendMessage = async () => {
    if (!message.trim() || !session) return;

    setMessageSending(true);
    try {
      const token = localStorage.getItem("pictureus_token");
      const deviceFp = localStorage.getItem("pictureus_device_fp");

      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Device-FP": deviceFp || "",
        },
        body: JSON.stringify({ sessionId: session.sessionId, body: message.trim() }),
      });

      // Import confetti dynamically
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#F97316", "#FB923C", "#FED7AA", "#FEF3C7", "#22D3EE"],
        shapes: ["square", "circle"],
      });
    } catch {
      // Message failed silently — photos are already saved
    } finally {
      setMessageSending(false);
      setScreen("ended");
    }
  };

  // --- Reset session ---
  const handleDone = () => {
    localStorage.removeItem("pictureus_token");
    localStorage.removeItem("pictureus_session_id");
    localStorage.removeItem("pictureus_device_fp");
  };

  // ==================== RENDER ====================

  return (
    <main className="guest-screen">
      {screen === "code" && (
        <div className="flex flex-col items-center gap-8 flex-1 justify-center">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 animate-fade-in-up">
            <Camera size={48} className="text-[var(--color-amber-500)]" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] text-center">
              Welcome to <br />
              {eventName || "the Event"}
            </h1>
            <p className="text-base text-[var(--color-text-secondary)]">
              Ask the receptionist for your photo code
            </p>
          </div>

          {/* Code Input */}
          <div className="flex gap-2 animate-fade-in-up" onPaste={handleCodePaste}>
            {codeDigits.map((digit, i) => (
              <div key={i} className="flex items-center gap-0">
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeDigit(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className={`code-input ${codeError ? "border-[var(--color-error)]" : ""}`}
                  aria-label={`Code digit ${i + 1} of 6`}
                  autoFocus={i === 0}
                />
                {i === 2 && (
                  <span className="text-2xl font-bold text-[var(--color-text-muted)] mx-1 select-none">
                    —
                  </span>
                )}
              </div>
            ))}
          </div>

          {codeError && (
            <p className="text-sm text-[var(--color-error)] animate-shake" role="alert">
              {codeError}
            </p>
          )}

          <button
            onClick={submitCode}
            disabled={!isCodeComplete || codeLoading}
            className="btn-primary w-full max-w-xs"
          >
            {codeLoading ? "Checking..." : "Enter →"}
          </button>
        </div>
      )}

      {screen === "camera" && (
        <div className="flex flex-col flex-1 relative">
          {/* Shot counter */}
          <div className="absolute top-3 left-0 right-0 z-20 flex items-center justify-center gap-2 pointer-events-none">
            {session && Array.from({ length: session.photoLimit }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  i < session.photoLimit - session.photosLeft
                    ? "bg-[var(--color-amber-500)] scale-110"
                    : "bg-[var(--color-amber-200)]"
                }`}
              />
            ))}
            <span className="text-sm font-mono text-[var(--color-text-secondary)] ml-2">
              {session ? `${getPhotosRemaining(session.photoLimit - session.photosLeft, session.photoLimit)} of ${session.photoLimit}` : ""}
            </span>
          </div>

          {/* Viewfinder */}
          <div className="camera-viewfinder flex-1 mt-10 mb-4 relative">
            {cameraError ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                <Camera size={48} className="text-[var(--color-text-muted)]" strokeWidth={1.5} />
                <p className="text-white text-base">{cameraError}</p>
                <button onClick={initCamera} className="btn-secondary">
                  Try Again
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Upload error */}
            {uploadError && (
              <div className="absolute top-2 left-0 right-0 z-30 flex justify-center">
                <span className="bg-[var(--color-error)] text-white text-xs px-3 py-1 rounded-full">
                  {uploadError}
                </span>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-[var(--color-amber-500)] animate-pulse" />
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 pb-6 pt-2">
            {/* Switch camera */}
            <button
              onClick={switchCamera}
              className="w-10 h-10 rounded-full bg-[var(--color-paper-canvas)]/80 backdrop-blur-sm flex items-center justify-center"
              style={{ visibility: hasMultipleCameras ? "visible" : "hidden" }}
              aria-label="Switch camera"
            >
              <RefreshCw size={18} className="text-[var(--color-text-primary)]" />
            </button>

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              disabled={!cameraReady || isCapturing || isUploading}
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                border: "4px solid var(--color-amber-200)",
                backgroundColor: isCapturing ? "var(--color-amber-600)" : "var(--color-amber-500)",
                boxShadow: "0 0 60px rgba(251, 146, 60, 0.5)",
                opacity: !cameraReady || isUploading ? 0.5 : 1,
              }}
              aria-label="Take photo"
            >
              <Camera size={28} color="white" strokeWidth={2} />
            </button>

            {/* Caption toggle */}
            <button
              onClick={() => setShowCaption(true)}
              className="w-10 h-10 rounded-full bg-[var(--color-paper-canvas)]/80 backdrop-blur-sm flex items-center justify-center"
              aria-label="Add caption"
            >
              <MessageSquare size={18} className="text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Flash overlay */}
          {isCapturing && (
            <div className="fixed inset-0 z-50 bg-white pointer-events-none flash-overlay" />
          )}

          {/* Photo preview modal */}
          {previewSrc && (
            <div className="fixed inset-0 z-40 bg-black/80 flex flex-col items-center justify-center gap-4 p-4">
              <img
                src={previewSrc}
                alt="Preview"
                className="max-w-full max-h-[60vh] rounded-lg shadow-xl"
              />
              {showCaption && (
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a note to this photo..."
                  className="input-base max-w-sm"
                  maxLength={200}
                  autoFocus
                />
              )}
              <div className="flex gap-3">
                <button onClick={uploadPhoto} disabled={isUploading} className="btn-primary">
                  {isUploading ? "Developing..." : "Save & Upload"}
                </button>
                <button onClick={dismissPreview} className="btn-secondary">
                  Retake
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === "farewell" && (
        <div className="flex flex-col items-center gap-6 flex-1 justify-center animate-fade-in-up">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Your roll is full!
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] mt-2">
              {session?.photoLimit || 0} memories captured
            </p>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 300))}
            placeholder={`Leave a message for ${eventName || "the hosts"}...`}
            className="guestbook-textarea"
            rows={6}
          />
          <span className="text-xs text-[var(--color-text-muted)] -mt-4 self-end">
            {message.length}/300
          </span>

          <button
            onClick={sendMessage}
            disabled={messageSending}
            className="btn-primary w-full max-w-xs"
          >
            {messageSending ? "Sending..." : "✨ Send Message"}
          </button>

          <button
            onClick={() => setScreen("ended")}
            className="text-sm text-[var(--color-text-muted)] underline"
          >
            Skip for now →
          </button>
        </div>
      )}

      {screen === "ended" && (
        <div className="flex flex-col items-center gap-6 flex-1 justify-center text-center animate-fade-in-up" onLoad={handleDone}>
          <div className="w-48 h-48 flex items-center justify-center">
            <Heart size={80} className="text-[var(--color-amber-500)]" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Thank you for being <br />
            part of the memories!
          </h2>
          <p className="text-base text-[var(--color-text-secondary)] max-w-xs">
            Your photos have been saved to{" "}
            {eventName ? `${eventName}'s` : "the"} gallery.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-8">
            You can close this page
          </p>
        </div>
      )}
    </main>
  );
}