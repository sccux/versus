'use client';

import CouchLobby from './CouchLobby';
import CouchGameView from './CouchGameView';
import type { VoteResult } from './CouchGameView';
import CouchRoundEnd from './CouchRoundEnd';
import type { Player, Room, Round, RoundPlayer, Vote, VoteSession } from '@/lib/supabase/types';

interface Props {
  room: Room;
  players: Player[];
  round: Round | null;
  roundPlayers: RoundPlayer[];
  activeVoteSession: VoteSession | null;
  votes: Vote[];
  voteResult: VoteResult | null;
  prevScores: Record<string, number>;
}

export default function CouchHostView({
  room,
  players,
  round,
  roundPlayers,
  activeVoteSession,
  votes,
  voteResult,
  prevScores,
}: Props) {
  if (room.status === 'lobby') {
    return <CouchLobby room={room} players={players} />;
  }

  if (round?.status === 'finished' && round.winner) {
    const scores = players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      color: p.color,
      score: p.score,
      scoreDelta: p.score - (prevScores[p.id] ?? p.score),
    }));
    const readyPlayers = players
      .filter((p) => p.is_connected)
      .map((p) => ({ id: p.id, nickname: p.nickname, is_ready: p.is_ready }));
    return (
      <CouchRoundEnd
        winner={round.winner}
        scores={scores}
        roundWord={round.word}
        roomId={room.id}
        players={readyPlayers}
      />
    );
  }

  if (!round || roundPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-muted">Starting round...</p>
      </div>
    );
  }

  return (
    <CouchGameView
      room={{ id: room.id, code: room.code }}
      round={round}
      roundPlayers={roundPlayers}
      players={players}
      activeVoteSession={activeVoteSession}
      votes={votes}
      voteResult={voteResult}
    />
  );
}
