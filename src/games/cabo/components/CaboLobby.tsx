/**
 * Cabo — Lobby Component
 *
 * Online-only game. Host creates room, players join with code.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { useGameSessionStore } from '@/stores/gameSessionStore';
import { caboFacts } from '../rules';
import { defaultPlayerCount, playerCountOptions } from '@/game/core/rulesFacts';

export function CaboLobby() {
  const router = useRouter();
  const { cabo, setCabo } = useGameSessionStore();

  const [mode, setMode] = React.useState<'choose' | 'host' | 'join' | null>(null);
  const [playerCount, setPlayerCount] = React.useState(() => defaultPlayerCount(caboFacts, 3));
  const [targetScore, setTargetScore] = React.useState(50);
  const [hostName, setHostName] = React.useState('');
  const [joinCode, setJoinCode] = React.useState('');
  const [joinName, setJoinName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleHost = () => {
    if (!hostName.trim()) { setError('Enter your name'); return; }

    const hostId = `player-${Math.random().toString(36).slice(2, 8)}`;
    const players = [
      { id: hostId, name: hostName.trim(), seat: 0, isHuman: true },
      ...Array.from({ length: playerCount - 1 }, (_, i) => ({
        id: `player-slot-${i + 1}`,
        name: `Player ${i + 2}`,
        seat: i + 1,
        isHuman: true,
      })),
    ];

    setCabo({
      type: 'online-host',
      config: { players, options: { targetScore } },
      myPlayerId: hostId,
    });
    router.push('/games/cabo/play');
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) { setError('Enter a valid 6-letter room code'); return; }
    if (!joinName.trim()) { setError('Enter your name'); return; }

    const playerId = `player-${Math.random().toString(36).slice(2, 8)}`;
    setCabo({
      type: 'online-join',
      playerId,
      roomCode: code,
      playerName: joinName.trim(),
    });
    router.push('/games/cabo/play');
  };

  return (
    <div className="flex flex-col gap-4">
      {!mode && (
        <div className="flex flex-col gap-3">
          <Button size="lg" fullWidth onClick={() => setMode('host')}>
            Create Room (Host)
          </Button>
          <Button size="lg" fullWidth variant="secondary" onClick={() => setMode('join')}>
            Join Room
          </Button>
        </div>
      )}

      {mode === 'host' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--color-text))]">Create Game</h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[rgb(var(--color-text-muted))]">Your name</label>
            <input
              value={hostName}
              onChange={(e) => { setHostName(e.target.value); setError(null); }}
              placeholder="Enter your name"
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[rgb(var(--color-surface-sunken))] border border-[rgb(var(--color-border))]',
                'text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-muted))]',
                'focus:outline-none focus:border-[rgb(var(--color-primary))]',
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[rgb(var(--color-text-muted))]">
              Number of players: <strong className="text-[rgb(var(--color-text))]">{playerCount}</strong>
            </label>
            <input
              type="range"
              min={caboFacts.minPlayers}
              max={caboFacts.maxPlayers}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className="w-full accent-[rgb(var(--color-primary))]"
            />
            <div className="flex justify-between text-[10px] text-[rgb(var(--color-text-muted))]">
              {playerCountOptions(caboFacts).map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[rgb(var(--color-text-muted))]">
              Target score (game ends when reached): <strong className="text-[rgb(var(--color-text))]">{targetScore}</strong>
            </label>
            <input
              type="range"
              min={25}
              max={100}
              step={5}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-full accent-[rgb(var(--color-primary))]"
            />
            <div className="flex justify-between text-[10px] text-[rgb(var(--color-text-muted))]">
              <span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setMode(null); setError(null); }}>
              Back
            </Button>
            <Button fullWidth onClick={handleHost}>
              Create Room
            </Button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--color-text))]">Join Game</h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[rgb(var(--color-text-muted))]">Room code</label>
            <input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="Enter 6-letter code"
              maxLength={6}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm font-mono tracking-widest',
                'bg-[rgb(var(--color-surface-sunken))] border border-[rgb(var(--color-border))]',
                'text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-muted))] placeholder:tracking-normal',
                'focus:outline-none focus:border-[rgb(var(--color-primary))]',
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[rgb(var(--color-text-muted))]">Your name</label>
            <input
              value={joinName}
              onChange={(e) => { setJoinName(e.target.value); setError(null); }}
              placeholder="Enter your name"
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[rgb(var(--color-surface-sunken))] border border-[rgb(var(--color-border))]',
                'text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-muted))]',
                'focus:outline-none focus:border-[rgb(var(--color-primary))]',
              )}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setMode(null); setError(null); }}>
              Back
            </Button>
            <Button fullWidth onClick={handleJoin}>
              Join Room
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
