// src/app/admin/events/[eventId]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  Users,
  Image,
  MessageSquare,
  Ticket,
  QrCode,
  AlertTriangle,
  Printer,
  X,
  Scissors,
} from "lucide-react";

interface EventDetail {
  id: string;
  name: string;
  event_date: string;
  photo_limit: number;
  is_active: boolean;
  total_guests: number;
  active_guests: number;
  total_photos: number;
  total_messages: number;
  codes_generated: number;
  codes_used: number;
}

interface BatchCodeResult {
  code: string;
  displayFormat: string;
}

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const supabase = createClient();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // --- Batch code state ---
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchCount, setBatchCount] = useState(50);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    codes: BatchCodeResult[];
    eventName: string;
  } | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<string[]>([]);
  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase
        .from("events")
        .select("id, name, event_date, photo_limit, is_active")
        .eq("id", eventId)
        .single();

      if (!ev) {
        router.push("/admin");
        return;
      }

      const [
        { count: totalGuests },
        { count: activeGuests },
        { count: totalPhotos },
        { count: totalMessages },
        { count: codesGenerated },
        { count: codesUsed },
      ] = await Promise.all([
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "active"),
        supabase.from("photos").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("is_visible", true),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("guest_codes").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("guest_codes").select("*", { count: "exact", head: true }).eq("event_id", eventId).neq("status", "unused"),
      ]);

      setEvent({
        id: ev.id,
        name: ev.name,
        event_date: ev.event_date,
        photo_limit: ev.photo_limit,
        is_active: ev.is_active,
        total_guests: totalGuests ?? 0,
        active_guests: activeGuests ?? 0,
        total_photos: totalPhotos ?? 0,
        total_messages: totalMessages ?? 0,
        codes_generated: codesGenerated ?? 0,
        codes_used: codesUsed ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [eventId, supabase, router]);

  const handleToggle = async () => {
    if (!event || toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/events/${event.id}/toggle`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        setEvent((prev) => (prev ? { ...prev, is_active: json.data.isActive } : prev));
      }
    } catch {
      // Silently fail
    } finally {
      setToggling(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!batchCount || batchCount < 1 || batchCount > 500) return;
    setBatchGenerating(true);
    try {
      const res = await fetch("/api/codes/generate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, count: batchCount }),
      });
      const json = await res.json();
      if (json.success) {
        setBatchResult(json.data);
        setBatchModalOpen(false);
        // Refresh stats
        if (event) {
          setEvent({ ...event, codes_generated: event.codes_generated + batchCount });
        }
      } else {
        alert(json.error || "Failed to generate codes. Try again.");
      }
    } catch {
      alert("Network error. Check your connection.");
    } finally {
      setBatchGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate QR data URLs when batch result arrives
  useEffect(() => {
    if (!batchResult) { setQrDataUrls([]); return; }
    const origin = window.location.origin;
    import("qrcode").then(({ default: QRCodeLib }) => {
      Promise.all(
        batchResult.codes.map((c) =>
          QRCodeLib.toDataURL(`${origin}/e/${eventId}?code=${c.code}`, { width: 120, margin: 1 })
        )
      ).then(setQrDataUrls);
    });
  }, [batchResult, eventId]);

  const closeBatchResult = () => {
    setBatchResult(null);
    setBatchCount(50);
    setQrDataUrls([]);
  };

  const statCards = event
    ? [
        { label: "Total Guests", value: event.total_guests, sub: `${event.active_guests} active now`, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Photos Captured", value: event.total_photos, sub: `${event.photo_limit} shots/guest`, icon: Image, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Farewell Messages", value: event.total_messages, sub: "from guests", icon: MessageSquare, color: "text-rose-600", bg: "bg-rose-50" },
        {
          label: "Codes Used",
          value: `${event.codes_used} / ${event.codes_generated}`,
          sub: event.codes_generated > 0 ? `${Math.round((event.codes_used / event.codes_generated) * 100)}% utilization` : "No codes yet",
          icon: Ticket,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
      ]
    : [];

  return (
    <main className="admin-screen">
      {/* Back */}
      <button onClick={() => router.push("/admin")} className="flex items-center gap-1.5 text-sm text-whisper-gray hover:text-deep-shadow transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Events
      </button>

      {loading ? (
        <div className="space-y-6">
          <div className="h-8 w-48 bg-black/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-admin animate-pulse space-y-3">
                <div className="h-4 w-20 bg-black/5 rounded" />
                <div className="h-8 w-16 bg-black/5 rounded" />
                <div className="h-3 w-28 bg-black/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : event ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-deep-shadow uppercase">{event.name}</h1>
              <p className="text-sm text-whisper-gray mt-1">
                {new Date(event.event_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`relative inline-flex items-center h-7 w-12.5 rounded-full transition-colors duration-200 ease-out focus:outline-none ${event.is_active ? "bg-emerald-500" : "bg-rose-400"} ${toggling ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
                aria-label={event.is_active ? "End event" : "Start event"}
              >
                <span className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-out ${event.is_active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className={`text-sm font-semibold ${event.is_active ? "text-emerald-600" : "text-rose-600"}`}>
                {toggling ? "Updating..." : event.is_active ? "Live" : "Ended"}
              </span>
            </div>
          </div>

          {/* Ended banner */}
          {!event.is_active && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 mb-6">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">This event has ended.</p>
                <p className="text-rose-600 mt-0.5">Guest access is closed — codes cannot be generated, activated, or used for photo uploads.</p>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="card-admin flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-whisper-gray uppercase tracking-wider">{card.label}</span>
                    <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon size={16} className={card.color} strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-deep-shadow">{card.value}</p>
                  <p className="text-xs text-misty-gray">{card.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-whisper-gray uppercase tracking-wider mb-3">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/gallery/${event.id}`} className="btn-ghost no-underline text-sm">
                <Image size={15} /> View Gallery
              </Link>
              <Link href={`/admin/receptionist?event=${event.id}`} className="btn-ghost no-underline text-sm">
                <Ticket size={15} /> Generate Codes
              </Link>
              <Link href={`/admin/codes/${event.id}`} className="btn-ghost no-underline text-sm">
                <Ticket size={15} /> View Codes
              </Link>
              <button
                onClick={() => setBatchModalOpen(true)}
                className="btn-ghost text-sm"
              >
                <Printer size={15} /> Batch Codes
              </button>
              <button
                onClick={async () => {
                  const guestUrl = `${window.location.origin}/e/${event.id}`;
                  const { default: QRCodeLib } = await import("qrcode");
                  const qrDataUrl = await QRCodeLib.toDataURL(guestUrl, { width: 256 });
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(`<html><head><title>Print QR — ${event.name}</title><style>body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:Inter,sans-serif; } .card { text-align:center; } img { width:256px; height:256px; } h2 { font-size:20px; margin:16px 0 4px; color:#181818; } p { color:#6d6d6d; font-size:14px; margin:0; } @media print { body { margin:0; padding:20mm; } }</style></head><body><div class="card"><img src="${qrDataUrl}" alt="QR Code" /><h2>${event.name}</h2><p>Scan to take photos!</p><p style="font-size:12px;margin-top:20px;color:#aaa;">${guestUrl}</p></div><script>window.onload=function(){window.print()}</script></body></html>`);
                    w.document.close();
                  }
                }}
                className="btn-ghost text-sm"
              >
                <QrCode size={15} /> Print QR
              </button>
            </div>
          </div>

          {/* Event details */}
          <div className="card-admin">
            <h2 className="text-sm font-semibold text-whisper-gray uppercase tracking-wider mb-3">Event Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-whisper-gray">Photo Limit</p>
                <p className="font-semibold text-deep-shadow">{event.photo_limit} per guest</p>
              </div>
              <div>
                <p className="text-whisper-gray">Avg Photos/Guest</p>
                <p className="font-semibold text-deep-shadow">
                  {event.total_guests > 0 ? (event.total_photos / event.total_guests).toFixed(1) : "—"}
                </p>
              </div>
              <div>
                <p className="text-whisper-gray">Completion Rate</p>
                <p className="font-semibold text-deep-shadow">
                  {event.total_guests > 0 ? `${Math.round((event.total_messages / event.total_guests) * 100)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-whisper-gray">Code Utilization</p>
                <p className="font-semibold text-deep-shadow">
                  {event.codes_generated > 0 ? `${Math.round((event.codes_used / event.codes_generated) * 100)}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ───── Batch Generate Modal ───── */}
      {batchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setBatchModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-deep-shadow">
                Batch Generate Codes
              </h2>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
              >
                <X size={18} className="text-misty-gray" />
              </button>
            </div>

            {event && <p className="text-sm text-whisper-gray">{event.name}</p>}

            <div>
              <label className="text-sm font-medium text-deep-shadow block mb-1.5">
                Number of codes (1-500)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value) || 50)}
                className="input-admin"
                autoFocus
              />
              <p className="text-xs text-misty-gray mt-1.5">
                Codes are valid for 24 hours. Guests enter them at the event QR page.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchGenerate}
                disabled={batchGenerating}
                className="btn-primary"
              >
                {batchGenerating
                  ? `Generating ${batchCount} codes...`
                  : `Generate ${batchCount} Codes`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Print Sheet Modal ───── */}
      {batchResult && (
        <>
          {/* Non-print wrapper — hidden during print */}
          <div className="print:hidden fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full space-y-5 shadow-xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-deep-shadow">
                  Codes — {batchResult.eventName}
                </h2>
                <button
                  onClick={closeBatchResult}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <X size={18} className="text-misty-gray" />
                </button>
              </div>

              <p className="text-sm text-whisper-gray shrink-0">
                {batchResult.codes.length} codes generated. Print and cut along the dashed lines.
              </p>

              {/* Code grid preview */}
              <div className="overflow-y-auto flex-1 -mx-4 px-4">
                <div className="grid grid-cols-5 gap-2">
                  {batchResult.codes.map((c, i) => (
                    <div
                      key={i}
                      className="border border-dashed border-black/15 rounded-lg p-2 text-center"
                    >
                      <p className="text-xs font-bold font-mono text-deep-shadow tracking-wider">
                        {c.displayFormat}
                      </p>
                      <p className="text-[9px] text-misty-gray mt-1 leading-tight">
                        {batchResult.eventName}
                      </p>
                      <Scissors size={10} className="text-misty-gray/30 mx-auto mt-1" />
                    </div>
                  ))}
                  {/* Fill last row with empty cells for alignment */}
                  {Array.from({
                    length: (5 - (batchResult.codes.length % 5)) % 5,
                  }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2" />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  onClick={closeBatchResult}
                  className="btn-ghost"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="btn-primary"
                >
                  <Printer size={15} /> Print Sheet
                </button>
              </div>
            </div>
          </div>

          {/* Print-only sheet */}
          <div className="hidden print:block fixed inset-0 z-[999] bg-white" ref={printSheetRef}>
            <div className="p-8 max-w-[210mm] mx-auto">
              <h2 className="text-xl font-bold text-deep-shadow text-center mb-6">
                {batchResult.eventName} — Guest Codes
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {batchResult.codes.map((c, i) => (
                  <div
                    key={i}
                    className="border border-dashed border-black/30 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2"
                  >
                    {qrDataUrls[i] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrls[i]} alt={`QR ${c.displayFormat}`} width={100} height={100} />
                    )}
                    <p className="text-sm font-bold font-mono text-deep-shadow tracking-widest">
                      {c.displayFormat}
                    </p>
                    <p className="text-[9px] text-gray-400 leading-tight">
                      {batchResult.eventName}
                    </p>
                  </div>
                ))}
                {Array.from({
                  length: (4 - (batchResult.codes.length % 4)) % 4,
                }).map((_, i) => (
                  <div key={`empty-print-${i}`} className="p-4" />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}