// src/app/admin/gallery/[eventId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ArrowLeft, Download, MessageSquareHeart, Image as ImageIcon, Archive, Trash2, LayoutGrid, List, X, Clock, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
type ViewMode = "grid" | "table";

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
  const [expandedGuests, setExpandedGuests] = useState<Set<string>>(new Set());

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

  const downloadAllPhotos = async (photosToDownload: Photo[]) => {
    for (const photo of photosToDownload) {
      if (photo.url) {
        // We trigger downloads sequentially to avoid browser blocking multiple popups
        const link = document.createElement("a");
        link.href = photo.url;
        link.download = `photo-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay to help browser handle multiple downloads
        await new Promise(r => setTimeout(r, 100));
      }
    }
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
        sessionId: sId,
        guestName: photo.guest_name || "Anonymous",
        photos: [],
        messages: messages.filter((m) => m.session_id === sId),
      };
    }
    acc[sId].photos.push(photo);
    return acc;
  }, {} as Record<string, { sessionId: string; guestName: string; photos: Photo[]; messages: Message[] }>);

  // Catch sessions with messages but NO photos
  messages.forEach((msg) => {
    if (!groupedByGuest[msg.session_id]) {
      groupedByGuest[msg.session_id] = {
        sessionId: msg.session_id,
        guestName: msg.guest_name || "Anonymous",
        photos: [],
        messages: messages.filter((m) => m.session_id === msg.session_id),
      };
    }
  });

  const toggleGuestExpansion = (sessionId: string) => {
    setExpandedGuests(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  return (
    <main className="admin-screen">
      {/* Detail Popup */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-2xl bg-white border-zinc-200 text-zinc-950 p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="flex flex-col md:flex-row">
              <div className="md:w-3/5 bg-black flex items-center justify-center min-h-[300px]">
                <img
                  src={selectedPhoto.url}
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
                    {selectedPhoto.guest_name || "Anonymous"}
                  </p>
                </DialogHeader>

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
          )}
        </DialogContent>
      </Dialog>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-deep-shadow uppercase">
          Gallery of {eventName || "Gallery"}
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
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray">Photos</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray">Guest</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray hidden md:table-cell">Latest Caption</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-whisper-gray">Earliest Time</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {Object.values(groupedByGuest).map((group) => {
                    const isExpanded = expandedGuests.has(group.sessionId);
                    const firstPhoto = group.photos[0];
                    const earliestPhoto = [...group.photos].sort((a, b) => 
                      new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
                    )[0];

                    return (
                      <React.Fragment key={group.sessionId}>
                        {/* Collapsed Row */}
                        <tr 
                          className={`hover:bg-black/[0.01] transition-colors group cursor-pointer ${isExpanded ? 'bg-black/[0.02] border-l-4 border-l-amber-400' : ''}`}
                          onClick={() => toggleGuestExpansion(group.sessionId)}
                        >
                          <td className="px-4 py-4">
                            {!isExpanded ? (
                              <div className="flex items-center gap-2">
                                {group.photos.length > 0 ? (
                                  <>
                                    <div className="flex -space-x-6">
                                      {group.photos.slice(0, 2).map((photo, idx) => (
                                        <div 
                                          key={photo.id}
                                          className="w-20 h-20 rounded-xl border-4 border-white overflow-hidden bg-black/5 shadow-md transition-transform group-hover:scale-105"
                                          style={{ zIndex: 2 - idx }}
                                        >
                                          <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                      ))}
                                    </div>
                                    {group.photos.length > 2 && (
                                      <span className="text-xs font-black text-deep-shadow bg-amber-100 border border-amber-200 px-2 py-1 rounded-full ml-1 shadow-sm">
                                        +{group.photos.length - 2}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-black/10 flex items-center justify-center">
                                    <ImageIcon size={24} className="text-black/10" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-20 h-20 flex items-center justify-center">
                                <ChevronDown size={24} className="text-amber-500 animate-bounce-subtle" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-base font-black text-deep-shadow group-hover:text-amber-600 transition-colors">
                                {group.guestName}
                              </span>
                              <span className="text-[10px] uppercase tracking-widest text-whisper-gray font-bold">
                                {group.photos.length} Photo{group.photos.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className="text-sm text-whisper-gray italic line-clamp-2 max-w-xs">
                              {firstPhoto?.caption ? `"${firstPhoto.caption}"` : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-whisper-gray">
                              <Clock size={14} />
                              <span className="text-xs font-mono font-bold">
                                {earliestPhoto ? new Date(earliestPhoto.taken_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }) : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => downloadAllPhotos(group.photos)}
                                className="p-2.5 rounded-full hover:bg-black/5 text-whisper-gray hover:text-deep-shadow transition-all"
                                title="Download All"
                              >
                                <Download size={22} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Delete ALL ${group.photos.length} photos from ${group.guestName}?`)) {
                                    for (const p of group.photos) await handleTrash(p.id);
                                  }
                                }}
                                className="p-2.5 rounded-full hover:bg-rose-50 text-whisper-gray hover:text-rose-600 transition-all"
                                title="Delete All"
                              >
                                <Trash2 size={22} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row Content */}
                        {isExpanded && group.photos.length > 0 && (
                          <tr className="bg-black/[0.03]">
                            <td colSpan={5} className="px-8 py-6">
                              <div className="flex flex-wrap gap-4">
                                {group.photos.map((photo) => (
                                  <div key={photo.id} className="flex flex-col gap-2 group/photo">
                                    <div 
                                      className="w-32 h-32 rounded-xl overflow-hidden bg-black/10 cursor-pointer shadow-md group-hover/photo:ring-2 group-hover/photo:ring-amber-400 transition-all"
                                      onClick={() => setSelectedPhoto(photo)}
                                    >
                                      <img src={photo.url} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex justify-center gap-3">
                                      <button
                                        onClick={() => photo.url && downloadPhoto(photo.url)}
                                        className="p-1.5 bg-white rounded-full shadow-sm text-whisper-gray hover:text-deep-shadow transition-colors border border-black/5"
                                      >
                                        <Download size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleTrash(photo.id)}
                                        className="p-1.5 bg-white rounded-full shadow-sm text-whisper-gray hover:text-rose-600 transition-colors border border-black/5"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
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