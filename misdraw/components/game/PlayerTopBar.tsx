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
}

export default function PlayerTopBar({
  players,
  roundPlayers,
  currentTurnPlayerId,
  roundNumber,
  aliveArtists,
  aliveImposters,
}: Props) {
  const rpMap = Object.fromEntries(roundPlayers.map((rp) => [rp.player_id, rp]));

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-lg">
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {players.map((p) => {
          const rp = rpMap[p.id];
          const isAlive = rp?.is_alive ?? true;
          const isActive = p.id === currentTurnPlayerId;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium transition-all ${
                isAlive ? 'opacity-100' : 'opacity-30 line-through'
              } ${isActive ? 'ring-2 ring-white/60' : ''}`}
              style={{
                backgroundColor: `${p.color}22`,
                color: p.color,
              }}
            >
              {isActive && <span>✏️</span>}
              {p.nickname}
              {!isAlive && ' 💀'}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-400 flex-shrink-0">
        <span>R{roundNumber}</span>
        <span>
          <span className="text-green-400">{aliveArtists}A</span>
          {' '}–{' '}
          <span className="text-red-400">{aliveImposters}I</span>
        </span>
      </div>
    </div>
  );
}
