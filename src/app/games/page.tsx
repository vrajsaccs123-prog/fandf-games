/**
 * /games — Game catalogue page.
 *
 * The main discovery surface. Shows all games with filtering.
 * Server component for the shell; client components handle filtering.
 */

import { AppShell } from "@/components/layout/AppShell";
import { createPageMetadata } from "@/lib/metadata";
import { CatalogueClient } from "./CatalogueClient";
import { getAllGames } from "@/catalogue/gameRegistry";

export const metadata = createPageMetadata({
  title: "Games",
  description:
    "Browse and discover fun, strategic games to play with friends and family on F&F Games.",
  path: "/games",
});

export default function GamesPage() {
  // Fetch metadata on the server — no async needed, registry is static
  const games = getAllGames();

  return (
    <AppShell>
      <CatalogueClient initialGames={games} />
    </AppShell>
  );
}
