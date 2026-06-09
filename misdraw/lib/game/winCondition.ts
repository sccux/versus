export type WinResult = 'artists' | 'imposters' | null;

export function checkWinCondition(aliveArtists: number, aliveImposters: number): WinResult {
  if (aliveImposters === 0) return 'artists';
  if (aliveImposters >= aliveArtists) return 'imposters';
  return null;
}
