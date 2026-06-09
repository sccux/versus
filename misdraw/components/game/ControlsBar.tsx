'use client';

import { useTransition } from 'react';
import { initiateVote } from '@/actions/vote';

interface Props {
  canVote: boolean;
  roundStatus: string;
  roundId: string;
  currentPlayerId: string;
  isAlive: boolean;
}

export default function ControlsBar({
  canVote,
  roundStatus,
  roundId,
  currentPlayerId,
  isAlive,
}: Props) {
  const [isPending, startTransition] = useTransition();

  if (!isAlive) {
    return (
      <div className="px-4 py-2 bg-gray-900 rounded-lg text-center text-gray-500 text-sm">
        You have been eliminated. You can still watch and chat.
      </div>
    );
  }

  const canCallVote = canVote && roundStatus === 'drawing';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-lg">
      <span className="text-gray-500 text-sm">
        {canCallVote
          ? 'First rotation complete — vote available'
          : 'Vote available after everyone draws once'}
      </span>
      <button
        disabled={!canCallVote || isPending}
        onClick={() =>
          startTransition(async () => {
            await initiateVote(roundId, currentPlayerId);
          })
        }
        className="bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        ⚖️ Call Vote
      </button>
    </div>
  );
}
