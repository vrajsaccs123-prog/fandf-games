/**
 * /games/[gameId]/play — dedicated full-screen game play page.
 *
 * The lobby page (/games/[gameId]) sets up player config and writes it to the
 * gameSessionStore, then navigates here.  If no session exists the client
 * component redirects back to the lobby automatically.
 */

import type { Metadata } from "next";
import { getGameById } from "@/catalogue/gameRegistry";
import { createGameMetadata } from "@/lib/metadata";
import { notFound } from "next/navigation";
import { GamePlayClient } from "./GamePlayClient";

interface GamePlayPageProps {
  params: Promise<{ gameId: string }>;
}

export async function generateMetadata({ params }: GamePlayPageProps): Promise<Metadata> {
  const { gameId } = await params;
  const game = getGameById(gameId);
  if (!game) return { title: "Game not found" };
  return createGameMetadata(game, { playing: true });
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const { gameId } = await params;
  const game = getGameById(gameId);

  if (!game) notFound();

  // No AppShell — game table uses the full viewport.
  return <GamePlayClient gameId={gameId} />;
}
