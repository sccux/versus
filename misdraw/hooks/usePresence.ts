'use client';

import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { handlePlayerDrop } from '@/actions/round';

export interface PresencePlayer {
  player_id: string;
  nickname: string;
  color: string;
}

export function usePresence(
  roomCode: string,
  currentPlayerId: string,
  nickname: string,
  color: string,
  roundId: string | null
) {
  const [presentPlayers, setPresentPlayers] = useState<PresencePlayer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!currentPlayerId) return;

    const channel = supabase.channel(`presence:${roomCode}`, {
      config: { presence: { key: currentPlayerId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresencePlayer>();
        setPresentPlayers(Object.values(state).flat());
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (!roundId) return;
        leftPresences.forEach((p) => {
          const player = p as unknown as PresencePlayer;
          if (player.player_id && player.player_id !== currentPlayerId) {
            handlePlayerDrop(player.player_id, roundId);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ player_id: currentPlayerId, nickname, color });
        }
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomCode, currentPlayerId, nickname, color, roundId]);

  return presentPlayers;
}
