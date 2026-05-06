// src/app/admin/gallery/[eventId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Download, MessageSquareHeart, Image as ImageIcon } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  url?: string;
}

interface Message {
  id: string;
  body: string;
  created_at: string;
}

type Tab = "photos" | "messages";

export default function GalleryPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("photos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    async function load() {
      const { data: event } = await supabase
        .from("events")
        .select("name")
        .eq("id", eventId)
        .single();

      if (event) setEventName(event.name);

      // Load photos
      const { data: photoData } = await supabase
        .from("photos")
        .select("id, storage_path, caption, taken_at")
        .eq("event_id", eventId)
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

      // Load messages
      const { data: msgData } = await supabase
        .from("messages")
        .select("id, body, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (msgData) setMessages(msgData);

      setLoading(false);
    }

    load();
  }, [eventId, supabase]);

  // Subscribe to realtime photo inserts
  useEffect(() => {
    const channel = supabase
      .channel(`photos-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const newPhoto = payload.new as Photo;
          const { data: urlData } = await supabase.storage
            .from("photos")
            .createSignedUrl(newPhoto.storage_path, 3600);

          setPhotos((prev) => [
            {
              ...newPhoto,
              url: urlData?.signedUrl || "",
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, supabase]);

  // Subscribe to realtime message inserts
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as Message, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, supabase]);

  const downloadPhoto = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <main className="admin-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/admin/events")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--color-amber-50)]"
        >
          <ArrowLeft size={20} className="text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {eventName || "Gallery"}
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("photos")}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "photos"
              ? "bg-[var(--color-amber-500)] text-white"
              : "bg-white text-[var(--color-text-secondary)] shadow-sm"
          }`}
        >
          <ImageIcon size={16} />
          Photos ({photos.length})
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "messages"
              ? "bg-[var(--color-amber-500)] text-white"
              : "bg-white text-[var(--color-text-secondary)] shadow-sm"
          }`}
        >
          <MessageSquareHeart size={16} />
          Messages ({messages.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-[var(--color-amber-100)] rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : tab === "photos" ? (
        photos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon
              size={48}
              className="text-[var(--color-text-muted)] mx-auto mb-4"
              strokeWidth={1.5}
            />
            <p className="text-[var(--color-text-secondary)]">
              No photos yet. Guest photos will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group overflow-hidden rounded-lg shadow-sm animate-fade-in-up"
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || "Event photo"}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-square bg-[var(--color-amber-100)] flex items-center justify-center">
                    <ImageIcon size={24} className="text-[var(--color-text-muted)]" />
                  </div>
                )}

                {/* Date stamp */}
                <span className="absolute bottom-1 right-1 text-[10px] font-[var(--font-mono)] text-[var(--color-amber-500)]">
                  {new Date(photo.taken_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => photo.url && downloadPhoto(photo.url)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg"
                    aria-label="Download photo"
                  >
                    <Download size={18} className="text-[var(--color-text-primary)]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : messages.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquareHeart
            size={48}
            className="text-[var(--color-text-muted)] mx-auto mb-4"
            strokeWidth={1.5}
          />
          <p className="text-[var(--color-text-secondary)]">
            No messages yet. Messages appear here after guests finish their photo roll.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white rounded-lg shadow-sm p-4 animate-fade-in-up"
            >
              <p className="text-lg font-[var(--font-hand)] text-[var(--color-text-primary)] leading-relaxed">
                {msg.body}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-[var(--font-mono)] mt-2">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}