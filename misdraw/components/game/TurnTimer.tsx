'use client';

import { useEffect, useState, useRef } from 'react';

interface Props {
  turnStartedAt: string | null;
  currentTurnPlayerId: string | null;
  myPlayerId: string;
  players: { id: string; nickname: string; color: string }[];
  onTurnEnd: () => void;
}

const COUNTDOWN_MS = 3000;
const DRAW_MS = 15000;

export default function TurnTimer({
  turnStartedAt,
  currentTurnPlayerId,
  myPlayerId,
  players,
  onTurnEnd,
}: Props) {
  const [phase, setPhase] = useState<'countdown' | 'drawing' | 'idle'>('idle');
  const [countdownNum, setCountdownNum] = useState(3);
  const [progress, setProgress] = useState(1);
  const turnEndFiredRef = useRef(false);
  const isMyTurn = currentTurnPlayerId === myPlayerId;

  const currentPlayer = players.find((p) => p.id === currentTurnPlayerId);

  useEffect(() => {
    if (!turnStartedAt || !currentTurnPlayerId) {
      setPhase('idle');
      return;
    }

    turnEndFiredRef.current = false;
    const drawStart = new Date(turnStartedAt).getTime();
    const drawEnd = drawStart + DRAW_MS;

    const tick = () => {
      const now = Date.now();
      if (now < drawStart) {
        setPhase('countdown');
        const remaining = Math.ceil((drawStart - now) / 1000);
        setCountdownNum(Math.min(3, Math.max(1, remaining)));
      } else if (now < drawEnd) {
        setPhase('drawing');
        setProgress(1 - (now - drawStart) / DRAW_MS);
      } else {
        setPhase('idle');
        setProgress(0);
        if (isMyTurn && !turnEndFiredRef.current) {
          turnEndFiredRef.current = true;
          onTurnEnd();
        }
      }
    };

    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [turnStartedAt, currentTurnPlayerId, isMyTurn, onTurnEnd]);

  if (phase === 'idle') return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
          <div className="text-center">
            <p className="text-ink text-sm mb-1">
              {isMyTurn ? 'Your turn!' : `${currentPlayer?.nickname ?? '...'}'s turn`}
            </p>
            <p
              className="font-hand text-8xl"
              style={{ color: currentPlayer?.color ?? 'var(--color-ink)' }}
            >
              {countdownNum}
            </p>
          </div>
        </div>
      )}
      {phase === 'drawing' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-ink-muted rounded-b-lg overflow-hidden">
          <div
            className="h-full transition-none rounded-b-lg"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: currentPlayer?.color ?? 'var(--color-ink)',
            }}
          />
        </div>
      )}
    </div>
  );
}
