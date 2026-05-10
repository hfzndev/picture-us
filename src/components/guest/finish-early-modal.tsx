// src/components/guest/finish-early-modal.tsx
"use client";

interface FinishEarlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
  photosLeft: number;
}

export function FinishEarlyModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
  error,
  photosLeft,
}: FinishEarlyModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-midnight-canvas border border-whisper-gray/20 rounded-2xl p-6 max-w-xs w-full shadow-2xl">
        <h3 className="text-lg font-semibold text-frost-white text-center mb-2">
          End your session?
        </h3>
        {error ? (
          <p className="text-sm text-red-400 text-center mb-6">{error}</p>
        ) : (
          <p className="text-sm text-whisper-gray text-center mb-6">
            You still have {photosLeft} shot
            {photosLeft !== 1 ? "s" : ""} left.
            Your photos are saved — you'll get to leave a message.
          </p>
        )}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn-primary w-full mb-3"
        >
          {loading ? "Ending..." : "Yes, finish"}
        </button>
        <button
          onClick={() => {
            onOpenChange(false);
          }}
          disabled={loading}
          className="btn-secondary w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
