// src/components/landing/Navbar.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-frost-white backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="link-hover-reveal font-bold text-md no-underline px-1"
        >
          <span className="link-text-primary">picture-us</span>
          <span className="link-text-secondary">picture-us</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 lowercase">
          <a href="#about" className="link-hover-reveal px-1 text-sm">
            <span className="link-text-primary">about</span>
            <span className="link-text-secondary">about</span>
          </a>
          <a href="#services" className="link-hover-reveal px-1 text-sm">
            <span className="link-text-primary">services</span>
            <span className="link-text-secondary">services</span>
          </a>
          <a href="#cta" className="link-hover-reveal px-1 text-sm">
            <span className="link-text-primary">pricing</span>
            <span className="link-text-secondary">pricing</span>
          </a>
          <Link href="/login" className="link-hover-reveal px-1 text-sm">
            <span className="link-text-primary">sign-in</span>
            <span className="link-text-secondary">sign-in</span>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-black p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-midnight-canvas/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="page-container flex flex-col gap-4 py-6">
            <a
              href="#about"
              className="text-black  text-body py-2 no-underline"
              onClick={() => setMobileOpen(false)}
            >
              About
            </a>
            <a
              href="#services"
              className="text-black text-body py-2 no-underline"
              onClick={() => setMobileOpen(false)}
            >
              Services
            </a>
            <a
              href="#cta"
              className="text-frost-white text-body py-2 no-underline"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </a>
            <div className="flex flex-col gap-3 pt-3 border-t border-white/[0.06]">
              <Link
                href="/login"
                className="btn-ghost text-center no-underline"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="btn-primary text-center no-underline"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}