// src/components/admin/empty-bin-modal.tsx
"use client";

import { AlertTriangle, X } from "lucide-react";

interface EmptyBinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  photoCount: number;
}

export function EmptyBinModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
  photoCount,
}: EmptyBinModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
          <AlertTriangle size={20} className="text-rose-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-deep-shadow">
            Empty recycle bin?
          </h3>
          <p className="text-sm text-whisper-gray mt-1">
            This will permanently delete {photoCount} photo
            {photoCount !== 1 ? "s" : ""}. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="btn-ghost flex-1"
          >
            <X size={15} /> Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary flex-1 bg-rose-500 hover:bg-rose-600"
          >
            {loading ? "Deleting..." : "Empty Bin"}
          </button>
        </div>
      </div>
    </div>
  );
}
