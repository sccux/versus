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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-2">misdraw</h1>

        <div className="bg-gray-900 rounded-xl p-6 mb-4">
          <p className="text-gray-400 text-sm text-center mb-2">Room Code</p>
          <button
            onClick={copyCode}
            className="w-full text-3xl font-mono font-bold text-white text-center tracking-widest hover:text-gray-300 transition-colors"
          >
            {room.code}
          </button>
          <p className="text-gray-600 text-xs text-center mt-1">tap to copy</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <p className="text-gray-400 text-sm mb-3">
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
                    <span className="text-gray-500 text-xs ml-2">(you)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isPending || connectedPlayers.length < 3}
          className="w-full bg-white text-gray-950 font-semibold rounded-xl py-3 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
