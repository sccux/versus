'use client';

import { useTransition } from 'react';
import { startGame } from '@/actions/room';
import type { Player, Room } from '@/lib/supabase/types';

interface Props {
  room: Room;
  players: Player[];
  currentPlayerId: string;
}

export default function LobbyView({ room, players, currentPlayerId }: Props) {
  const [isPending, startTransition] = useTransition();
  const connectedPlayers = players.filter((p) => p.is_connected);

  function handleStart() {
    startTransition(async () => {
      await startGame(room.id);
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code);
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="font-hand text-4xl text-ink text-center mb-2">misdraw</h1>

        <div className="ink-panel p-6 mb-4">
          <p className="text-ink-muted text-sm text-center mb-2">Room Code</p>
          <button
            onClick={copyCode}
            className="w-full border-2 border-dashed border-ink rounded-lg px-4 py-2 font-hand text-2xl text-ink text-center tracking-widest hover:bg-ink/10 transition-colors"
          >
            {room.code}
          </button>
          <p className="text-ink-muted text-xs text-center mt-1">tap to copy</p>
        </div>

        <div className="ink-panel p-4 mb-4">
          <p className="text-ink-muted text-sm mb-3">
            Players ({connectedPlayers.length}/10)
          </p>
          <div className="space-y-2">
            {connectedPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span
                  className="font-medium"
                  style={{ color: p.color }}
                >
                  {p.nickname}
                  {p.id === currentPlayerId && (
                    <span className="text-ink-muted text-xs ml-2">(you)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isPending || connectedPlayers.length < 3}
          className="w-full border-2 border-ink rounded-xl text-ink font-semibold py-3 hover:bg-ink/10 transition-colors disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed"
        >
          {connectedPlayers.length < 3
            ? `Need ${3 - connectedPlayers.length} more player${3 - connectedPlayers.length === 1 ? '' : 's'}`
            : isPending
            ? 'Starting...'
            : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
