// src/components/landing/AboutUs.tsx
export default function AboutUs() {
  return (
    <section id="about" className="relative py-24 overflow-hidden bg-frost-white">
      <div className="page-container">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
          {/* Left: Text */}
          <div className="flex-1 flex flex-col gap-6">
            <p className="text-caption text-whisper-gray uppercase tracking-[0.15em]">
              About Us
            </p>
            <h2
              className="font-raleway text-deep-shadow font-bold"
              style={{
                fontSize: "var(--text-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              Picture Us?
            </h2>
            <div className="flex flex-col gap-4 text-whisper-gray text-body leading-relaxed">
              <p>
                We believe every special moment deserves to be captured from
                every angle — not just the professional photographer's
                curated shots. Weddings, birthdays, reunions: these are the
                moments where candid, unfiltered joy lives.
              </p>
              <p>
                Picture Us gives your guests a disposable digital camera
                experience. No app to install, no accounts to create. Just scan,
                snap, and share — with a per-guest photo limit that makes every
                shot intentional.
              </p>
              <p>
                After the event, you get a real-time gallery of every photo,
                plus personal farewell messages from your guests. Free during
                early access. Countless memories.
              </p>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="flex-1 hidden md:block">
            <div
              className="rounded-2xl w-full aspect-[4/3] shadow-lg"
              style={{
                backgroundImage: "url('/gradient-bg.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}