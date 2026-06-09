'use client';

import { useEffect, useState, useTransition } from 'react';
import { startRound } from '@/actions/round';

interface PlayerScore {
  id: string;
  nickname: string;
  color: string;
  score: number;
  scoreDelta: number;
}

interface Props {
  winner: 'artists' | 'imposters';
  scores: PlayerScore[];
  roomId: string;
  roundWord: string;
}

export default function RoundEndView({ winner, scores, roomId, roundWord }: Props) {
  const [countdown, setCountdown] = useState(5);
  const [isPending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown === 0 && !started) {
      setStarted(true);
      startTransition(async () => {
        await startRound(roomId);
      });
    }
  }, [countdown, started, roomId]);

  function handleNext() {
    if (started) return;
    setStarted(true);
    startTransition(async () => {
      await startRound(roomId);
    });
  }

  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div
          className={`text-center mb-6 p-6 rounded-2xl ${
            winner === 'artists' ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}
        >
          <p className="text-gray-400 text-sm mb-1">Round over</p>
          <h2
            className={`text-3xl font-bold ${
              winner === 'artists' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {winner === 'artists' ? '🎨 Artists Win!' : '🕵️ Imposters Win!'}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            The word was: <span className="text-white font-medium">{roundWord}</span>
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-gray-400 text-sm font-medium">Scoreboard</p>
          </div>
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center px-4 py-3 border-b border-gray-800 last:border-0"
            >
              <span className="text-gray-600 text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-medium" style={{ color: p.color }}>
                {p.nickname}
              </span>
              <div className="flex items-center gap-2">
                {p.scoreDelta > 0 && (
                  <span className="text-green-400 text-sm">+{p.scoreDelta}</span>
                )}
                <span className="text-white font-bold">{p.score}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={isPending || started}
          className="w-full bg-white text-gray-950 font-semibold rounded-xl py-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {isPending || started ? 'Starting...' : `Start Now (${countdown}s)`}
        </button>
      </div>
    </div>
  );
}
