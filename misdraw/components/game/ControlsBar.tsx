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
      <div className="px-4 py-2 ink-panel text-center text-ink-muted text-sm">
        You have been eliminated. You can still watch and chat.
      </div>
    );
  }

  const canCallVote = canVote && roundStatus === 'drawing';

  return (
    <div className="flex items-center justify-between px-4 py-2 ink-panel">
      <span className="text-ink-muted text-sm">
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
        className="border-2 border-ink rounded-full text-ink text-sm font-medium px-4 py-2 hover:bg-ink/10 disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed transition-colors"
      >
        ⚖️ Call Vote
      </button>
    </div>
  );
}
