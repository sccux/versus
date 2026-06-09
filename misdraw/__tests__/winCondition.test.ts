import { checkWinCondition } from '@/lib/game/winCondition';

describe('checkWinCondition', () => {
  it('returns "artists" when no imposters remain', () => {
    expect(checkWinCondition(3, 0)).toBe('artists');
    expect(checkWinCondition(1, 0)).toBe('artists');
  });
  it('returns "imposters" when imposters >= artists', () => {
    expect(checkWinCondition(1, 1)).toBe('imposters');
    expect(checkWinCondition(2, 2)).toBe('imposters');
    expect(checkWinCondition(1, 2)).toBe('imposters');
  });
  it('returns null when game continues', () => {
    expect(checkWinCondition(3, 1)).toBeNull();
    expect(checkWinCondition(2, 1)).toBeNull();
    expect(checkWinCondition(4, 2)).toBeNull();
  });
});
