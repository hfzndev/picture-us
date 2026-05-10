// src/app/admin/codes/[eventId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ArrowLeft,
  Search,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type CodeStatus = "unused" | "active" | "consumed" | "expired";

interface GuestCode {
  id: string;
  code: string;
  displayFormat: string;
  status: CodeStatus;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  guestName: string | null;
  photosTaken: number | null;
  sessionStatus: string | null;
}

type FilterTab = "all" | "unused" | "used";

const STATUS_CONFIG: Record<
  CodeStatus,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  unused: {
    label: "Unused",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    Icon: CheckCircle2,
  },
  active: {
    label: "Active",
    color: "text-amber-700",
    bg: "bg-amber-50",
    Icon: Clock,
  },
  consumed: {
    label: "Used",
    color: "text-slate-600",
    bg: "bg-slate-100",
    Icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "text-red-600",
    bg: "bg-red-50",
    Icon: XCircle,
  },
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

// QR Modal Component
function QrModal({
  code,
  eventId,
  onClose,
}: {
  code: GuestCode;
  eventId: string;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const guestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/e/${eventId}?code=${code.code}`
      : "";

  useEffect(() => {
    if (!guestUrl) return;
    import("qrcode").then(({ default: QRCodeLib }) => {
      QRCodeLib.toDataURL(guestUrl, { width: 220, margin: 2 }).then(setQrUrl);
    });
  }, [guestUrl]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 flex flex-col items-center gap-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-misty-gray hover:text-deep-shadow transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="text-base font-semibold text-deep-shadow">QR Code</h2>

        {/* QR Image */}
        <div className="bg-white rounded-xl border border-black/8 p-3 shadow-sm">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR Code" width={220} height={220} />
          ) : (
            <div className="w-[220px] h-[220px] bg-black/5 rounded animate-pulse" />
          )}
        </div>

        {/* Code */}
        <p className="text-2xl font-bold font-mono tracking-widest text-deep-shadow">
          {code.displayFormat}
        </p>

        {/* URL (truncated) */}
        <p className="text-xs text-misty-gray text-center break-all px-2 leading-relaxed">
          {guestUrl}
        </p>

        {/* Download */}
        {qrUrl && (
          <a
            href={qrUrl}
            download={`code-${code.displayFormat}.png`}
            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            <Download size={15} />
            Download QR
          </a>
        )}
      </div>
    </div>
  );
}

export default function CodesListPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [codes, setCodes] = useState<GuestCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [qrCode, setQrCode] = useState<GuestCode | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/codes?eventId=${eventId}`);
      const json = await res.json();
      if (json.success) {
        setCodes(json.data);
      }
      setLoading(false);
    }

    async function loadEventName() {
      const res = await fetch(`/api/events/${eventId}`).catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        if (json.success) setEventName(json.data.name);
      }
    }

    load();
    loadEventName();
  }, [eventId]);

  // Reset to page 1 when filter/search/pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearch, pageSize]);

  const filtered = useMemo(() => {
    let list = codes;

    if (filter === "unused") list = list.filter((c) => c.status === "unused");
    if (filter === "used") list = list.filter((c) => c.status !== "unused");

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toUpperCase().replace(/-/g, "");
      list = list.filter(
        (c) =>
          c.code.includes(q) ||
          (c.guestName?.toUpperCase().includes(q) ?? false)
      );
    }

    return list;
  }, [codes, filter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = codes.length;
    const unused = codes.filter((c) => c.status === "unused").length;
    const used = codes.filter((c) => c.status !== "unused").length;
    return { total, unused, used };
  }, [codes]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "unused", label: "Unused", count: stats.unused },
    { key: "used", label: "Used", count: stats.used },
  ];

  const closeQr = useCallback(() => setQrCode(null), []);

  return (
    <>
      {/* QR Modal */}
      {qrCode && (
        <QrModal code={qrCode} eventId={eventId} onClose={closeQr} />
      )}

      <main className="admin-screen">
        {/* Back */}


        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-deep-shadow">Guest Codes</h1>
            {eventName && (
              <p className="text-sm text-whisper-gray mt-0.5">{eventName}</p>
            )}
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-misty-gray pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-admin pl-9 text-sm"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-deep-shadow" },
            { label: "Unused", value: stats.unused, color: "text-emerald-600" },
            { label: "Used", value: stats.used, color: "text-slate-500" },
          ].map((s) => (
            <div key={s.label} className="card-admin text-center py-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-whisper-gray mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 border-b border-black/8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === t.key
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-whisper-gray hover:text-deep-shadow"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-misty-gray">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-black/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Ticket size={40} className="text-misty-gray" strokeWidth={1.5} />
            <p className="text-whisper-gray text-sm">
              {codes.length === 0
                ? "No codes generated yet."
                : "No codes match your filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-black/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/8 bg-black/2 ">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider ">
                      Code
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider ">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider sm:table-cell ">
                      Guest Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider md:table-cell ">
                      Photos
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider lg:table-cell ">
                      Created
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider lg:table-cell ">
                      Activated
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-whisper-gray uppercase tracking-wider ">
                      QR CODE
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {paginated.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.unused;
                    const StatusIcon = cfg.Icon;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-black/2 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-deep-shadow tracking-wider">
                          {c.displayFormat}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                          >
                            <StatusIcon size={11} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-deep-shadow hidden sm:table-cell">
                          {c.guestName ?? (
                            <span className="text-misty-gray italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-whisper-gray hidden md:table-cell">
                          {c.photosTaken !== null ? c.photosTaken : "—"}
                        </td>
                        <td className="px-4 py-3 text-whisper-gray hidden lg:table-cell text-xs">
                          {fmtTime(c.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-whisper-gray hidden lg:table-cell text-xs ">
                          {fmtTime(c.activatedAt)}
                        </td>
                        <td className="px-4 py-3 ">
                          {c.status === "unused" ? (
                            <button
                              onClick={() => setQrCode(c)}
                              className="flex items-center gap-1.5 text-xs text-black transition-color ease-in-out hover:text-amber-700 cursor-pointer font-medium transition-colors"
                              title="View QR Code"
                            >
                              <QrCode size={15} />
                              <span className="hidden sm:inline">QR</span>
                            </button>
                          ) : (
                            <span className="text-misty-gray">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
              {/* Rows per page */}
              <div className="flex items-center gap-2 text-xs text-whisper-gray">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) =>
                    setPageSize(Number(e.target.value) as typeof pageSize)
                  }
                  className="border border-black/10 rounded-lg px-2 py-1 text-xs text-deep-shadow bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page nav */}
              <div className="flex items-center gap-3 text-xs text-whisper-gray">
                <span>
                  Page {currentPage} of {totalPages}
                  <span className="ml-2 text-misty-gray">
                    ({filtered.length} total)
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
