// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { QrCode, Plus } from "lucide-react";
import QRCode from "qrcode";
import { useCreateEventModal } from "./layout";

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
      .order("created_at", { ascending: false });

    if (data) setEvents(data);
    setLoading(false);
  };

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
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => router.push(`/admin/events/${event.id}`)}
              className="card-admin flex items-center justify-between w-full text-left cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  router.push(`/admin/events/${event.id}`);
              }}
            >
              <div>
                <h3 className="font-semibold text-deep-shadow">
                  {event.name}
                </h3>
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
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const guestUrl = `${window.location.origin}/e/${event.id}`;
                    const { data: ev } = await supabase
                      .from("events")
                      .select("receptionist_token")
                      .eq("id", event.id)
                      .single();
                    const receptionistUrl = `${window.location.origin}/admin/receptionist?event=${event.id}&token=${ev?.receptionist_token || ""}`;
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-deep-shadow">
              {qrModal.name}
            </h3>
            <p className="text-xs text-whisper-gray">Guest QR Code</p>
            <img
              src={qrModal.qrDataUrl}
              alt="Event QR Code"
              className="mx-auto rounded-lg"
            />
            <p className="text-xs text-whisper-gray break-all font-mono">
              {qrModal.guestUrl}
            </p>
            <div className="space-y-2.5">
              <a
                href={qrModal.qrDataUrl}
                download={`${qrModal.name}-qr.png`}
                className="btn-primary block text-center no-underline text-sm"
              >
                Download QR
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrModal.receptionistUrl);
                  alert("Receptionist link copied!");
                }}
                className="btn-ghost block w-full text-sm"
              >
                Copy Receptionist Link
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}