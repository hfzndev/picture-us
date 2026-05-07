// src/app/admin/gallery/[eventId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/events")}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <ArrowLeft size={20} className="text-deep-shadow" />
          </button>
          <h1 className="text-xl font-bold text-deep-shadow">
            {eventName || "Gallery"}
          </h1>
        </div>
        <Link href="/" className="text-sm text-whisper-gray hover:text-deep-shadow transition-colors no-underline">
          picture-us
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab("photos")}
          className={`tab-admin ${tab === "photos" ? "active" : ""}`}
        >
          <ImageIcon size={15} />
          Photos ({photos.length})
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`tab-admin ${tab === "messages" ? "active" : ""}`}
        >
          <MessageSquareHeart size={15} />
          Messages ({messages.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-black/5 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : tab === "photos" ? (
        photos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon
              size={48}
              className="text-black/15 mx-auto mb-4"
              strokeWidth={1.5}
            />
            <p className="text-whisper-gray">
              No photos yet. Guest photos will appear here in real-time.
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
                    alt={photo.caption || "Event photo"}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center">
                    <ImageIcon size={24} className="text-black/20" />
                  </div>
                )}

                {/* Date stamp */}
                <span className="absolute bottom-2 right-2 text-[10px] font-mono text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                  {new Date(photo.taken_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                  <button
                    onClick={() => photo.url && downloadPhoto(photo.url)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg"
                    aria-label="Download photo"
                  >
                    <Download size={16} className="text-deep-shadow" />
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
            className="text-black/15 mx-auto mb-4"
            strokeWidth={1.5}
          />
          <p className="text-whisper-gray">
            No messages yet. Messages appear here after guests finish their photo roll.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="card-admin animate-fade-in-up"
            >
              <p className="text-base text-deep-shadow leading-relaxed">
                {msg.body}
              </p>
              <p className="text-xs text-whisper-gray font-mono mt-3">
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