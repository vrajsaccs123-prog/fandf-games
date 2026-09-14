/**
 * /games/[gameId] — Game detail / pre-game lobby page.
 *
 * Shows game artwork, description, metadata, rules preview, and
 * the "Start game" action. Server renders the metadata; client
 * handles the start flow.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { createGameMetadata } from "@/lib/metadata";
import { GameDetailClient } from "./GameDetailClient";
import { getGameById } from "@/catalogue/gameRegistry";

interface GameDetailPageProps {
  params: Promise<{ gameId: string }>;
}

export async function generateMetadata({
  params,
}: GameDetailPageProps): Promise<Metadata> {
  const { gameId } = await params;
  const game = getGameById(gameId);
  if (!game) return { title: "Game not found" };
  return createGameMetadata(game);
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const { gameId } = await params;
  const game = getGameById(gameId);

  if (!game) notFound();

  return (
    <AppShell>
      <GameDetailClient game={game} />
    </AppShell>
  );
}
