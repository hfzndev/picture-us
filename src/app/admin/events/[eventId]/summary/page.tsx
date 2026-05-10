"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import {
  ArrowLeft,
  Users,
  Image,
  MessageSquare,
  Ticket,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react";

interface EventSummary {
  id: string;
  name: string;
  event_date: string;
  photo_limit: number;
  theme_color: string;
  is_active: boolean;
  total_guests: number;
  completed_guests: number;
  revoked_guests: number;
  total_photos: number;
  total_messages: number;
  codes_generated: number;
  codes_used: number;
  first_photo_at: string | null;
  last_photo_at: string | null;
  created_at: string;
}

export default function EventSummaryPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const supabase = createClient();

  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase
        .from("events")
        .select("id, name, event_date, photo_limit, theme_color, is_active, created_at")
        .eq("id", eventId)
        .single();

      if (!ev) {
        router.push("/admin");
        return;
      }

      const [
        { count: totalGuests },
        { count: completedGuests },
        { count: revokedGuests },
        { count: totalPhotos },
        { count: totalMessages },
        { count: codesGenerated },
        { count: codesUsed },
        { data: photoTimestamps },
      ] = await Promise.all([
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "completed"),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "revoked"),
        supabase.from("photos").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("is_visible", true),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("guest_codes").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        supabase.from("guest_codes").select("*", { count: "exact", head: true }).eq("event_id", eventId).neq("status", "unused"),
        supabase.from("photos").select("taken_at").eq("event_id", eventId).order("taken_at", { ascending: true }),
      ]);

      setSummary({
        ...ev,
        total_guests: totalGuests ?? 0,
        completed_guests: completedGuests ?? 0,
        revoked_guests: revokedGuests ?? 0,
        total_photos: totalPhotos ?? 0,
        total_messages: totalMessages ?? 0,
        codes_generated: codesGenerated ?? 0,
        codes_used: codesUsed ?? 0,
        first_photo_at: photoTimestamps && photoTimestamps.length > 0 ? photoTimestamps[0].taken_at : null,
        last_photo_at: photoTimestamps && photoTimestamps.length > 0 ? photoTimestamps[photoTimestamps.length - 1].taken_at : null,
      });
      setLoading(false);
    }
    load();
  }, [eventId, supabase, router]);

  if (loading) {
    return (
      <main className="admin-screen">
        <div className="h-4 w-32 bg-black/5 rounded animate-pulse mb-6" />
        <div className="h-10 w-64 bg-black/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-admin h-32 animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (!summary) return null;

  const avgPhotos = summary.total_guests > 0 ? (summary.total_photos / summary.total_guests).toFixed(1) : "0";
  const completionRate = summary.total_guests > 0 ? Math.round((summary.total_messages / summary.total_guests) * 100) : 0;
  const codeUtilization = summary.codes_generated > 0 ? Math.round((summary.codes_used / summary.codes_generated) * 100) : 0;

  return (
    <main className="admin-screen">
      <button
        onClick={() => router.push("/admin")}
        className="flex items-center gap-1.5 text-sm text-whisper-gray hover:text-deep-shadow transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to Events
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-deep-shadow uppercase tracking-tight">
              {summary.name}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-widest text-misty-gray border border-black/5 px-2 py-1 rounded-md bg-black/5">
              Ended
            </span>
          </div>
          <p className="text-whisper-gray flex items-center gap-2">
            <Calendar size={14} />
            {new Date(summary.event_date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href={`/admin/gallery/${summary.id}`}
          className="btn-primary no-underline"
        >
          <Image size={16} />
          View Final Gallery
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Guests"
          value={summary.total_guests}
          sub={`${summary.completed_guests} completed roll`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Photos Captured"
          value={summary.total_photos}
          sub={`${avgPhotos} photos avg / guest`}
          icon={Image}
          color="amber"
        />
        <StatCard
          label="Farewell Messages"
          value={summary.total_messages}
          sub={`${completionRate}% completion rate`}
          icon={MessageSquare}
          color="rose"
        />
        <StatCard
          label="Codes Used"
          value={`${summary.codes_used} / ${summary.codes_generated}`}
          sub={`${codeUtilization}% utilization rate`}
          icon={Ticket}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-admin space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-whisper-gray flex items-center gap-2">
            <Clock size={14} />
            Event Timeline
          </h2>
          <div className="space-y-4">
            <TimelineItem
              label="Event Created"
              time={new Date(summary.created_at).toLocaleString()}
            />
            <TimelineItem
              label="First Photo Taken"
              time={summary.first_photo_at ? new Date(summary.first_photo_at).toLocaleString() : "No photos taken"}
            />
            <TimelineItem
              label="Last Photo Taken"
              time={summary.last_photo_at ? new Date(summary.last_photo_at).toLocaleString() : "No photos taken"}
            />
          </div>
        </div>

        <div className="card-admin space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-whisper-gray flex items-center gap-2">
            <TrendingUp size={14} />
            Guest Breakdown
          </h2>
          <div className="space-y-4">
            <BreakdownRow
              label="Completed Photo Roll"
              count={summary.completed_guests}
              total={summary.total_guests}
              color="bg-emerald-500"
            />
            <BreakdownRow
              label="Left Mid-way (Active)"
              count={summary.total_guests - summary.completed_guests - summary.revoked_guests}
              total={summary.total_guests}
              color="bg-amber-400"
            />
            <BreakdownRow
              label="Revoked Sessions"
              count={summary.revoked_guests}
              total={summary.total_guests}
              color="bg-rose-500"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };

  return (
    <div className="card-admin flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-whisper-gray uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-lg ${colors[color].split(" ")[1]} flex items-center justify-center`}>
          <Icon size={16} className={colors[color].split(" ")[0]} strokeWidth={2} />
        </div>
      </div>
      <p className="text-2xl font-bold text-deep-shadow">{value}</p>
      <p className="text-xs text-misty-gray font-medium">{sub}</p>
    </div>
  );
}

function TimelineItem({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-black/5 pb-3 last:border-0 last:pb-0">
      <span className="text-whisper-gray font-medium">{label}</span>
      <span className="text-deep-shadow font-semibold">{time}</span>
    </div>
  );
}

function BreakdownRow({ label, count, total, color }: any) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
        <span className="text-whisper-gray">{label}</span>
        <span className="text-deep-shadow">{count} ({Math.round(percent)}%)</span>
      </div>
      <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
