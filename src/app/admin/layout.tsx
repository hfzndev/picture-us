// src/app/admin/layout.tsx
"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import {
  Camera,
  Calendar,
  Image,
  Ticket,
  Users,
  LogOut,
  Menu,
  Trash2,
  Plus,
  X,
  ArrowLeft,
  Check,
  QrCode,
  LayoutDashboard,
} from "lucide-react";
import QRCode from "qrcode";

// --- Create Event Context ---
const CreateEventCtx = createContext<{ openCreateModal: () => void }>({
  openCreateModal: () => {},
});
export function useCreateEventModal() {
  return useContext(CreateEventCtx);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Derive selected event from URL path segments
  const match = pathname.match(
    /\/admin\/(?:gallery|guests|recycle-bin|events)\/([a-f0-9-]+)/
  );

  // Receptionist page uses query param — must be in useEffect to avoid SSR hydration mismatch
  const [receptionistEventId, setReceptionistEventId] = useState<string | null>(null);
  useEffect(() => {
    if (pathname.startsWith("/admin/receptionist") && typeof window !== "undefined") {
      setReceptionistEventId(new URLSearchParams(window.location.search).get("event"));
    } else {
      setReceptionistEventId(null);
    }
  }, [pathname]);

  const selectedEventId = match?.[1] ?? receptionistEventId;

  // --- Create Event Modal State ---
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [qrModal, setQrModal] = useState<{
    eventId: string;
    name: string;
    guestUrl: string;
    receptionistUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: "",
    event_date: "",
    photo_limit: 8,
    theme_color: "amber",
  });
  const [creating, setCreating] = useState(false);

  // Login page — no sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Load user on mount
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      setUserEmail(user.email ?? null);
    }
    load();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const navItems = [{ href: "/admin", label: "Events", icon: Calendar }];

  const eventNavItems = selectedEventId
    ? [
        {
          href: `/admin/events/${selectedEventId}`,
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: `/admin/gallery/${selectedEventId}`,
          label: "Gallery",
          icon: Image,
        },
        {
          href: `/admin/receptionist?event=${selectedEventId}`,
          label: "Codes",
          icon: Ticket,
        },
        {
          href: `/admin/guests/${selectedEventId}`,
          label: "Guests",
          icon: Users,
        },
        {
          href: `/admin/recycle-bin/${selectedEventId}`,
          label: "Recycle Bin",
          icon: Trash2,
        },
      ]
    : [];

  // --- Create Event Handlers ---
  const openCreateModal = () => {
    setNewEvent({ name: "", event_date: "", photo_limit: 8, theme_color: "amber" });
    setCreateModalOpen(true);
    setConfirmModalOpen(false);
    setQrModal(null);
  };

  const closeAllModals = () => {
    setCreateModalOpen(false);
    setConfirmModalOpen(false);
    setQrModal(null);
    setCreating(false);
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name.trim() || !newEvent.event_date) return;
    setCreateModalOpen(false);
    setConfirmModalOpen(true);
  };

  const handleBackToEdit = () => {
    setConfirmModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleConfirmCreate = async () => {
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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

    if (error || !event) {
      alert(`Failed to create event: ${error?.message || "No data returned"}`);
      setCreating(false);
      setConfirmModalOpen(false);
      return;
    }

    const guestUrl = `${window.location.origin}/e/${event.id}`;
    const receptionistUrl = `${window.location.origin}/admin/receptionist?event=${event.id}&token=${event.receptionist_token}`;
    const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 256 });

    setConfirmModalOpen(false);
    setNewEvent({ name: "", event_date: "", photo_limit: 8, theme_color: "amber" });
    setCreating(false);

    setQrModal({
      eventId: event.id,
      name: event.name,
      guestUrl,
      receptionistUrl,
      qrDataUrl,
    });

    router.refresh();
  };

  return (
    <CreateEventCtx.Provider value={{ openCreateModal }}>
      <div className="flex min-h-dvh bg-frost-white">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 left-0 z-50 h-dvh w-60 bg-midnight-canvas text-frost-white flex flex-col shrink-0 transition-transform duration-300 ease-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 px-5 py-5 no-underline border-b border-white/10"
          >
            <Camera size={24} className="text-amber-500" strokeWidth={1.5} />
            <span className="text-base font-semibold tracking-tight">
              Picture Us
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-misty-gray mb-2">
              Home
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 no-underline ${
                    active
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-whisper-gray hover:bg-white/5 hover:text-frost-white"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}

            {/* Create Event */}
            <button
              onClick={() => {
                openCreateModal();
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 w-full text-left text-whisper-gray hover:bg-white/5 hover:text-frost-white"
            >
              <Plus size={18} strokeWidth={1.5} />
              Create Event
            </button>
            <div className="pt-3 mt-3 border-t border-white/10"></div>

            {/* Separator + Event Nav */}
            {selectedEventId && (
              <div >
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-misty-gray mb-2">
                  Event
                </p>

                {eventNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname.startsWith(
                    item.href.split("?")[0]
                  );
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 no-underline ${
                        active
                          ? "bg-amber-500/15 text-amber-400"
                          : "text-whisper-gray hover:bg-white/5 hover:text-frost-white"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/10 space-y-2">
            {userEmail && (
              <p className="text-xs text-misty-gray truncate">{userEmail}</p>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-sm text-whisper-gray hover:text-frost-white transition-colors duration-150 w-full"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="lg:hidden flex items-center justify-between px-5 py-3 border-b border-black/5 bg-frost-white sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-deep-shadow" />
            </button>
            <Link href="/" className="flex items-center gap-2 no-underline">
              <Camera size={20} className="text-amber-500" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-deep-shadow">
                Picture Us
              </span>
            </Link>
            <div className="w-10" />
          </header>

          {/* Page content */}
          <div className="flex-1">{children}</div>
        </div>

        {/* ───── Create Event Modal (Step 1: Form) ───── */}
        {createModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeAllModals}
          >
            <form
              onSubmit={handleReview}
              className="bg-white rounded-2xl p-8 max-w-md w-full space-y-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-deep-shadow">
                  New Event
                </h2>
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <X size={18} className="text-misty-gray" />
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-deep-shadow block mb-1.5">
                  Event Name
                </label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, name: e.target.value })
                  }
                  className="input-admin"
                  placeholder="e.g. Sarah's Wedding"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-deep-shadow block mb-1.5">
                  Event Date
                </label>
                <input
                  type="date"
                  value={newEvent.event_date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, event_date: e.target.value })
                  }
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
                    setNewEvent({
                      ...newEvent,
                      photo_limit: parseInt(e.target.value) || 8,
                    })
                  }
                  className="input-admin"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Review →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ───── Confirmation Modal (Step 2) ───── */}
        {confirmModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeAllModals}
          >
            <div
              className="bg-white rounded-2xl p-8 max-w-md w-full space-y-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-deep-shadow">
                  Confirm Event
                </h2>
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <X size={18} className="text-misty-gray" />
                </button>
              </div>

              <p className="text-sm text-whisper-gray">
                Review the details before creating your event:
              </p>

              <div className="bg-misty-gray/10 rounded-xl p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-misty-gray uppercase tracking-wider font-semibold">
                    Name
                  </p>
                  <p className="font-semibold text-deep-shadow mt-0.5">
                    {newEvent.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-misty-gray uppercase tracking-wider font-semibold">
                    Date
                  </p>
                  <p className="font-semibold text-deep-shadow mt-0.5">
                    {new Date(newEvent.event_date).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-misty-gray uppercase tracking-wider font-semibold">
                    Photos Per Guest
                  </p>
                  <p className="font-semibold text-deep-shadow mt-0.5">
                    {newEvent.photo_limit}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBackToEdit}
                  className="btn-ghost"
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreate}
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Creating..." : "Create Event"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───── QR Code Modal (Step 3) ───── */}
        {qrModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeAllModals}
          >
            <div
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check size={20} className="text-emerald-600" />
              </div>

              <div>
                <h3 className="font-semibold text-lg text-deep-shadow">
                  {qrModal.name}
                </h3>
                <p className="text-xs text-whisper-gray mt-1">
                  Event created successfully!
                </p>
              </div>

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
                  <QrCode size={14} className="inline mr-2" />
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
                <button
                  onClick={() => {
                    closeAllModals();
                    router.push(`/admin/events/${qrModal.eventId}`);
                  }}
                  className="btn-primary block w-full text-center text-sm no-underline"
                >
                  Go to Event →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CreateEventCtx.Provider>
  );
}