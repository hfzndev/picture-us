// src/components/admin/batch-generate-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BatchGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName?: string;
  batchCount: number;
  setBatchCount: (count: number) => void;
  onGenerate: () => void;
  loading: boolean;
}

export function BatchGenerateModal({
  open,
  onOpenChange,
  eventName,
  batchCount,
  setBatchCount,
  onGenerate,
  loading,
}: BatchGenerateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-950 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-deep-shadow">
            Batch Generate Codes
          </DialogTitle>
        </DialogHeader>

        {eventName && <p className="text-sm text-whisper-gray">{eventName}</p>}

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-deep-shadow block mb-1.5">
              Number of codes (1-500)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={batchCount}
              onChange={(e) => setBatchCount(parseInt(e.target.value) || 50)}
              className="input-admin"
              autoFocus
            />
            <p className="text-xs text-misty-gray mt-1.5">
              Codes are valid for 24 hours. Guests enter them at the event QR
              page.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? `Generating ${batchCount} codes...`
              : `Generate ${batchCount} Codes`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
