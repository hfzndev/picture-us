// src/components/admin/qr-code-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QrCodeModalData {
  eventId: string;
  name: string;
  guestUrl: string;
  receptionistUrl: string;
  qrDataUrl: string;
}

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: QrCodeModalData | null;
}

export function QrCodeModal({ open, onOpenChange, data }: QrCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-white border-zinc-200 text-zinc-950 p-8 text-center">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg text-deep-shadow text-center">
            {data?.name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-whisper-gray">Guest QR Code</p>

        {data && (
          <>
            <img
              src={data.qrDataUrl}
              alt="Event QR Code"
              className="mx-auto rounded-lg"
            />
            <p className="text-xs text-whisper-gray break-all font-mono">
              {data.guestUrl}
            </p>
            <div className="space-y-2.5 pt-4">
              <a
                href={data.qrDataUrl}
                download={`${data.name}-qr.png`}
                className="btn-primary block text-center no-underline text-sm"
              >
                Download QR
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(data.receptionistUrl);
                  alert("Receptionist link copied!");
                }}
                className="btn-ghost block w-full text-sm"
              >
                Copy Receptionist Link
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
