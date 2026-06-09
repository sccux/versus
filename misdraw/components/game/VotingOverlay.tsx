'use client';

import { useTransition } from 'react';
import { castVote } from '@/actions/vote';

interface PlayerInfo {
  id: string;
  nickname: string;
  color: string;
}

interface Props {
  voteSessionId: string;
  currentPlayerId: string;
  alivePlayers: PlayerInfo[];
  votes: { voter_id: string; target_id: string }[];
  isAlive: boolean;
}

export default function VotingOverlay({
  voteSessionId,
  currentPlayerId,
  alivePlayers,
  votes,
  isAlive,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const myVote = votes.find((v) => v.voter_id === currentPlayerId);

  const tally: Record<string, number> = {};
  for (const v of votes) {
    tally[v.target_id] = (tally[v.target_id] ?? 0) + 1;
  }

  function vote(targetId: string) {
    if (myVote || !isAlive) return;
    startTransition(async () => {
      await castVote(voteSessionId, currentPlayerId, targetId);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold text-white text-center mb-1">⚖️ Vote</h2>
        <p className="text-gray-400 text-sm text-center mb-6">Who is the imposter?</p>

        <div className="space-y-2">
          {alivePlayers.map((p) => {
            const isMe = p.id === currentPlayerId;
            const hasMyVote = myVote?.target_id === p.id;
            const voteCount = tally[p.id] ?? 0;

            return (
              <button
                key={p.id}
                disabled={isMe || !!myVote || !isAlive || isPending}
                onClick={() => vote(p.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  hasMyVote
                    ? 'ring-2 ring-white bg-gray-800'
                    : isMe
                    ? 'opacity-40 cursor-not-allowed bg-gray-800'
                    : 'bg-gray-800 hover:bg-gray-700 disabled:cursor-not-allowed'
                }`}
              >
                <span className="font-medium" style={{ color: p.color }}>
                  {p.nickname}
                  {isMe && <span className="text-gray-500 text-xs ml-2">(you)</span>}
                </span>
                <span className="text-gray-400 text-sm">
                  {voteCount > 0 && `${voteCount} vote${voteCount !== 1 ? 's' : ''}`}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          {votes.length}/{alivePlayers.length} voted
        </p>
      </div>
    </div>
  );
}
