'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { markConnected } from '@/actions/room';
import LobbyView from '@/components/lobby/LobbyView';
import type { Player, Room, Round, RoundPlayer } from '@/lib/supabase/types';

interface Props {
  initialRoom: Room;
  initialPlayers: Player[];
}

export default function GameRoom({ initialRoom, initialPlayers }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [round, setRound] = useState<Round | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState('');

  const supabase = createClient();

  // Read player ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`misdraw_player_${initialRoom.code}`);
    if (stored) setCurrentPlayerId(stored);
  }, [initialRoom.code]);

  // Mark connected on mount, disconnected on unmount
  useEffect(() => {
    if (!currentPlayerId) return;
    markConnected(currentPlayerId, true);
    return () => { markConnected(currentPlayerId, false); };
  }, [currentPlayerId]);

  // Subscribe to room + player changes
  useEffect(() => {
    const channel = supabase
      .channel(`gameroom:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at');
          if (data) setPlayers(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  // Subscribe to round changes when a round is active
  useEffect(() => {
    if (!room.current_round_id) return;

    const fetchRound = async () => {
      const { data: roundData } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', room.current_round_id!)
        .single();
      if (roundData) setRound(roundData);

      const { data: rpData } = await supabase
        .from('round_players')
        .select('*')
        .eq('round_id', room.current_round_id!);
      if (rpData) setRoundPlayers(rpData);
    };

    fetchRound();

    const channel = supabase
      .channel(`round:${room.current_round_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `id=eq.${room.current_round_id}` },
        (payload) => setRound(payload.new as Round)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_players', filter: `round_id=eq.${room.current_round_id}` },
        async () => {
          const { data } = await supabase
            .from('round_players')
            .select('*')
            .eq('round_id', room.current_round_id!);
          if (data) setRoundPlayers(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.current_round_id]);

  if (!currentPlayerId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (room.status === 'lobby') {
    return (
      <LobbyView
        room={room}
        players={players}
        currentPlayerId={currentPlayerId}
      />
    );
  }

  // Game and round-end views wired in Task 15
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Game in progress... (wired in Task 15)</p>
    </div>
  );
}
