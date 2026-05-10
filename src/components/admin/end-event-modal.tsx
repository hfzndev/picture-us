// src/components/admin/end-event-modal.tsx
"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EndEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function EndEventModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: EndEventModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-950 p-6">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} className="text-rose-600" />
        </div>

        <div className="text-center">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-deep-shadow">
              End this event?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-whisper-gray mt-2">
            Guest access will be closed. Codes cannot be generated, activated,
            or used. This action is permanent.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary flex-1 bg-rose-600 border-rose-600 hover:bg-rose-700 hover:border-rose-700"
          >
            {loading ? "Ending..." : "Yes, End Event"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
