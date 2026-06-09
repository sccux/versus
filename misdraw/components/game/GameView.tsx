'use client';

import { useState, useCallback, useTransition, useEffect, useRef } from 'react';
import DrawingCanvas from './DrawingCanvas';
import type { DrawingCanvasHandle } from './DrawingCanvas';
import ChatPanel from './ChatPanel';
import type { SystemMessage, VotingPanelProps } from './ChatPanel';
import PlayerTopBar from './PlayerTopBar';
import ControlsBar from './ControlsBar';
import RoleReveal from './RoleReveal';
import { useGameChannel } from '@/hooks/useGameChannel';
import { advanceTurn } from '@/actions/round';
import type { StrokePoint, ChatMessage } from '@/hooks/useGameChannel';
import type { Player, Round, RoundPlayer, VoteSession, Vote } from '@/lib/supabase/types';

export interface VoteResult {
  id: string;
  killed_player_id: string | null;
}

interface Props {
  room: { id: string; code: string };
  round: Round;
  roundPlayers: RoundPlayer[];
  players: Player[];
  currentPlayerId: string;
  activeVoteSession: VoteSession | null;
  votes: Vote[];
  voteResult: VoteResult | null;
}

export default function GameView({
  room,
  round,
  roundPlayers,
  players,
  currentPlayerId,
  activeVoteSession,
  votes,
  voteResult,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [roleRevealDismissed, setRoleRevealDismissed] = useState(false);
  const [turnEnded, setTurnEnded] = useState(false);
  const [activeTab, setActiveTab] = useState<'draw' | 'chat'>('draw');
  const [unreadCount, setUnreadCount] = useState(0);
  const [, startTransition] = useTransition();
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    setTurnEnded(false);
  }, [round.current_turn_player_id]);

  // Inject vote result as a system message in chat
  useEffect(() => {
    if (!voteResult) return;
    const killedPlayer = voteResult.killed_player_id
      ? players.find((p) => p.id === voteResult.killed_player_id)
      : null;
    const text = killedPlayer
      ? `⚖️ ${killedPlayer.nickname} was voted out!`
      : '⚖️ No majority — game continues.';
    setSystemMessages((prev) => [...prev, { id: voteResult.id, text }]);
  }, [voteResult?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const voterIds = votes.map((v) => v.voter_id);
  const myVote = votes.find((v) => v.voter_id === currentPlayerId);

  const votingProps: VotingPanelProps | null =
    round.status === 'voting' && activeVoteSession
      ? {
          voteSessionId: activeVoteSession.id,
          currentPlayerId,
          alivePlayers,
          voterIds,
          myVoteTargetId: myVote?.target_id ?? null,
          isAlive,
          totalVoters: alivePlayers.length,
        }
      : null;

  // Draw directly on canvas ref — bypasses React state batching so no points are dropped
  const { broadcastStrokePoint, broadcastStrokeEnd, broadcastChatMessage } = useGameChannel({
    roomCode: room.code,
    onStrokePoint: useCallback((point: StrokePoint) => {
      canvasRef.current?.drawRemotePoint(point);
    }, []),
    onStrokeEnd: useCallback((playerId: string) => {
      canvasRef.current?.endRemoteStroke(playerId);
    }, []),
    onChatMessage: useCallback((msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (activeTabRef.current !== 'chat') {
        setUnreadCount((c) => c + 1);
      }
    }, []),
  });

  const handleStrokePoint = useCallback(
    (point: StrokePoint) => broadcastStrokePoint(point),
    [broadcastStrokePoint]
  );

  const handleStrokeEnd = useCallback(() => {
    if (!isMyTurn || !myPlayer || turnEnded) return;
    setTurnEnded(true);
    broadcastStrokeEnd(currentPlayerId);
    startTransition(async () => {
      await advanceTurn(round.id, currentPlayerId);
    });
  }, [isMyTurn, currentPlayerId, round.id, broadcastStrokeEnd, myPlayer, startTransition, turnEnded]);

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

  function handleTabChange(tab: 'draw' | 'chat') {
    setActiveTab(tab);
    if (tab === 'chat') setUnreadCount(0);
  }

  const showRoleReveal = !roleRevealDismissed && !!myRoundPlayer;
  const frozen = round.status === 'voting';
  const canDraw = isMyTurn && !frozen && !turnEnded;
  const currentDrawer = players.find((p) => p.id === round.current_turn_player_id);
  const myRole = myRoundPlayer?.role;
  const myWord = myRole === 'artist' ? round.word : null;

  return (
    <div className="h-screen bg-gray-950 flex flex-col gap-2 p-2 overflow-hidden">
      {/* Combined top bar: player chips + turn status + role */}
      <PlayerTopBar
        players={players}
        roundPlayers={roundPlayers}
        currentTurnPlayerId={round.current_turn_player_id}
        roundNumber={round.round_number}
        aliveArtists={aliveArtists}
        aliveImposters={aliveImposters}
        canDraw={canDraw}
        turnEnded={turnEnded}
        isMyTurn={isMyTurn}
        frozen={frozen}
        currentDrawerName={currentDrawer?.nickname ?? ''}
        myRole={myRole}
        myWord={myWord}
      />

      {/* Tab bar — only visible below lg breakpoint */}
      <div className="flex lg:hidden gap-1 bg-gray-900 rounded-lg p-1 flex-shrink-0">
        <button
          onClick={() => handleTabChange('draw')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'draw'
              ? 'bg-gray-700 text-white font-medium'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Drawing
        </button>
        <button
          onClick={() => handleTabChange('chat')}
          className={`flex-1 py-1.5 text-sm rounded-md relative transition-colors ${
            activeTab === 'chat'
              ? 'bg-gray-700 text-white font-medium'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Chat
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Canvas — hidden on small screens when chat tab is active */}
        <div
          className={`relative min-w-0 flex-col ${
            activeTab === 'draw' ? 'flex flex-1' : 'hidden'
          } lg:flex lg:flex-1`}
        >
          <DrawingCanvas
            ref={canvasRef}
            isMyTurn={canDraw}
            myPlayerId={currentPlayerId}
            myColor={myPlayer?.color ?? '#ffffff'}
            frozen={frozen}
            onStrokePoint={handleStrokePoint}
            onStrokeEnd={handleStrokeEnd}
          />
        </div>

        {/* Chat — hidden on small screens when draw tab is active */}
        <div
          className={`flex-col ${
            activeTab === 'chat' ? 'flex flex-1' : 'hidden'
          } lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-none`}
        >
          <ChatPanel
            messages={messages}
            systemMessages={systemMessages}
            onSend={handleSendChat}
            isDeadPlayer={!isAlive}
            voting={votingProps}
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
    </div>
  );
}
