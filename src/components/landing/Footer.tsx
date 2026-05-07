// src/components/landing/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative py-16 border-t border-black/[0.06] bg-frost-white">
      <div className="page-container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <Link
              href="/"
              className="font-roobert text-deep-shadow text-subheading font-semibold no-underline hover:opacity-70 transition-opacity"
            >
              Picture Us
            </Link>
            <p className="text-caption text-whisper-gray">
              A disposable digital camera for your special events.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-caption text-whisper-gray no-underline hover:text-deep-shadow transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-caption text-whisper-gray no-underline hover:text-deep-shadow transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-caption text-whisper-gray no-underline hover:text-deep-shadow transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-caption text-whisper-gray/60">
            &copy; {new Date().getFullYear()} Picture Us. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}