import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sam & Sarah",
  description: "A little adventure for the wedding of Sam & Sarah.",
  robots: { index: false, follow: false },
  applicationName: "Sam & Sarah",
  // iOS Safari ignores the manifest's `display`; these meta tags are what
  // actually launch the home-screen install without the browser chrome.
  appleWebApp: {
    capable: true,
    title: "Sam & Sarah",
    statusBarStyle: "black-translucent",
  },
  // Next 16 only emits the modern `mobile-web-app-capable`; older iOS still
  // needs the legacy tag to launch without Safari chrome.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#fb7185",
  // Let the game draw under the notch / safe areas in fullscreen.
  viewportFit: "cover",
  // Lock the game viewport — no accidental pinch-zoom mid-battle.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Browser extensions inject attributes (e.g. __gcrremoteframetoken) onto
      // <html> before React hydrates, causing a benign attribute-level mismatch.
      // Scoped to this element only — it won't mask real mismatches in children.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-screen antialiased`}
    >
      <body className="flex flex-col">{children}</body>
    </html>
  );
}
