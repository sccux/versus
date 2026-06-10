import { isRoundTrigger } from '@/lib/game/roundTrigger';

describe('isRoundTrigger', () => {
  it('online mode: true when currentPlayerId matches hostPlayerId', () => {
    expect(isRoundTrigger('online', 'p1', 'p1')).toBe(true);
  });

  it('online mode: false when currentPlayerId does not match hostPlayerId', () => {
    expect(isRoundTrigger('online', 'p2', 'p1')).toBe(false);
  });

  it('online mode: false when hostPlayerId is null', () => {
    expect(isRoundTrigger('online', 'p1', null)).toBe(false);
  });

  it('couch mode: true when currentPlayerId is empty (the TV)', () => {
    expect(isRoundTrigger('couch', '', null)).toBe(true);
  });

  it('couch mode: false when currentPlayerId is set (a player)', () => {
    expect(isRoundTrigger('couch', 'p1', null)).toBe(false);
  });
});
