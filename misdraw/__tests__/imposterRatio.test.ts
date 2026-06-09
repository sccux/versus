import { getImposterCount, getRatio } from '@/lib/game/imposterRatio';

describe('getImposterCount', () => {
  it('returns 1 for 3 players', () => expect(getImposterCount(3)).toBe(1));
  it('returns 1 for 4 players', () => expect(getImposterCount(4)).toBe(1));
  it('returns 2 for 5 players', () => expect(getImposterCount(5)).toBe(2));
  it('returns 2 for 6 players', () => expect(getImposterCount(6)).toBe(2));
  it('returns 3 for 7 players', () => expect(getImposterCount(7)).toBe(3));
  it('returns 3 for 8 players', () => expect(getImposterCount(8)).toBe(3));
  it('returns 4 for 9 players', () => expect(getImposterCount(9)).toBe(4));
  it('returns 4 for 10 players', () => expect(getImposterCount(10)).toBe(4));
});

describe('getRatio', () => {
  it('artists + imposters = total players for all valid counts', () => {
    for (let n = 3; n <= 10; n++) {
      const { artists, imposters } = getRatio(n);
      expect(artists + imposters).toBe(n);
    }
  });
});
