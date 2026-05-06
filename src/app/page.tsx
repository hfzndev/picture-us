// src/app/page.tsx
import Link from "next/link";
import { Camera } from "lucide-react";

export default function HomePage() {
  return (
    <main className="guest-screen items-center justify-center text-center gap-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 animate-fade-in-up">
        <div className="relative">
          <Camera
            size={64}
            className="text-[var(--color-amber-500)]"
            strokeWidth={1.5}
          />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-error)] rounded-full animate-pulse-amber" />
        </div>
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">
          Picture Us
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] max-w-xs leading-relaxed">
          A disposable digital camera for your special event.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3 w-full max-w-xs animate-fade-in-up">
        <Link href="/admin/events" className="btn-primary text-center no-underline">
          Create Your Event &rarr;
        </Link>
        <p className="text-sm text-[var(--color-text-muted)]">
          Have a guest code? Open your event link instead.
        </p>
      </div>

      {/* Footer */}
      <p className="text-xs text-[var(--color-text-muted)] mt-auto">
        Made with &hearts; for special moments
      </p>
    </main>
  );
}