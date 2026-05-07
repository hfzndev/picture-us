// src/components/landing/Services.tsx
import { Camera, GalleryVertical, QrCode } from "lucide-react";

const services = [
  {
    icon: QrCode,
    title: "Event Creation",
    description:
      "Create your event, set the photo limit per guest, and generate a QR code. Share it with your guests via invitation or at the venue entrance.",
  },
  {
    icon: Camera,
    title: "Guest Photo Capture",
    description:
      "Guests scan your QR code, enter a code from the receptionist, and start capturing. Every photo auto-uploads in real-time — no apps, no accounts.",
  },
  {
    icon: GalleryVertical,
    title: "Live Gallery",
    description:
      "Watch your event gallery grow in real-time. See every candid moment as it happens. After the event, export all photos and read personal messages from your guests.",
  },
];

export default function Services() {
  return (
    <section id="services" className="relative py-24 overflow-hidden bg-frost-white">
      <div className="page-container flex flex-col gap-16">
        {/* Section header */}
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-caption text-whisper-gray uppercase tracking-[0.15em]">
            How It Works
          </p>
          <h2
            className="font-raleway text-deep-shadow font-bold"
            style={{
              fontSize: "var(--text-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
            Simple, intentional, beautiful
          </h2>
          <p className="text-whisper-gray text-body max-w-lg leading-relaxed">
            Everything you need to capture your special event from every guest's
            perspective.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="card-admin flex flex-col gap-5"
              >
                <div className="w-11 h-11 rounded-full bg-black/5 flex items-center justify-center">
                  <Icon size={20} className="text-deep-shadow" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-whisper-gray/60 uppercase tracking-widest">
                    Step {i + 1}
                  </p>
                  <h3
                    className="font-roobert text-deep-shadow font-semibold"
                    style={{ fontSize: "var(--text-subheading)" }}
                  >
                    {service.title}
                  </h3>
                  <p className="text-whisper-gray text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}