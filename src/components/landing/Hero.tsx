// src/components/landing/Hero.tsx
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent" >
      {/* Gradient background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/gradient-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Decorative orbs */}
      <div
        className="gradient-orb absolute top-1/4 left-1/4 w-72 h-72"
      />
      <div
        className="gradient-orb absolute bottom-1/4 right-1/4 w-96 h-96 animate-float"
      />
      <div
        className="gradient-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 animate-float"
        style={{
          background: "rgb(165, 45, 37)",
          animationDelay: "2s",
        }}
      />

      {/* Content */}
      <div className="relative z-10 page-container text-center flex flex-col items-center gap-8 py-32">
        <p className="animate-fade-in-up text-xs lowercase border rounded-full px-7 py-1 text-black">
          Early Access
        </p>
        <div className="flex flex-col">
          <h1
            className="animate-fade-in-up font-raleway text-deep-shadow font-bold "
            style={{ fontSize: "var(--text-heading-lg)" }}
          >One event. Unlimited Perspective.</h1>
        </div>
        <p className="animate-fade-in-up-delayed text-whisper-gray text-md max-w-2xl leading-relaxed">
          What if you can see what others see at your event? <br/> Capture moments from every angle with our digitalize disposable camera.
          <br/>Early access available now!
        </p>

        <div className="animate-fade-in-up-more-delayed flex flex-col sm:flex-row gap-4 mt-4">
          <Link href="/signup" className="btn-primary no-underline min-w-[200px]">
            Get Started
          </Link>
          <a href="#services" className="btn-ghost no-underline min-w-[200px]">
            Learn More
          </a>
        </div>

      </div>
    </section>
  );
}