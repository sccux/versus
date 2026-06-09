interface Player {
  id: string;
  nickname: string;
  color: string;
}

interface RoundPlayerState {
  player_id: string;
  is_alive: boolean;
}

interface Props {
  players: Player[];
  roundPlayers: RoundPlayerState[];
  currentTurnPlayerId: string | null;
  roundNumber: number;
  aliveArtists: number;
  aliveImposters: number;
  canDraw: boolean;
  turnEnded: boolean;
  isMyTurn: boolean;
  frozen: boolean;
  currentDrawerName: string;
  myRole: 'artist' | 'imposter' | undefined;
  myWord: string | null;
}

export default function PlayerTopBar({
  players,
  roundPlayers,
  currentTurnPlayerId,
  roundNumber,
  aliveArtists,
  aliveImposters,
  canDraw,
  turnEnded,
  isMyTurn,
  frozen,
  currentDrawerName,
  myRole,
  myWord,
}: Props) {
  const rpMap = Object.fromEntries(roundPlayers.map((rp) => [rp.player_id, rp]));

  const turnText = frozen
    ? '⚖️ Voting'
    : canDraw
    ? '✏️ Your turn — draw!'
    : turnEnded && isMyTurn
    ? '✓ Waiting for next turn'
    : `${currentDrawerName || '...'} is drawing`;

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
      {/* Row 1: Player chips + round stats */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
          {players.map((p) => {
            const rp = rpMap[p.id];
            const isAlive = rp?.is_alive ?? true;
            const isActive = p.id === currentTurnPlayerId && !frozen;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${
                  isAlive ? 'opacity-100' : 'opacity-30 line-through'
                } ${isActive ? 'ring-1 ring-white/60' : ''}`}
                style={{ backgroundColor: `${p.color}22`, color: p.color }}
              >
                {isActive && <span>✏️</span>}
                {p.nickname}
                {!isAlive && ' 💀'}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0 pl-1">
          <span>R{roundNumber}</span>
          <span>
            <span className="text-green-500">{aliveArtists}A</span>
            {' '}–{' '}
            <span className="text-red-500">{aliveImposters}I</span>
          </span>
        </div>
      </div>

      {/* Row 2: Turn status + role pill */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-800">
        <span
          className={`text-sm ${
            canDraw
              ? 'text-green-400 font-semibold'
              : frozen
              ? 'text-yellow-400'
              : 'text-gray-400'
          }`}
        >
          {turnText}
        </span>
        {myRole && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{
              background: myRole === 'artist' ? '#1a3a2a' : '#2a1a1a',
              color: myRole === 'artist' ? '#6BCB77' : '#FF6B6B',
            }}
          >
            {myRole === 'artist' ? `🎨 "${myWord}"` : '🕵️ Imposter'}
          </span>
        )}
      </div>
    </div>
  );
}
