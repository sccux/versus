'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { startRound } from '@/actions/round';
import { setPlayerReady } from '@/actions/room';

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
  color: string;
  is_ready: boolean;
}

interface Props {
  winner: 'artists' | 'imposters';
  scores: PlayerScore[];
  roomId: string;
  roundWord: string;
  players: ReadyPlayer[];
  currentPlayerId: string;
  isHost: boolean;
}

export default function RoundEndView({
  winner,
  scores,
  roomId,
  roundWord,
  players,
  currentPlayerId,
  isHost,
}: Props) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const startedRef = useRef(false);

  const me = players.find((p) => p.id === currentPlayerId);
  const isReady = me?.is_ready ?? false;
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

  // Once the countdown reaches 0, the host starts the next round
  useEffect(() => {
    if (countdown === 0 && !startedRef.current && isHost) {
      startedRef.current = true;
      startTransition(async () => {
        await startRound(roomId);
      });
    }
  }, [countdown, isHost, roomId]);

  function toggleReady() {
    setPlayerReady(currentPlayerId, !isReady);
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

        {countdown !== null ? (
          <div className="text-center py-3">
            <p className="text-gray-400 text-sm mb-1">Everyone&apos;s ready — next round in</p>
            <p className="text-4xl font-bold text-white">{countdown}</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-gray-400 text-sm font-medium">Waiting for everyone to be ready</p>
              </div>
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center px-4 py-3 border-b border-gray-800 last:border-0"
                >
                  <span className="flex-1 font-medium" style={{ color: p.color }}>
                    {p.nickname}
                    {p.id === currentPlayerId && ' (you)'}
                  </span>
                  <span className={`text-sm font-medium ${p.is_ready ? 'text-green-400' : 'text-gray-600'}`}>
                    {p.is_ready ? '✓ Ready' : 'Not ready'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={toggleReady}
              className={`w-full font-semibold rounded-xl py-3 transition-colors ${
                isReady
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-950 hover:bg-gray-100'
              }`}
            >
              {isReady ? 'Cancel' : "I'm Ready"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
