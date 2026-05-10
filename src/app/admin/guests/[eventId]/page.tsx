// src/app/admin/guests/[eventId]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useDebounce } from "@/hooks/use-debounce";
import { ArrowLeft, Search, User, Image as ImageIcon } from "lucide-react";

interface Session {
  id: string;
  guest_name: string | null;
  status: string;
  photos_taken: number;
  created_at: string;
}

interface GuestDetail {
  id: string;
  guest_name: string | null;
  status: string;
  photos_taken: number;
  created_at: string;
  photos: { id: string; url: string }[];
  message: string | null;
}

export default function GuestsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sessions")
        .select("id, guest_name, status, photos_taken, created_at:activated_at")
        .eq("event_id", eventId)
        .order("activated_at", { ascending: false });

      if (data) setSessions(data);
      setLoading(false);
    }
    load();
  }, [eventId, supabase]);

  const handleSelect = async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/guests/${sessionId}`);
      const json = await res.json();
      if (json.success) setSelectedSession(json.data);
    } catch {
      // silently fail
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) =>
      (s.guest_name ?? "").toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [sessions, debouncedSearch]);

  return (
    <main className="admin-screen">
      {/* Back */}
      <button
        onClick={() => router.push(`/admin/events/${eventId}`)}
        className="flex items-center gap-1.5 text-sm text-whisper-gray hover:text-deep-shadow transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-deep-shadow mb-8">Guests</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-misty-gray" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests..."
          className="input-admin pl-9"
        />
      </div>

      {loading ? (
        <div className="flex gap-0 rounded-xl border border-black/5 overflow-hidden">
          {/* List skeleton */}
          <div className="w-full md:w-72 shrink-0 border-r border-black/5 p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-24 bg-black/5 rounded" />
                <div className="h-3 w-16 bg-black/5 rounded" />
              </div>
            ))}
          </div>
          {/* Detail skeleton */}
          <div className="flex-1 hidden md:flex items-center justify-center p-12">
            <div className="space-y-4 animate-pulse w-full max-w-md">
              <div className="h-6 w-32 bg-black/5 rounded mx-auto" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-black/5 rounded-lg"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16">
          <User size={48} className="text-black/15 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-whisper-gray">No guests yet.</p>
        </div>
      ) : (
        <div className="flex gap-0 rounded-xl border border-black/5 overflow-hidden flex-col md:flex-row">
          {/* List */}
          <div className="w-full md:w-72 shrink-0 border-r border-black/5 divide-y divide-black/5 max-h-[500px] overflow-y-auto">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelect(session.id)}
                className={`w-full text-left p-4 transition-colors hover:bg-black/[0.02] ${
                  selectedSession?.id === session.id ? "bg-amber-50 border-l-2 border-amber-400" : ""
                }`}
              >
                <p className="font-semibold text-sm text-deep-shadow">
                  {session.guest_name ?? "Anonymous"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      session.status === "active"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-misty-gray/20 text-whisper-gray"
                    }`}
                  >
                    {session.status}
                  </span>
                  <span className="text-xs text-whisper-gray">
                    {session.photos_taken} photos
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="flex-1 p-6 min-h-[320px]">
            {detailLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="space-y-4 animate-pulse w-full max-w-md">
                  <div className="h-6 w-32 bg-black/5 rounded mx-auto" />
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square bg-black/5 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedSession ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-deep-shadow">
                    {selectedSession.guest_name ?? "Anonymous"}
                  </h2>
                  <p className="text-xs text-whisper-gray mt-1">
                    {selectedSession.photos_taken} photos &middot;{" "}
                    {new Date(selectedSession.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Photos grid */}
                {selectedSession.photos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedSession.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-lg overflow-hidden bg-black/5"
                      >
                        <img
                          src={photo.url}
                          alt="Guest photo"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-whisper-gray">
                    No photos uploaded yet.
                  </p>
                )}

                {/* Message */}
                {selectedSession.message && (
                  <div className="card-admin bg-amber-50 border-amber-200">
                    <p className="text-sm text-deep-shadow italic leading-relaxed">
                      &ldquo;{selectedSession.message}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-whisper-gray">
                Select a guest to view details
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}