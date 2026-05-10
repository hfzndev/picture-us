// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { QrCode, Plus } from "lucide-react";
import QRCode from "qrcode";
import { useCreateEventModal } from "./layout";
import { QrCodeModal } from "@/components/admin/qr-code-modal";

interface EventData {
  id: string;
  name: string;
  event_date: string;
  photo_limit: number;
  is_active: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{
    eventId: string;
    name: string;
    guestUrl: string;
    receptionistUrl: string;
    qrDataUrl: string;
  } | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const { openCreateModal } = useCreateEventModal();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, name, event_date, photo_limit, is_active")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setEvents(data);
    setLoading(false);
  };

  const liveEvents = events.filter((e) => e.is_active);
  const endedEvents = events.filter((e) => !e.is_active);

  const renderEventCard = (event: EventData) => (
    <div
      key={event.id}
      onClick={() =>
        router.push(
          event.is_active
            ? `/admin/events/${event.id}`
            : `/admin/events/${event.id}/summary`
        )
      }
      className={`card-admin flex items-center justify-between w-full text-left cursor-pointer transition-all ${
        !event.is_active ? "opacity-75 grayscale-[0.3]" : ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter")
          router.push(
            event.is_active
              ? `/admin/events/${event.id}`
              : `/admin/events/${event.id}/summary`
          );
      }}
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-deep-shadow">{event.name}</h3>
          <span
            className={`w-2 h-2 rounded-full ${
              event.is_active ? "bg-emerald-500 animate-pulse" : "bg-misty-gray"
            }`}
          />
        </div>
        <p className="text-sm text-whisper-gray">
          {new Date(event.event_date).toLocaleDateString()} &middot;{" "}
          {event.photo_limit} shots/guest
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/gallery/${event.id}`);
          }}
          className="tab-admin"
        >
          Gallery
        </button>
        {event.is_active && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const guestUrl = `${window.location.origin}/e/${event.id}`;
              const { data: ev } = await supabase
                .from("events")
                .select("receptionist_token")
                .eq("id", event.id)
                .single();
              const receptionistUrl = `${window.location.origin}/admin/receptionist?event=${
                event.id
              }&token=${ev?.receptionist_token || ""}`;
              const qrDataUrl = await QRCode.toDataURL(guestUrl, {
                width: 256,
              });
              setQrModal({
                eventId: event.id,
                name: event.name,
                guestUrl,
                receptionistUrl,
                qrDataUrl,
              });
            }}
            className="tab-admin"
          >
            <QrCode size={14} />
            QR
          </button>
        )}
        {!event.is_active && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-misty-gray border border-black/5 px-2 py-1 rounded-md bg-black/5">
            Ended
          </span>
        )}
      </div>
    </div>
  );

  return (
    <main className="admin-screen">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-deep-shadow">Events</h1>
          <p className="text-sm text-whisper-gray mt-1">
            Manage your events and guest access
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus size={16} />
          Create Event
        </button>
      </div>

      {/* Event List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="card-admin flex items-center justify-between animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-5 w-44 bg-black/5 rounded" />
                <div className="h-4 w-28 bg-black/5 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-black/5 rounded-full" />
                <div className="h-8 w-16 bg-black/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-whisper-gray">
            No events yet. Create your first event to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Live Events Section */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-whisper-gray mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Events ({liveEvents.length})
            </h2>
            {liveEvents.length === 0 ? (
              <div className="p-8 border border-dashed border-black/10 rounded-2xl text-center">
                <p className="text-sm text-misty-gray">No live events right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveEvents.map(renderEventCard)}
              </div>
            )}
          </section>

          {/* Ended Events Section */}
          {endedEvents.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-whisper-gray mb-4">
                Ended Events ({endedEvents.length})
              </h2>
              <div className="space-y-3">
                {endedEvents.map(renderEventCard)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      <QrCodeModal
        open={!!qrModal}
        onOpenChange={(open) => !open && setQrModal(null)}
        data={qrModal}
      />
    </main>
  );
}