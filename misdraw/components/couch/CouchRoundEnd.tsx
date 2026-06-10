'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { startRound } from '@/actions/round';

interface PlayerScore {
  id: string;
  nickname: string;
  color: string;
  score: number;
  scoreDelta: number;
}

interface ReadyPlayer {
  id: string;
  nickname: string;
  is_ready: boolean;
}

interface Props {
  winner: 'artists' | 'imposters';
  scores: PlayerScore[];
  roundWord: string;
  roomId: string;
  players: ReadyPlayer[];
}

export default function CouchRoundEnd({ winner, scores, roundWord, roomId, players }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const startedRef = useRef(false);

  const allReady = players.length > 0 && players.every((p) => p.is_ready);

  // Start the 3-2-1 countdown once everyone is ready
  useEffect(() => {
    if (!allReady) {
      setCountdown(null);
      return;
    }
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [allReady]);

  // Once the countdown reaches 0, the TV (always the round trigger in couch mode) starts the next round
  useEffect(() => {
    if (countdown === 0 && !startedRef.current) {
      startedRef.current = true;
      startTransition(async () => {
        await startRound(roomId);
      });
    }
  }, [countdown, roomId]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ink-panel text-center mb-6 p-6">
          <p className="text-ink-muted text-sm mb-1">Round over</p>
          <h2
            className={`font-hand text-3xl ${
              winner === 'artists' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {winner === 'artists' ? '🎨 Artists Win!' : '🕵️ Imposters Win!'}
          </h2>
          <p className="text-ink-muted text-sm mt-2">
            The word was: <span className="text-ink font-medium">{roundWord}</span>
          </p>
        </div>

        <div className="ink-panel overflow-hidden mb-4">
          <div className="px-4 py-3 ink-divider">
            <p className="text-ink-muted text-sm font-medium">Scoreboard</p>
          </div>
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center px-4 py-3 ink-divider last:border-0">
              <span className="text-ink-muted text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-medium" style={{ color: p.color }}>{p.nickname}</span>
              <div className="flex items-center gap-2">
                {p.scoreDelta > 0 && <span className="text-green-400 text-sm">+{p.scoreDelta}</span>}
                <span className="text-ink font-bold">{p.score}</span>
              </div>
            </div>
          ))}
        </div>

        {countdown !== null ? (
          <div className="text-center py-3">
            <p className="text-ink-muted text-sm mb-1">Everyone&apos;s ready — next round in</p>
            <p className="font-hand text-5xl text-ink">{countdown}</p>
          </div>
        ) : (
          <div className="ink-panel overflow-hidden">
            <div className="px-4 py-3 ink-divider">
              <p className="font-hand text-lg">Waiting for everyone to be ready</p>
            </div>
            {players.map((p) => (
              <div key={p.id} className="flex items-center px-4 py-3 ink-divider last:border-0">
                <span className="flex-1 font-medium">{p.nickname}</span>
                <span className={`text-sm font-medium ${p.is_ready ? 'text-green-400' : 'text-ink-muted'}`}>
                  {p.is_ready ? '✓ Ready' : 'Not ready'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
