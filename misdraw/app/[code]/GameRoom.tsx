'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { markConnected } from '@/actions/room';
import { startRound } from '@/actions/round';
import LobbyView from '@/components/lobby/LobbyView';
import GameView from '@/components/game/GameView';
import type { VoteResult } from '@/components/game/GameView';
import RoundEndView from '@/components/round/RoundEndView';
import { usePresence } from '@/hooks/usePresence';
import type { Player, Room, Round, RoundPlayer, VoteSession, Vote } from '@/lib/supabase/types';

interface Props {
  initialRoom: Room;
  initialPlayers: Player[];
}

export default function GameRoom({ initialRoom, initialPlayers }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [round, setRound] = useState<Round | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [activeVoteSession, setActiveVoteSession] = useState<VoteSession | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});
  const roundStartedRef = useRef(false);
  const currentPlayerIdRef = useRef('');

  const supabase = createClient();

  const myPlayer = players.find((p) => p.id === currentPlayerId);
  const myRoundPlayer = roundPlayers.find((rp) => rp.player_id === currentPlayerId);

  // Read player ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`misdraw_player_${initialRoom.code}`);
    if (stored) {
      currentPlayerIdRef.current = stored;
      setCurrentPlayerId(stored);
    }
  }, [initialRoom.code]);

  // Mark connected on mount, disconnected on unmount
  useEffect(() => {
    if (!currentPlayerId) return;
    markConnected(currentPlayerId, true);
    return () => { markConnected(currentPlayerId, false); };
  }, [currentPlayerId]);

  // Presence tracking
  usePresence(
    initialRoom.code,
    currentPlayerId,
    myPlayer?.nickname ?? '',
    myPlayer?.color ?? '',
    round?.id ?? null
  );

  // Room + players subscription
  useEffect(() => {
    const channel = supabase
      .channel(`gameroom:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        async (payload) => {
          const updated = payload.new as Room;
          // Only the host's client starts the round (prevents multi-client race)
          if (
            updated.status === 'playing' &&
            !roundStartedRef.current &&
            currentPlayerIdRef.current === updated.host_player_id
          ) {
            roundStartedRef.current = true;
            await startRound(room.id);
          }
          setRoom(updated);
        }
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

  // Fallback poll: if a postgres_changes event for `rooms` is missed/delayed,
  // a client can get stuck on "Starting round..." forever waiting for
  // current_round_id. Poll until it shows up.
  useEffect(() => {
    if (room.status !== 'playing' || room.current_round_id) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', room.id)
        .single();
      if (data && data.current_round_id) setRoom(data);
    }, 2000);

    return () => clearInterval(interval);
  }, [room.status, room.current_round_id, room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Round subscription (re-runs when current_round_id changes)
  useEffect(() => {
    if (!room.current_round_id) return;

    // Reset state for new round
    setVotes([]);
    setActiveVoteSession(null);
    setVoteResult(null);
    roundStartedRef.current = false;

    const fetchAll = async () => {
      const [{ data: r }, { data: rp }, { data: vs }] = await Promise.all([
        supabase.from('rounds').select('*').eq('id', room.current_round_id!).single(),
        supabase.from('round_players').select('*').eq('round_id', room.current_round_id!),
        supabase.from('vote_sessions').select('*').eq('round_id', room.current_round_id!).eq('status', 'active').maybeSingle(),
      ]);
      if (r) setRound(r);
      if (rp) setRoundPlayers(rp);
      if (vs !== undefined) setActiveVoteSession(vs);
    };

    fetchAll();

    const channel = supabase
      .channel(`round:${room.current_round_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `id=eq.${room.current_round_id}` },
        async () => {
          const { data } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', room.current_round_id!)
            .single();
          if (data) setRound(data);
        }
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vote_sessions', filter: `round_id=eq.${room.current_round_id}` },
        (payload) => {
          const session = payload.new as VoteSession;
          if (!session?.status) return;
          if (session.status === 'resolved') {
            setVoteResult({ id: session.id, killed_player_id: session.killed_player_id });
            setActiveVoteSession(null);
          } else if (session.status === 'active') {
            setActiveVoteSession(session);
            setVotes([]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.current_round_id]);

  // Subscribe to votes for the active vote session
  useEffect(() => {
    if (!activeVoteSession) return;

    const fetchVotes = async () => {
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('vote_session_id', activeVoteSession.id);
      if (data) setVotes(data);
    };

    fetchVotes();

    const channel = supabase
      .channel(`votes:${activeVoteSession.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `vote_session_id=eq.${activeVoteSession.id}` },
        (payload) => setVotes((prev) => [...prev, payload.new as Vote])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeVoteSession?.id]);

  // Force a fresh fetch of round state — used as a fallback when a postgres_changes
  // event for `rounds` is missed/delayed for a particular client
  const refreshRound = useCallback(async () => {
    if (!room.current_round_id) return;
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', room.current_round_id)
      .single();
    if (data) setRound(data);
  }, [room.current_round_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optimistically record a vote locally — postgres_changes INSERT events
  // for `votes` can be delayed/missed for the voter's own client
  const onVoteCast = useCallback((targetId: string) => {
    if (!activeVoteSession) return;
    setVotes((prev) => {
      if (prev.some((v) => v.voter_id === currentPlayerId)) return prev;
      return [
        ...prev,
        {
          id: `optimistic-${currentPlayerId}`,
          vote_session_id: activeVoteSession.id,
          voter_id: currentPlayerId,
          target_id: targetId,
          created_at: new Date().toISOString(),
        },
      ];
    });
  }, [activeVoteSession, currentPlayerId]);

  // Snapshot scores before round ends (for delta display)
  useEffect(() => {
    if (round?.status === 'finished') {
      const snapshot: Record<string, number> = {};
      players.forEach((p) => { snapshot[p.id] = p.score; });
      setPrevScores(snapshot);
    }
  }, [round?.status]);

  if (!currentPlayerId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (room.status === 'lobby') {
    return <LobbyView room={room} players={players} currentPlayerId={currentPlayerId} />;
  }

  if (round?.status === 'finished' && round.winner) {
    const scores = players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      color: p.color,
      score: p.score,
      scoreDelta: p.score - (prevScores[p.id] ?? p.score),
    }));
    return (
      <RoundEndView
        winner={round.winner}
        scores={scores}
        roomId={room.id}
        roundWord={round.word}
      />
    );
  }

  if (!round || roundPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Starting round...</p>
      </div>
    );
  }

  // Task 16: mid-game join waiting state
  const isWaitingForNextRound =
    room.status === 'playing' &&
    round.status !== 'finished' &&
    !myRoundPlayer;

  if (isWaitingForNextRound) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl font-medium mb-2">You&apos;re in!</p>
          <p className="text-gray-400">Waiting for the current round to finish...</p>
          <div className="mt-6 bg-gray-900 rounded-xl p-4">
            <p className="text-gray-500 text-sm mb-3">Players in this round:</p>
            {players
              .filter((p) => p.is_connected)
              .map((p) => (
                <p key={p.id} className="font-medium" style={{ color: p.color }}>
                  {p.nickname}
                </p>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameView
      room={{ id: room.id, code: room.code }}
      round={round}
      roundPlayers={roundPlayers}
      players={players}
      currentPlayerId={currentPlayerId}
      activeVoteSession={activeVoteSession}
      votes={votes}
      voteResult={voteResult}
      refreshRound={refreshRound}
      onVoteCast={onVoteCast}
    />
  );
}
