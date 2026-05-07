// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Raleway } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
  variable: "--font-inter",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-raleway",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Picture Us — Disposable Digital Camera for Events",
  description:
    "Capture memories at special events. A disposable digital camera experience — one-time payment, unlimited moments.",
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
    <html lang="en" className={`${inter.variable} ${raleway.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}