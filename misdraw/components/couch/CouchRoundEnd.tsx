'use client';

interface PlayerScore {
  id: string;
  nickname: string;
  color: string;
  score: number;
  scoreDelta: number;
}

interface Props {
  winner: 'artists' | 'imposters';
  scores: PlayerScore[];
  roundWord: string;
}

export default function CouchRoundEnd({ winner, scores, roundWord }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ink-panel text-center mb-6 p-6">
          <p className="text-ink-muted text-sm mb-1">Round over</p>
          <h2
            className={`font-hand text-3xl ${
              winner === 'artists' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {winner === 'artists' ? '🎨 Artists Win!' : '🕵️ Imposters Win!'}
          </h2>
          <p className="text-ink-muted text-sm mt-2">
            The word was: <span className="text-ink font-medium">{roundWord}</span>
          </p>
        </div>

        <div className="ink-panel overflow-hidden mb-4">
          <div className="px-4 py-3 ink-divider">
            <p className="text-ink-muted text-sm font-medium">Scoreboard</p>
          </div>
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center px-4 py-3 ink-divider last:border-0">
              <span className="text-ink-muted text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-medium" style={{ color: p.color }}>{p.nickname}</span>
              <div className="flex items-center gap-2">
                {p.scoreDelta > 0 && <span className="text-green-400 text-sm">+{p.scoreDelta}</span>}
                <span className="text-ink font-bold">{p.score}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-ink-muted text-sm text-center">Waiting for players to ready up...</p>
      </div>
    </div>
  );
}
