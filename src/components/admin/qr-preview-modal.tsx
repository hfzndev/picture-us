// src/components/admin/qr-preview-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface QrPreviewModalProps {
  code: string;
  displayFormat: string;
  eventId: string;
  onClose: () => void;
}

export function QrPreviewModal({
  code,
  displayFormat,
  eventId,
  onClose,
}: QrPreviewModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const guestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/e/${eventId}?code=${code}`
      : "";

  useEffect(() => {
    if (!guestUrl) return;
    import("qrcode").then(({ default: QRCodeLib }) => {
      QRCodeLib.toDataURL(guestUrl, { width: 220, margin: 2 }).then(setQrUrl);
    });
  }, [guestUrl]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 flex flex-col items-center gap-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-misty-gray hover:text-deep-shadow transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="text-base font-semibold text-deep-shadow">QR Code</h2>

        <div className="bg-white rounded-xl border border-black/8 p-3 shadow-sm">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR Code" width={220} height={220} />
          ) : (
            <div className="w-[220px] h-[220px] bg-black/5 rounded animate-pulse" />
          )}
        </div>

        <p className="text-2xl font-bold font-mono tracking-widest text-deep-shadow">
          {displayFormat}
        </p>

        <p className="text-xs text-misty-gray text-center break-all px-2 leading-relaxed">
          {guestUrl}
        </p>

        {qrUrl && (
          <a
            href={qrUrl}
            download={`code-${displayFormat}.png`}
            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            <Download size={15} />
            Download QR
          </a>
        )}
      </div>
    </div>
  );
}
