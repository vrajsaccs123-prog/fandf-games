/**
 * Global site configuration — branding, copy, and production URL.
 */

export const siteConfig = {
  name: "F&F Games",
  shortName: "F&F Games",
  title: "F&F Games — Games for Friends & Family",
  description:
    "F&F Games — fun, strategic games made to play with friends and family.",
  tagline: "Games for Friends & Family",
  themeColor: "#0c0a08",
  backgroundColor: "#0c0a08",
} as const;

/** Resolve the canonical site origin for metadata and OG URLs. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
