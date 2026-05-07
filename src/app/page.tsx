// src/app/page.tsx
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import AboutUs from "@/components/landing/AboutUs";
import Services from "@/components/landing/Services";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-frost-white">
      <Navbar />
      <Hero />
      <AboutUs />
      <Services />
      <CTA />
      <Footer />
    </main>
  );
}
