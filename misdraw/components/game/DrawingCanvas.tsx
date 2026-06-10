'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { StrokePoint } from '@/hooks/useGameChannel';

interface Props {
  isMyTurn: boolean;
  myPlayerId: string;
  myColor: string;
  frozen: boolean;
  onStrokePoint: (point: StrokePoint) => void;
  onStrokeEnd: () => void;
  showWaitingOverlay?: boolean;
}

export interface DrawingCanvasHandle {
  drawRemotePoint: (point: StrokePoint) => void;
  endRemoteStroke: (playerId: string) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { isMyTurn, myPlayerId, myColor, frozen, onStrokePoint, onStrokeEnd, showWaitingOverlay = true },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const remoteDrawing = useRef<Record<string, boolean>>({});
  const lastRemotePoint = useRef<Record<string, { x: number; y: number }>>({});
  const throttleRef = useRef<number>(0);
  const turnLockedRef = useRef(false);

  useEffect(() => {
    if (isMyTurn) turnLockedRef.current = false;
  }, [isMyTurn]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function drawSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string
  ) {
    const w = canvasRef.current!.width;
    const h = canvasRef.current!.height;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x * w, from.y * h);
    ctx.lineTo(to.x * w, to.y * h);
    ctx.stroke();
  }

  // Exposed directly so callers bypass React state batching
  useImperativeHandle(ref, () => ({
    drawRemotePoint(point: StrokePoint) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pid = point.player_id;
      if (point.is_start) {
        remoteDrawing.current[pid] = true;
        lastRemotePoint.current[pid] = { x: point.x, y: point.y };
      } else if (remoteDrawing.current[pid] && lastRemotePoint.current[pid]) {
        drawSegment(ctx, lastRemotePoint.current[pid], { x: point.x, y: point.y }, point.color);
        lastRemotePoint.current[pid] = { x: point.x, y: point.y };
      }
    },
    endRemoteStroke(playerId: string) {
      remoteDrawing.current[playerId] = false;
    },
  }));

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || frozen || turnLockedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getPos(e);
    lastPoint.current = pos;
    onStrokePoint({ player_id: myPlayerId, x: pos.x, y: pos.y, is_start: true, color: myColor });
  }, [isMyTurn, frozen, myPlayerId, myColor, onStrokePoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !isMyTurn || frozen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const now = Date.now();
    if (now - throttleRef.current < 16) return;
    throttleRef.current = now;

    const pos = getPos(e);
    drawSegment(ctx, lastPoint.current, pos, myColor);
    onStrokePoint({ player_id: myPlayerId, x: pos.x, y: pos.y, is_start: false, color: myColor });
    lastPoint.current = pos;
  }, [isMyTurn, frozen, myPlayerId, myColor, onStrokePoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    turnLockedRef.current = true;
    onStrokeEnd();
  }, [onStrokeEnd]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ink-panel paper-noise overflow-hidden ${frozen ? 'opacity-50 pointer-events-none' : ''}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="max-w-full max-h-full aspect-[4/3] bg-canvas rounded-lg touch-none"
        style={{ cursor: isMyTurn && !frozen ? 'crosshair' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {!isMyTurn && showWaitingOverlay && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="text-ink-muted text-sm bg-paper/70 border border-ink-muted px-3 py-1 rounded-full">
            waiting for your turn...
          </span>
        </div>
      )}
    </div>
  );
});

export default DrawingCanvas;
