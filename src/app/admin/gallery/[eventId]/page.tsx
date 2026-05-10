// src/app/admin/gallery/[eventId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ArrowLeft, Download, MessageSquareHeart, Image as ImageIcon, Archive, Trash2, LayoutGrid, List, Users, X, Clock } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  session_id: string;
  guest_name: string | null;
  url?: string;
}

interface Message {
  id: string;
  body: string;
  created_at: string;
  session_id: string;
  guest_name: string | null;
}

type Tab = "photos" | "messages";
type ViewMode = "grid" | "table" | "byGuest";

export default function GalleryPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const supabase = createClient();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("photos");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [trashingIds, setTrashingIds] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Load initial data
  useEffect(() => {
    async function load() {
      const { data: event } = await supabase
        .from("events")
        .select("name")
        .eq("id", eventId)
        .single();

      if (event) setEventName(event.name);

      // Load photos (only visible ones) with session info
      const { data: photoData } = await supabase
        .from("photos")
        .select(`
          id, 
          storage_path, 
          caption, 
          taken_at, 
          session_id,
          sessions(guest_name)
        `)
        .eq("event_id", eventId)
        .eq("is_visible", true)
        .order("taken_at", { ascending: false });

      if (photoData) {
        const withUrls = await Promise.all(
          photoData.map(async (p: any) => {
            const { data: urlData } = await supabase.storage
              .from("photos")
              .createSignedUrl(p.storage_path, 3600);

            return {
              ...p,
              guest_name: p.sessions?.guest_name || null,
              url: urlData?.signedUrl || "",
            };
          })
        );
        setPhotos(withUrls);
      }

      // Load messages with session info
      const { data: msgData } = await supabase
        .from("messages")
        .select(`
          id, 
          body, 
          created_at, 
          session_id,
          sessions(guest_name)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (msgData) {
        setMessages(
          msgData.map((m: any) => ({
            ...m,
            guest_name: m.sessions?.guest_name || null,
          }))
        );
      }

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
          const rawPhoto = payload.new as any;
          
          // Fetch guest name for the new photo
          const { data: session } = await supabase
            .from("sessions")
            .select("guest_name")
            .eq("id", rawPhoto.session_id)
            .single();

          const { data: urlData } = await supabase.storage
            .from("photos")
            .createSignedUrl(rawPhoto.storage_path, 3600);

          setPhotos((prev) => [
            {
              ...rawPhoto,
              guest_name: session?.guest_name || null,
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
        async (payload) => {
          const rawMsg = payload.new as any;
          
          // Fetch guest name
          const { data: session } = await supabase
            .from("sessions")
            .select("guest_name")
            .eq("id", rawMsg.session_id)
            .single();

          setMessages((prev) => [
            {
              ...rawMsg,
              guest_name: session?.guest_name || null,
            },
            ...prev,
          ] as Message[]);
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

  const handleTrash = async (photoId: string) => {
    setTrashingIds((prev) => new Set(prev).add(photoId));
    try {
      await fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: false }),
      });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      // Silently fail
    } finally {
      setTrashingIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export/photos?eventId=${eventId}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Export failed. Try again.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventName || "event"}-photos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Check your connection.");
    } finally {
      setExporting(false);
    }
  };

  const groupedByGuest = photos.reduce((acc, photo) => {
    const sId = photo.session_id;
    if (!acc[sId]) {
      acc[sId] = {
        guestName: photo.guest_name || "Anonymous",
        photos: [],
        messages: messages.filter((m) => m.session_id === sId),
      };
    }
    acc[sId].photos.push(photo);
    return acc;
  }, {} as Record<string, { guestName: string; photos: Photo[]; messages: Message[] }>);

  // Catch sessions with messages but NO photos
  messages.forEach((msg) => {
    if (!groupedByGuest[msg.session_id]) {
      groupedByGuest[msg.session_id] = {
        guestName: msg.guest_name || "Anonymous",
        photos: [],
        messages: messages.filter((m) => m.session_id === msg.session_id),
      };
    }
  });

  return (
    <main className="admin-screen">
      {/* Detail Popup */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
          <div className="relative bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-in">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col md:flex-row">
              <div className="md:w-3/5 bg-black flex items-center justify-center">
                <img
                  src={selectedPhoto.url}
                  alt="Full preview"
                  className="max-h-[70vh] object-contain"
                />
              </div>
              <div className="md:w-2/5 p-6 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-whisper-gray uppercase tracking-wider mb-1">Guest</h3>
                  <p className="text-xl font-bold text-deep-shadow">{selectedPhoto.guest_name || "Anonymous"}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-whisper-gray uppercase tracking-wider mb-1">Time</h3>
                  <div className="flex items-center gap-2 text-deep-shadow">
                    <Clock size={16} />
                    <span>
                      {new Date(selectedPhoto.taken_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {selectedPhoto.caption && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-whisper-gray uppercase tracking-wider mb-1">Caption</h3>
                    <p className="text-deep-shadow italic">"{selectedPhoto.caption}"</p>
                  </div>
                )}

                <div className="mt-auto flex gap-2 pt-6 border-t border-black/5">
                  <button
                    onClick={() => selectedPhoto.url && downloadPhoto(selectedPhoto.url)}
                    className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Download
                  </button>
                  <button
                    onClick={() => {
                      handleTrash(selectedPhoto.id);
                      setSelectedPhoto(null);
                    }}
                    className="p-2.5 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push(`/admin/events/${eventId}`)}
        className="flex items-center gap-1.5 text-sm text-whisper-gray hover:text-deep-shadow transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-deep-shadow">
          {eventName || "Gallery"}
        </h1>
        {tab === "photos" && photos.length > 0 && (
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="btn-ghost text-sm"
          >
            <Archive size={15} />
            {exporting ? `Zipping ${photos.length} photos...` : "Download All"}
          </button>
        )}
      </div>

      {/* Tab bar & View modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex gap-2">
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

        {tab === "photos" && photos.length > 0 && (
          <div className="flex items-center gap-1 bg-black/5 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid" ? "bg-white shadow-sm text-deep-shadow" : "text-whisper-gray hover:text-deep-shadow"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table" ? "bg-white shadow-sm text-deep-shadow" : "text-whisper-gray hover:text-deep-shadow"
              }`}
              title="Table View"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode("byGuest")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "byGuest" ? "bg-white shadow-sm text-deep-shadow" : "text-whisper-gray hover:text-deep-shadow"
              }`}
              title="Group by Guest"
            >
              <Users size={18} />
            </button>
          </div>
        )}
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
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group overflow-hidden rounded-xl bg-black/5 animate-fade-in-up cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || "Event photo"}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center">
                    <ImageIcon size={24} className="text-black/20" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrash(photo.id);
                      }}
                      disabled={trashingIds.has(photo.id)}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-lg text-rose-600 hover:bg-white shadow-sm transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        photo.url && downloadPhoto(photo.url);
                      }}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-lg text-deep-shadow hover:bg-white shadow-sm transition-colors"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                  
                  <div className="text-white">
                    <p className="text-xs font-bold truncate">{photo.guest_name || "Anonymous"}</p>
                    <p className="text-[10px] opacity-80 font-mono">
                      {new Date(photo.taken_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "table" ? (
          <div className="bg-white rounded-xl border border-black/5 overflow-hidden shadow-sm animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black/[0.02] border-b border-black/5">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray">Photo</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray">Guest</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray hidden md:table-cell">Caption</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray">Time</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {photos.map((photo) => (
                    <tr key={photo.id} className="hover:bg-black/[0.01] transition-colors group">
                      <td className="px-4 py-3">
                        <div 
                          className="w-12 h-12 rounded-lg overflow-hidden bg-black/5 cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img src={photo.url} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-deep-shadow">{photo.guest_name || "Anonymous"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-whisper-gray italic">
                          {photo.caption ? `"${photo.caption}"` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-whisper-gray">
                          {new Date(photo.taken_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => photo.url && downloadPhoto(photo.url)}
                            className="p-1.5 text-whisper-gray hover:text-deep-shadow transition-colors"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleTrash(photo.id)}
                            className="p-1.5 text-whisper-gray hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in">
            {Object.entries(groupedByGuest).map(([sId, group]) => (
              <div key={sId} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-black/5 pb-2">
                  <div className="w-8 h-8 rounded-full bg-deep-shadow flex items-center justify-center text-white text-xs font-bold">
                    {group.guestName.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-lg font-bold text-deep-shadow">{group.guestName}</h2>
                  <span className="text-xs font-medium text-whisper-gray bg-black/5 px-2 py-0.5 rounded-full">
                    {group.photos.length} photos
                  </span>
                </div>

                {group.photos.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {group.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-lg overflow-hidden bg-black/5 cursor-pointer shadow-sm"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img src={photo.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <LayoutGrid size={20} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-whisper-gray italic">No photos taken yet.</p>
                )}

                {group.messages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {group.messages.map((m) => (
                      <div key={m.id} className="p-3 bg-misty-gray/20 rounded-lg text-sm text-deep-shadow italic border-l-4 border-deep-shadow/20">
                        "{m.body}"
                        <div className="text-[10px] text-whisper-gray mt-1 not-italic font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              className="card-admin animate-fade-in-up group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-whisper-gray uppercase tracking-wider group-hover:text-deep-shadow transition-colors">
                  {msg.guest_name || "Anonymous"}
                </span>
                <span className="text-[10px] text-whisper-gray font-mono">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-base text-deep-shadow leading-relaxed italic">
                "{msg.body}"
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}