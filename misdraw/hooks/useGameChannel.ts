'use client';

import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface StrokePoint {
  player_id: string;
  x: number;
  y: number;
  is_start: boolean;
  color: string;
}

export interface ChatMessage {
  player_id: string;
  nickname: string;
  text: string;
  is_dead: boolean;
  color: string;
  timestamp: number;
}

interface UseGameChannelOptions {
  roomCode: string;
  onStrokePoint: (point: StrokePoint) => void;
  onStrokeEnd: (playerId: string) => void;
  onChatMessage: (msg: ChatMessage) => void;
}

export function useGameChannel({
  roomCode,
  onStrokePoint,
  onStrokeEnd,
  onChatMessage,
}: UseGameChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`);

    channel
      .on('broadcast', { event: 'stroke_point' }, ({ payload }) => {
        onStrokePoint(payload as StrokePoint);
      })
      .on('broadcast', { event: 'stroke_end' }, ({ payload }) => {
        onStrokeEnd((payload as { player_id: string }).player_id);
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        onChatMessage(payload as ChatMessage);
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  const broadcastStrokePoint = useCallback((point: StrokePoint) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stroke_point',
      payload: point,
    });
  }, []);

  const broadcastStrokeEnd = useCallback((playerId: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stroke_end',
      payload: { player_id: playerId },
    });
  }, []);

  const broadcastChatMessage = useCallback((msg: ChatMessage) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg,
    });
  }, []);

  return { broadcastStrokePoint, broadcastStrokeEnd, broadcastChatMessage };
}
