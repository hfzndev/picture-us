// src/app/admin/events/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { Camera, QrCode, LogOut, Plus } from "lucide-react";
import QRCode from "qrcode";

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
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    event_date: "",
    photo_limit: 8,
    theme_color: "amber",
  });
  const [creating, setCreating] = useState(false);
  const [qrModal, setQrModal] = useState<{
    eventId: string;
    name: string;
    guestUrl: string;
    receptionistUrl: string;
    qrDataUrl: string;
  } | null>(null);

  const router = useRouter();
  const supabase = createClient();

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to create an event.");
      setCreating(false);
      return;
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        host_id: user.id,
        name: newEvent.name,
        event_date: newEvent.event_date,
        photo_limit: newEvent.photo_limit,
        theme_color: newEvent.theme_color,
      })
      .select("id, name, receptionist_token")
      .single();

    if (error) {
      alert(`Failed to create event: ${error.message}`);
      setCreating(false);
      return;
    }

    if (!event) {
      alert("Failed to create event. No data returned.");
      setCreating(false);
      return;
    }

    const guestUrl = `${window.location.origin}/e/${event.id}`;
    const receptionistUrl = `${window.location.origin}/admin/receptionist?event=${event.id}&token=${event.receptionist_token}`;
    const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 256 });

    setQrModal({
      eventId: event.id,
      name: event.name,
      guestUrl,
      receptionistUrl,
      qrDataUrl,
    });

    setShowForm(false);
    setNewEvent({ name: "", event_date: "", photo_limit: 8, theme_color: "amber" });
    setCreating(false);
    loadEvents();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="admin-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Camera size={28} className="text-deep-shadow" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold text-deep-shadow lowercase">
            picture-us
          </h1>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-whisper-gray hover:text-deep-shadow transition-colors duration-200"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>

      {/* Create Event Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary mb-8 w-full max-w-sm mx-auto"
        >
          <Plus size={16} />
          Create Event
        </button>
      )}

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="card-admin mb-8 space-y-5"
        >
          <h2 className="text-lg font-semibold text-deep-shadow">New Event</h2>

          <div>
            <label className="text-sm font-medium text-deep-shadow block mb-1.5">
              Event Name
            </label>
            <input
              type="text"
              value={newEvent.name}
              onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              className="input-admin"
              placeholder="e.g. John's Wedding"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-deep-shadow block mb-1.5">
              Event Date
            </label>
            <input
              type="date"
              value={newEvent.event_date}
              onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
              className="input-admin"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-deep-shadow block mb-1.5">
              Photos Per Guest
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={newEvent.photo_limit}
              onChange={(e) =>
                setNewEvent({ ...newEvent, photo_limit: parseInt(e.target.value) || 8 })
              }
              className="input-admin"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
          <Camera
            size={48}
            className="text-black/15 mx-auto mb-4"
            strokeWidth={1.5}
          />
          <p className="text-whisper-gray">
            No events yet. Create your first event to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="card-admin flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-deep-shadow">{event.name}</h3>
                <p className="text-sm text-whisper-gray">
                  {new Date(event.event_date).toLocaleDateString()} &middot;{" "}
                  {event.photo_limit} shots/guest
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/gallery/${event.id}`)}
                  className="tab-admin"
                >
                  Gallery
                </button>
                <button
                  onClick={async () => {
                    const guestUrl = `${window.location.origin}/e/${event.id}`;
                    const { data: ev } = await supabase
                      .from("events")
                      .select("receptionist_token")
                      .eq("id", event.id)
                      .single();
                    const receptionistUrl = `${window.location.origin}/admin/receptionist?event=${event.id}&token=${ev?.receptionist_token || ""}`;
                    const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 256 });
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