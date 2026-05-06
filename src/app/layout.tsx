// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Nunito, Space_Mono, Caveat } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-nunito",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-caveat",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FEF9F0",
};

export const metadata: Metadata = {
  title: "Picture Us — Disposable Digital Camera",
  description:
    "Capture memories at special events. Scan, snap, and share — like a disposable camera, but digital.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Picture Us",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${spaceMono.variable} ${caveat.variable}`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}