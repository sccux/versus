import { generateCode, isCouchCode } from '@/lib/game/roomCode';

describe('generateCode', () => {
  it('generates 6-character uppercase codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode('online');
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it('online codes never start with the couch prefix', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode('online')[0]).not.toBe('C');
    }
  });

  it('couch codes always start with the couch prefix', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode('couch')[0]).toBe('C');
    }
  });

  it('couch codes are still 6 characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode('couch')).toMatch(/^C[A-Z0-9]{5}$/);
    }
  });
});

describe('isCouchCode', () => {
  it('returns true for codes starting with C', () => {
    expect(isCouchCode('C7K2P9')).toBe(true);
    expect(isCouchCode('c7k2p9')).toBe(true);
  });

  it('returns false for codes not starting with C', () => {
    expect(isCouchCode('MX7K2P')).toBe(false);
  });
});
