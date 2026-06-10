'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import DrawingCanvas from '@/components/game/DrawingCanvas';
import type { DrawingCanvasHandle } from '@/components/game/DrawingCanvas';
import ChatPanel from '@/components/game/ChatPanel';
import type { SystemMessage } from '@/components/game/ChatPanel';
import PlayerTopBar from '@/components/game/PlayerTopBar';
import { useGameChannel } from '@/hooks/useGameChannel';
import type { StrokePoint, ChatMessage } from '@/hooks/useGameChannel';
import type { Player, Round, RoundPlayer, Vote, VoteSession } from '@/lib/supabase/types';

export interface VoteResult {
  id: string;
  killed_player_id: string | null;
}

interface Props {
  room: { id: string; code: string };
  round: Round;
  roundPlayers: RoundPlayer[];
  players: Player[];
  activeVoteSession: VoteSession | null;
  votes: Vote[];
  voteResult: VoteResult | null;
}

export default function CouchGameView({
  room,
  round,
  roundPlayers,
  players,
  activeVoteSession,
  votes,
  voteResult,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  useEffect(() => {
    if (!voteResult) return;
    const killedPlayer = voteResult.killed_player_id
      ? players.find((p) => p.id === voteResult.killed_player_id)
      : null;
    const text = killedPlayer
      ? `⚖️ ${killedPlayer.nickname} was voted out!`
      : '⚖️ No majority — game continues.';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSystemMessages((prev) => [...prev, { id: voteResult.id, text }]);
  }, [voteResult?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useGameChannel({
    roomCode: room.code,
    onStrokePoint: useCallback((point: StrokePoint) => {
      canvasRef.current?.drawRemotePoint(point);
    }, []),
    onStrokeEnd: useCallback((playerId: string) => {
      canvasRef.current?.endRemoteStroke(playerId);
    }, []),
    onChatMessage: useCallback((msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    }, []),
  });

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const aliveRoundPlayers = roundPlayers.filter((rp) => rp.is_alive);
  const aliveArtists = aliveRoundPlayers.filter((rp) => rp.role === 'artist').length;
  const aliveImposters = aliveRoundPlayers.filter((rp) => rp.role === 'imposter').length;
  const currentDrawer = players.find((p) => p.id === round.current_turn_player_id);
  const frozen = round.status === 'voting';

  const alivePlayers = aliveRoundPlayers
    .map((rp) => playerMap[rp.player_id])
    .filter(Boolean);
  const voterIds = votes.map((v) => v.voter_id);

  return (
    <div className="h-screen bg-paper flex flex-col gap-2 p-2 overflow-hidden">
      <PlayerTopBar
        players={players}
        roundPlayers={roundPlayers}
        currentTurnPlayerId={round.current_turn_player_id}
        roundNumber={round.round_number}
        aliveArtists={aliveArtists}
        aliveImposters={aliveImposters}
        canDraw={false}
        turnEnded={false}
        isMyTurn={false}
        frozen={frozen}
        currentDrawerName={currentDrawer?.nickname ?? ''}
        myRole={undefined}
        myWord={null}
      />

      <div className="flex gap-2 flex-1 min-h-0">
        <div className="relative min-w-0 flex flex-1 flex-col">
          <DrawingCanvas
            ref={canvasRef}
            isMyTurn={false}
            myPlayerId=""
            myColor="#000000"
            frozen={frozen}
            onStrokePoint={() => {}}
            onStrokeEnd={() => {}}
            showWaitingOverlay={false}
          />
        </div>

        <div className="flex flex-col w-64 flex-shrink-0">
          <ChatPanel
            messages={messages}
            systemMessages={systemMessages}
            onSend={() => {}}
            isDeadPlayer={true}
            voting={null}
            readOnly
          />
        </div>
      </div>

      {round.status === 'voting' && activeVoteSession && (
        <div className="ink-panel p-3 flex-shrink-0">
          <p className="text-ink-muted text-sm mb-2">⚖️ Voting in progress</p>
          <div className="flex flex-wrap gap-2">
            {alivePlayers.map((p) => (
              <span
                key={p.id}
                className={`text-xs px-2 py-1 rounded-full border ${
                  voterIds.includes(p.id) ? 'border-ink text-ink' : 'border-ink-muted text-ink-muted'
                }`}
              >
                {p.nickname} {voterIds.includes(p.id) ? '✓' : '...'}
              </span>
            ))}
          </div>
          <p className="text-ink-muted text-xs mt-2">{voterIds.length}/{alivePlayers.length} voted</p>
        </div>
      )}
    </div>
  );
}
