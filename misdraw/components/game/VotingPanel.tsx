'use client';

import { useTransition } from 'react';
import { castVote } from '@/actions/vote';

interface Player {
  id: string;
  nickname: string;
  color: string;
}

interface Props {
  voteSessionId: string;
  currentPlayerId: string;
  alivePlayers: Player[];
  voterIds: string[];
  myVoteTargetId: string | null;
  isAlive: boolean;
  totalVoters: number;
  onVoted?: (targetId: string) => void;
}

export default function VotingPanel({
  voteSessionId,
  currentPlayerId,
  alivePlayers,
  voterIds,
  myVoteTargetId,
  isAlive,
  totalVoters,
  onVoted,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const hasVoted = !!myVoteTargetId;

  function vote(targetId: string) {
    if (hasVoted || !isAlive || isPending) return;
    // Update local state immediately — realtime postgres_changes events
    // for `votes` can be delayed/missed for the voter's own client
    onVoted?.(targetId);
    startTransition(async () => {
      await castVote(voteSessionId, currentPlayerId, targetId);
    });
  }

  if (!isAlive) {
    return (
      <div className="ink-divider pt-3 mt-1">
        <p className="text-xs text-ink-muted text-center py-2">
          ⚖️ Voting in progress — {voterIds.length}/{totalVoters} voted
        </p>
      </div>
    );
  }

  return (
    <div className="ink-divider pt-3 mt-1">
      <p className="font-hand text-lg mb-2">
        ⚖️ Who is the imposter?
      </p>
      <div className="flex flex-col gap-1.5 mb-2">
        {alivePlayers.map((player) => {
          const isMe = player.id === currentPlayerId;
          const isMyVote = myVoteTargetId === player.id;
          return (
            <button
              key={player.id}
              disabled={isMe || hasVoted || isPending}
              onClick={() => vote(player.id)}
              className={[
                'w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2',
                isMyVote
                  ? 'border-ink shadow-[2px_2px_0_var(--color-ink)]'
                  : 'border-ink-muted',
                !isMe && !hasVoted ? 'hover:bg-ink/10 cursor-pointer' : 'cursor-default',
                isMe || (hasVoted && !isMyVote) ? 'opacity-40' : '',
              ].join(' ')}
              style={{ color: player.color }}
            >
              {player.nickname}
              {isMe && <span className="text-ink-muted text-xs ml-2">(you)</span>}
              {isMyVote && <span className="text-ink-muted text-xs ml-2">✓ voted</span>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-muted text-center pb-1">
        {voterIds.length}/{totalVoters} voted
      </p>
    </div>
  );
}
