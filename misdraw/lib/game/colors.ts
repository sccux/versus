export const PLAYER_COLORS = [
  '#FF6B6B','#4ECDC4','#FFD93D','#6BCB77','#4D96FF',
  '#FF922B','#CC5DE8','#F06595','#74C0FC','#A9E34B',
];

export function assignColor(existingColors: string[]): string {
  const available = PLAYER_COLORS.filter(c => !existingColors.includes(c));
  return available[0] ?? PLAYER_COLORS[existingColors.length % PLAYER_COLORS.length];
}
