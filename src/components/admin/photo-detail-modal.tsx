// src/components/admin/photo-detail-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Download, Trash2 } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  session_id: string;
  guest_name: string | null;
  url?: string;
}

interface PhotoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photo: Photo | null;
  onDownload: (url: string) => void;
  onTrash: (id: string) => void;
}

export function PhotoDetailModal({
  open,
  onOpenChange,
  photo,
  onDownload,
  onTrash,
}: PhotoDetailModalProps) {
  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border-zinc-200 text-zinc-950 p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-3/5 bg-black flex items-center justify-center min-h-[300px]">
            <img
              src={photo.url}
              alt="Full preview"
              className="max-h-[70vh] object-contain"
            />
          </div>
          <div className="md:w-2/5 p-6 flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-sm font-medium text-whisper-gray uppercase tracking-wider mb-1">
                Guest
              </DialogTitle>
              <p className="text-xl font-bold text-deep-shadow">
                {photo.guest_name || "Anonymous"}
              </p>
            </DialogHeader>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-whisper-gray uppercase tracking-wider mb-1">
                Time
              </h3>
              <div className="flex items-center gap-2 text-deep-shadow">
                <Clock size={16} />
                <span>
                  {new Date(photo.taken_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {photo.caption && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-whisper-gray uppercase tracking-wider mb-1">
                  Caption
                </h3>
                <p className="text-deep-shadow italic">"{photo.caption}"</p>
              </div>
            )}

            <div className="mt-auto flex gap-2 pt-6 border-t border-black/5">
              <button
                onClick={() => photo.url && onDownload(photo.url)}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download
              </button>
              <button
                onClick={() => {
                  onTrash(photo.id);
                  onOpenChange(false);
                }}
                className="p-2.5 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
