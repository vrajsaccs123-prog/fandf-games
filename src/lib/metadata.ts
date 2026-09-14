/**
 * Shared Next.js Metadata helpers for global and per-game pages.
 */

import type { Metadata } from "next";
import type { GameMetadata } from "@/game/core/types";
import { getSiteUrl, siteConfig } from "./site";

const OG_IMAGE = {
  url: "/social/og-image.png",
  width: 1200,
  height: 630,
  alt: siteConfig.title,
} as const;

/** Default Open Graph / Twitter fields used across the site. */
function defaultSocialMetadata(): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: siteConfig.title,
      description: siteConfig.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.title,
      description: siteConfig.description,
      images: [OG_IMAGE.url],
    },
  };
}

/** Root layout metadata — single canonical favicon and social configuration. */
export function createRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteConfig.title,
      template: `%s — ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: siteConfig.shortName,
    },
    formatDetection: {
      telephone: false,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        {
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      shortcut: "/favicon.ico",
    },
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: siteUrl,
    },
    ...defaultSocialMetadata(),
  };
}

type PageMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
};

/** Metadata for static pages that inherit global branding. */
export function createPageMetadata(options: PageMetadataOptions = {}): Metadata {
  const { title, description = siteConfig.description, path = "/" } = options;
  const pageTitle = title ? `${title} — ${siteConfig.name}` : siteConfig.title;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: pageTitle,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/** Server-rendered metadata for individual game pages. */
export function createGameMetadata(
  game: GameMetadata,
  options: { playing?: boolean } = {}
): Metadata {
  const suffix = options.playing ? "/play" : "";
  const path = `/games/${game.id}${suffix}`;
  const ogTitle = `${game.name} — ${siteConfig.name}`;
  const description = `Play ${game.name} with your friends and family on F&F Games.`;
  const ogImagePath = `/games/${game.id}/opengraph-image`;

  return {
    title: game.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: ogTitle,
      description: game.shortDescription,
      url: path,
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: game.shortDescription,
      images: [ogImagePath],
    },
  };
}
