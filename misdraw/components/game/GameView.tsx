'use client';

import { useState, useCallback, useTransition } from 'react';
import DrawingCanvas from './DrawingCanvas';
import ChatPanel from './ChatPanel';
import PlayerTopBar from './PlayerTopBar';
import ControlsBar from './ControlsBar';
import TurnTimer from './TurnTimer';
import VotingOverlay from './VotingOverlay';
import RoleReveal from './RoleReveal';
import { useGameChannel } from '@/hooks/useGameChannel';
import { advanceTurn } from '@/actions/round';
import type { StrokePoint, ChatMessage } from '@/hooks/useGameChannel';
import type { Player, Round, RoundPlayer, VoteSession, Vote } from '@/lib/supabase/types';

interface Props {
  room: { id: string; code: string };
  round: Round;
  roundPlayers: RoundPlayer[];
  players: Player[];
  currentPlayerId: string;
  activeVoteSession: VoteSession | null;
  votes: Vote[];
}

export default function GameView({
  room,
  round,
  roundPlayers,
  players,
  currentPlayerId,
  activeVoteSession,
  votes,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastStrokePoint, setLastStrokePoint] = useState<StrokePoint | null>(null);
  const [lastStrokeEnd, setLastStrokeEnd] = useState<string | null>(null);
  const [roleRevealDismissed, setRoleRevealDismissed] = useState(false);
  const [, startTransition] = useTransition();

  const myRoundPlayer = roundPlayers.find((rp) => rp.player_id === currentPlayerId);
  const isMyTurn = round.current_turn_player_id === currentPlayerId;
  const isAlive = myRoundPlayer?.is_alive ?? false;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const myPlayer = playerMap[currentPlayerId];

  const aliveRoundPlayers = roundPlayers.filter((rp) => rp.is_alive);
  const aliveArtists = aliveRoundPlayers.filter((rp) => rp.role === 'artist').length;
  const aliveImposters = aliveRoundPlayers.filter((rp) => rp.role === 'imposter').length;

  const fellowImposters =
    myRoundPlayer?.role === 'imposter'
      ? aliveRoundPlayers
          .filter((rp) => rp.role === 'imposter' && rp.player_id !== currentPlayerId)
          .map((rp) => playerMap[rp.player_id])
          .filter(Boolean)
          .map((p) => ({ nickname: p.nickname, color: p.color }))
      : [];

  const alivePlayers = aliveRoundPlayers
    .map((rp) => playerMap[rp.player_id])
    .filter(Boolean)
    .map((p) => ({ id: p.id, nickname: p.nickname, color: p.color }));

  const voteEntries = votes.map((v) => ({ voter_id: v.voter_id, target_id: v.target_id }));

  const { broadcastStrokePoint, broadcastStrokeEnd, broadcastChatMessage } = useGameChannel({
    roomCode: room.code,
    onStrokePoint: setLastStrokePoint,
    onStrokeEnd: setLastStrokeEnd,
    onChatMessage: (msg) => setMessages((prev) => [...prev, msg]),
  });

  const handleStrokePoint = useCallback(
    (point: StrokePoint) => {
      broadcastStrokePoint(point);
    },
    [broadcastStrokePoint]
  );

  const handleStrokeEnd = useCallback(() => {
    if (!isMyTurn || !myPlayer) return;
    broadcastStrokeEnd(currentPlayerId);
    startTransition(async () => {
      await advanceTurn(round.id, currentPlayerId);
    });
  }, [isMyTurn, currentPlayerId, round.id, broadcastStrokeEnd, myPlayer, startTransition]);

  function handleSendChat(text: string) {
    if (!myPlayer) return;
    const msg: ChatMessage = {
      player_id: currentPlayerId,
      nickname: myPlayer.nickname,
      text,
      is_dead: !isAlive,
      color: myPlayer.color,
      timestamp: Date.now(),
    };
    broadcastChatMessage(msg);
    setMessages((prev) => [...prev, msg]);
  }

  const showRoleReveal = !roleRevealDismissed && !!myRoundPlayer;
  const frozen = round.status === 'voting';

  return (
    <div className="h-screen bg-gray-950 flex flex-col gap-2 p-2 overflow-hidden">
      <PlayerTopBar
        players={players}
        roundPlayers={roundPlayers}
        currentTurnPlayerId={round.current_turn_player_id}
        roundNumber={round.round_number}
        aliveArtists={aliveArtists}
        aliveImposters={aliveImposters}
      />

      <div className="flex gap-2 flex-1 min-h-0">
        <div className="flex-1 relative min-w-0">
          <DrawingCanvas
            isMyTurn={isMyTurn && !frozen}
            myPlayerId={currentPlayerId}
            myColor={myPlayer?.color ?? '#ffffff'}
            frozen={frozen}
            onStrokePoint={handleStrokePoint}
            onStrokeEnd={handleStrokeEnd}
            incomingPoint={lastStrokePoint}
            strokeEnded={lastStrokeEnd}
          />
          <TurnTimer
            turnStartedAt={round.turn_started_at}
            currentTurnPlayerId={round.current_turn_player_id}
            myPlayerId={currentPlayerId}
            players={players.map((p) => ({ id: p.id, nickname: p.nickname, color: p.color }))}
            onTurnEnd={handleStrokeEnd}
          />
        </div>

        <div className="w-64 flex-shrink-0">
          <ChatPanel
            messages={messages}
            onSend={handleSendChat}
            isDeadPlayer={!isAlive}
          />
        </div>
      </div>

      <ControlsBar
        canVote={round.can_vote}
        roundStatus={round.status}
        roundId={round.id}
        currentPlayerId={currentPlayerId}
        isAlive={isAlive}
      />

      {showRoleReveal && myRoundPlayer && (
        <RoleReveal
          role={myRoundPlayer.role}
          word={myRoundPlayer.role === 'artist' ? round.word : '???'}
          fellowImposters={fellowImposters}
          onDismiss={() => setRoleRevealDismissed(true)}
        />
      )}

      {round.status === 'voting' && activeVoteSession && (
        <VotingOverlay
          voteSessionId={activeVoteSession.id}
          currentPlayerId={currentPlayerId}
          alivePlayers={alivePlayers}
          votes={voteEntries}
          isAlive={isAlive}
        />
      )}
    </div>
  );
}
