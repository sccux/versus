'use client';

import { useState, useTransition } from 'react';
import { startGame } from '@/actions/room';
import QRCode from '@/components/game/QRCode';
import type { Player, Room } from '@/lib/supabase/types';

interface Props {
  room: Room;
  players: Player[];
}

export default function CouchLobby({ room, players }: Props) {
  const [isPending, startTransition] = useTransition();
  const [joinUrl, setJoinUrl] = useState('');
  const connectedPlayers = players.filter((p) => p.is_connected);

  if (typeof window !== 'undefined' && !joinUrl) {
    setJoinUrl(`${window.location.origin}/${room.code}`);
  }

  function handleStart() {
    startTransition(async () => {
      await startGame(room.id);
    });
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="text-center">
          <h1 className="font-hand text-5xl text-ink mb-2">misdraw</h1>
          <p className="text-ink-muted mb-6 text-sm">🛋️ Couch Mode — scan or enter the code to join</p>

          <div className="ink-panel p-6 mb-4">
            <p className="text-ink-muted text-sm mb-2">Room Code</p>
            <p className="font-hand text-4xl text-ink tracking-widest">{room.code}</p>
          </div>

          {joinUrl && (
            <div className="flex justify-center mb-4">
              <QRCode value={joinUrl} size={200} />
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={isPending || connectedPlayers.length < 3}
            className="w-full border-2 border-ink rounded-xl text-ink font-semibold py-3 hover:bg-ink/10 transition-colors disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed"
          >
            {connectedPlayers.length < 3
              ? 'At least 3 players required'
              : isPending
              ? 'Starting...'
              : 'Start Game'}
          </button>
        </div>

        <div className="ink-panel p-4">
          <p className="text-ink-muted text-sm mb-3">
            Players ({connectedPlayers.length}/10)
          </p>
          <div className="space-y-2">
            {connectedPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-medium" style={{ color: p.color }}>{p.nickname}</span>
              </div>
            ))}
            {connectedPlayers.length === 0 && (
              <p className="text-ink-muted text-sm">Waiting for players to join...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
