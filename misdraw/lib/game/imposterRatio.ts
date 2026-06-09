const RATIOS: Record<number, { artists: number; imposters: number }> = {
  3:  { artists: 2, imposters: 1 },
  4:  { artists: 3, imposters: 1 },
  5:  { artists: 3, imposters: 2 },
  6:  { artists: 4, imposters: 2 },
  7:  { artists: 4, imposters: 3 },
  8:  { artists: 5, imposters: 3 },
  9:  { artists: 5, imposters: 4 },
  10: { artists: 6, imposters: 4 },
};

export function getImposterCount(totalPlayers: number): number {
  return RATIOS[totalPlayers]?.imposters ?? 1;
}

export function getRatio(totalPlayers: number): { artists: number; imposters: number } {
  return RATIOS[totalPlayers] ?? { artists: totalPlayers - 1, imposters: 1 };
}
