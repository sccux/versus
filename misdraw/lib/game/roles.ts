import { getImposterCount } from './imposterRatio';

export type Role = 'artist' | 'imposter';

export function assignRoles(playerIds: string[]): Record<string, Role> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const imposterCount = getImposterCount(playerIds.length);
  const roles: Record<string, Role> = {};
  shuffled.forEach((id, i) => {
    roles[id] = i < imposterCount ? 'imposter' : 'artist';
  });
  return roles;
}

export function shuffleTurnOrder(playerIds: string[]): string[] {
  return [...playerIds].sort(() => Math.random() - 0.5);
}
