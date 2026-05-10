"use client";
// picture-us/src/components/admin/create-event-modal.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  ArrowLeft, 
  Check, 
  QrCode, 
  Calendar,
  Camera,
  LayoutDashboard,
  Copy
} from "lucide-react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Step = "form" | "confirm" | "success";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState<Step>("form");
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    event_date: "",
    photo_limit: 8,
    theme_color: "amber",
  });
  const [successData, setSuccessData] = useState<{
    eventId: string;
    name: string;
    guestUrl: string;
    receptionistUrl: string;
    qrDataUrl: string;
  } | null>(null);

  const reset = () => {
    setStep("form");
    setCreating(false);
    setNewEvent({ name: "", event_date: "", photo_limit: 8, theme_color: "amber" });
    setSuccessData(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name.trim() || !newEvent.event_date) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
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
      alert(`Failed to create event: ${error?.message || "Unknown error"}`);
      setCreating(false);
      return;
    }

    const guestUrl = `${window.location.origin}/e/${event.id}`;
    const receptionistUrl = `${window.location.origin}/admin/receptionist?event=${event.id}&token=${event.receptionist_token}`;
    const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 256 });

    setSuccessData({
      eventId: event.id,
      name: event.name,
      guestUrl,
      receptionistUrl,
      qrDataUrl,
    });
    setStep("success");
    setCreating(false);
    router.refresh();
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden bg-zinc-950 border-zinc-800 p-0 text-zinc-100">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Calendar size={20} />
                  </div>
                  New Event
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Event Name</label>
                  <input
                    required
                    autoFocus
                    placeholder="e.g. Sarah's Wedding"
                    className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Event Date</label>
                  <input
                    required
                    type="date"
                    className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all [color-scheme:dark]"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Photos Per Guest</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                    value={newEvent.photo_limit}
                    onChange={(e) => setNewEvent({ ...newEvent, photo_limit: parseInt(e.target.value) || 8 })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 group"
                >
                  Review Details
                  <ArrowLeft size={18} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <button 
                    onClick={() => setStep("form")}
                    className="p-2 -ml-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  Confirm Details
                </DialogTitle>
              </DialogHeader>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</p>
                    <p className="text-lg font-medium text-zinc-100 mt-1">{newEvent.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</p>
                    <p className="font-medium text-zinc-100 mt-1">
                      {new Date(newEvent.event_date).toLocaleDateString(undefined, { 
                        month: "short", day: "numeric", year: "numeric" 
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Limit</p>
                    <p className="font-medium text-zinc-100 mt-1">{newEvent.photo_limit} photos/guest</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                disabled={creating}
                className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <div className="h-5 w-5 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    Create Event
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === "success" && successData && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-zinc-100">Ready to go!</h3>
                <p className="text-zinc-400">"{successData.name}" has been created.</p>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl">
                <img src={successData.qrDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(successData.guestUrl);
                    alert("Copied!");
                  }}
                  className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 py-3 rounded-xl border border-zinc-800 transition-all"
                >
                  <Copy size={16} />
                  Copy Guest Link
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/admin/events/${successData.eventId}`);
                  }}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold py-3 rounded-xl transition-all"
                >
                  <LayoutDashboard size={16} />
                  Go to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
