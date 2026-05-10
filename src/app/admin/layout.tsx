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
  LayoutDashboard,
  BookOpenText,
} from "lucide-react";
import { CreateEventModal } from "@/components/admin/create-event-modal";

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
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);

  // Derive selected event from URL path segments
  const match = pathname.match(
    /\/admin\/(?:gallery|guests|recycle-bin|events|codes)\/([a-f0-9-]+)/
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

  // Fetch event name when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEventName(null);
      return;
    }
    fetch(`/api/events/${selectedEventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSelectedEventName(d.data.name);
      })
      .catch(() => {});
  }, [selectedEventId]);

  // --- Create Event Modal State ---
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
          label: "Receptionist",
          icon: BookOpenText,
        },
        {
          href: `/admin/codes/${selectedEventId}`,
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
    setCreateModalOpen(true);
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
          className={`fixed lg:sticky top-0 left-0 z-50 h-dvh w-60 border-r border-gray-200 bg-frost-white text-black flex flex-col shrink-0 transition-transform duration-300 ease-out ${
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
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-misty-gray mb-2 border-gray-200 ">
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
                      ? "bg-amber-500/15 text-amber-400 border-white border"
                      : "text-black border border-white hover:border-amber-600 hover:text-amber-600"
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 w-full text-left text-black hover:border-amber-600 border border-white hover:text-amber-600 cursor-pointer"
            >
              <Plus size={18} strokeWidth={1.5} />
              Create Event
            </button>
            <div className="pt-3 mt-3 border-t border-gray-200"></div>

            {/* Separator + Event Nav */}
            {selectedEventId && (
              <div className="gap-1 flex flex-col" >
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-misty-gray mb-2 truncate">
                  {selectedEventName ?? "Loading..."}
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
                          ? "bg-amber-500/15 text-amber-600 hover:border-amber-600 border border-transparent"
                          : "text-black border border-white hover:border-amber-600 hover:text-amber-600"
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

        <CreateEventModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      </div>
    </CreateEventCtx.Provider>
  );
}