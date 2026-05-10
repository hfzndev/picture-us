// src/components/admin/print-sheet-modal.tsx
"use client";

import { Printer, Scissors } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BatchCodeResult {
  code: string;
  displayFormat: string;
}

interface PrintSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchResult: {
    codes: BatchCodeResult[];
    eventName: string;
  } | null;
  onPrint: () => void;
}

export function PrintSheetModal({
  open,
  onOpenChange,
  batchResult,
  onPrint,
}: PrintSheetModalProps) {
  if (!batchResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print:hidden sm:max-w-lg bg-white border-zinc-200 text-zinc-950 p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold text-deep-shadow">
            Codes — {batchResult.eventName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-whisper-gray shrink-0 mt-2">
          {batchResult.codes.length} codes generated. Print and cut along the
          dashed lines.
        </p>

        {/* Code grid preview */}
        <div className="overflow-y-auto flex-1 my-4 px-1">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {batchResult.codes.map((c, i) => (
              <div
                key={i}
                className="border border-dashed border-black/15 rounded-lg p-2 text-center"
              >
                <p className="text-xs font-bold font-mono text-deep-shadow tracking-wider">
                  {c.displayFormat}
                </p>
                <p className="text-[9px] text-misty-gray mt-1 leading-tight">
                  {batchResult.eventName}
                </p>
                <Scissors
                  size={10}
                  className="text-misty-gray/30 mx-auto mt-1"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2 shrink-0">
          <button onClick={() => onOpenChange(false)} className="btn-ghost">
            Close
          </button>
          <button onClick={onPrint} className="btn-primary">
            <Printer size={15} /> Print Sheet
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
