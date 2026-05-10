// src/app/admin/recycle-bin/[eventId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { EmptyBinModal } from "@/components/admin/empty-bin-modal";
import {
  ArrowLeft,
  Trash2,
  Undo2,
} from "lucide-react";

interface TrashedPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  url: string;
}

export default function RecycleBinPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const supabase = createClient();
  const router = useRouter();

  const [photos, setPhotos] = useState<TrashedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptying, setEmptying] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  // Load trashed photos
  useEffect(() => {
    async function load() {
      const { data: photoData } = await supabase
        .from("photos")
        .select("id, storage_path, caption, taken_at")
        .eq("event_id", eventId)
        .eq("is_visible", false)
        .order("taken_at", { ascending: false });

      if (photoData) {
        const withUrls = await Promise.all(
          photoData.map(async (p) => {
            const { data: urlData } = await supabase.storage
              .from("photos")
              .createSignedUrl(p.storage_path, 3600);

            return {
              ...p,
              url: urlData?.signedUrl || "",
            };
          })
        );
        setPhotos(withUrls);
      }
      setLoading(false);
    }
    load();
  }, [eventId, supabase]);

  const handleRestore = async (photoId: string) => {
    setRestoringIds((prev) => new Set(prev).add(photoId));
    try {
      await fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: true }),
      });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      // Silently fail
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const handleDelete = async (photoId: string) => {
    setDeletingIds((prev) => new Set(prev).add(photoId));
    try {
      await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      // Silently fail
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const handleEmptyBin = async () => {
    setEmptying(true);
    try {
      await fetch(`/api/photos/trash?eventId=${eventId}`, {
        method: "DELETE",
      });
      setPhotos([]);
      setShowEmptyConfirm(false);
    } catch {
      // Silently fail
    } finally {
      setEmptying(false);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="admin-screen">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/events/${eventId}`)}
        className="flex items-center gap-1.5 text-sm text-whisper-gray hover:text-deep-shadow transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-deep-shadow">Recycle Bin</h1>
          <p className="text-sm text-whisper-gray mt-1">
            Photos you trash from the gallery appear here
          </p>
        </div>
        {photos.length > 0 && (
          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="btn-ghost text-sm text-rose-600 border-rose-300 hover:border-rose-400"
          >
            <Trash2 size={15} />
            Empty Bin
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-black/5 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20">
          <Trash2
            size={56}
            className="text-black/10 mx-auto mb-5"
            strokeWidth={1.5}
          />
          <h2 className="text-xl font-semibold text-deep-shadow mb-2">
            Recycle bin is empty
          </h2>
          <p className="text-whisper-gray max-w-sm mx-auto">
            Photos you trash from the gallery will appear here.
            {' '}
            <button
              onClick={() => router.push(`/admin/gallery/${eventId}`)}
              className="text-deep-shadow underline font-medium"
            >
              Go to gallery
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group overflow-hidden rounded-lg bg-black/5 animate-fade-in-up"
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.caption || "Trashed photo"}
                  className="w-full aspect-square object-cover opacity-60"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-black/5">
                  <Trash2 size={24} className="text-black/20" />
                </div>
              )}

              {/* Trashed badge */}
              <span className="absolute top-2 left-2 text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                Trashed
              </span>

              {/* Time stamp */}
              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-white/60 bg-black/40 px-1.5 py-0.5 rounded">
                {formatTime(photo.taken_at)}
              </span>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center gap-2">
                <button
                  onClick={() => handleRestore(photo.id)}
                  disabled={restoringIds.has(photo.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg"
                  aria-label="Restore photo"
                  title="Restore"
                >
                  <Undo2 size={16} className="text-emerald-600" />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deletingIds.has(photo.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg"
                  aria-label="Delete permanently"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-rose-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty Bin Confirmation Modal */}
      <EmptyBinModal
        open={showEmptyConfirm}
        onOpenChange={setShowEmptyConfirm}
        onConfirm={handleEmptyBin}
        loading={emptying}
        photoCount={photos.length}
      />
    </main>
  );
}