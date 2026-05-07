// src/components/landing/CTA.tsx
import Link from "next/link";

export default function CTA() {
  return (
    <section id="cta" className="relative py-24 overflow-hidden bg-frost-white">
      {/* Subtle gradient background image */}
      <div
        className="absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage: "url('/gradient-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 page-container flex flex-col items-center text-center gap-8">
        <p className="text-caption text-whisper-gray uppercase tracking-[0.15em]">
          Get Started
        </p>
        <h2
          className="font-raleway text-deep-shadow font-bold max-w-2xl"
          style={{
            fontSize: "var(--text-heading)",
            lineHeight: "var(--leading-heading)",
          }}
        >
          Ready to Capture Your Event?
        </h2>
        <p className="text-whisper-gray text-subheading max-w-lg leading-relaxed">
          Get started for free during early access and create your first event
          today. No payment required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href="/signup"
            className="btn-primary no-underline min-w-[200px]"
          >
            Create Your Event
          </Link>
          <Link
            href="/admin/login"
            className="btn-ghost no-underline min-w-[200px]"
          >
            Sign In
          </Link>
        </div>

        {/* Early access badge */}
        <div className="card-admin rounded-lg px-8 py-4 mt-4">
          <p className="text-caption text-whisper-gray">
            &#x1F389; Free during early access &middot; Full access to all features
          </p>
        </div>
      </div>
    </section>
  );
}