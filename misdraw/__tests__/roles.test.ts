import { assignRoles, shuffleTurnOrder } from '@/lib/game/roles';

describe('assignRoles', () => {
  it('assigns exactly the right number of imposters for each player count', () => {
    const cases: [number, number][] = [[3,1],[4,1],[5,2],[6,2],[7,3],[8,3],[9,4],[10,4]];
    for (const [total, expectedImposters] of cases) {
      const ids = Array.from({ length: total }, (_, i) => `p${i}`);
      const roles = assignRoles(ids);
      const imposters = Object.values(roles).filter(r => r === 'imposter').length;
      expect(imposters).toBe(expectedImposters);
    }
  });
  it('assigns a role to every player', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const roles = assignRoles(ids);
    expect(Object.keys(roles)).toHaveLength(4);
    expect(Object.values(roles).every(r => r === 'artist' || r === 'imposter')).toBe(true);
  });
});

describe('shuffleTurnOrder', () => {
  it('returns same players in some order', () => {
    const ids = ['a', 'b', 'c'];
    const result = shuffleTurnOrder(ids);
    expect(result.sort()).toEqual(ids.sort());
  });
});
