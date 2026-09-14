import type { Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { createRootMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { Providers } from "./providers";
import "@/styles/globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata = createRootMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: siteConfig.themeColor },
    { media: "(prefers-color-scheme: light)", color: siteConfig.themeColor },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Prevent zoom on input focus (iOS)
  maximumScale: 1,
  // Extend layout into safe areas on notched devices (standalone PWA)
  viewportFit: "cover",
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
