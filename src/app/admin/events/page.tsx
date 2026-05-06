// src/app/admin/events/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        name: newEvent.name,
        event_date: newEvent.event_date,
        photo_limit: newEvent.photo_limit,
        theme_color: newEvent.theme_color,
      })
      .select("id, name, receptionist_token")
      .single();

    if (error || !event) {
      alert("Failed to create event. Please try again.");
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Camera size={32} className="text-[var(--color-amber-500)]" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            My Events
          </h1>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-sm">
          <LogOut size={16} className="inline mr-1" /> Logout
        </button>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary mb-6"
        >
          <Plus size={18} className="inline mr-1" /> Create Event
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-md p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">New Event</h2>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1">
              Event Name
            </label>
            <input
              type="text"
              value={newEvent.name}
              onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              className="input-base"
              placeholder="Sarah & Tom's Wedding"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1">
              Event Date
            </label>
            <input
              type="date"
              value={newEvent.event_date}
              onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1">
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
              className="input-base"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating..." : "Create Event 🎉"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Camera size={48} className="text-[var(--color-text-muted)] mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-[var(--color-text-secondary)]">
            No events yet. Create your first event to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-md p-5 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">
                  {event.name}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {new Date(event.event_date).toLocaleDateString()} · {event.photo_limit} shots/guest
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/admin/gallery/${event.id}`)}
                  className="btn-secondary text-sm"
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
                  className="btn-secondary text-sm"
                >
                  <QrCode size={16} className="inline mr-1" /> QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">{qrModal.name} — Guest QR</h3>
            <img
              src={qrModal.qrDataUrl}
              alt="Event QR Code"
              className="mx-auto rounded-lg shadow-md"
            />
            <p className="text-xs text-[var(--color-text-muted)] break-all">
              {qrModal.guestUrl}
            </p>
            <div className="space-y-2">
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
                className="btn-secondary block w-full text-sm"
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