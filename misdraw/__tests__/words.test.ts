import { pickWord, WORD_LIST } from '@/lib/game/words';

describe('pickWord', () => {
  it('returns a word from the list', () => {
    expect(WORD_LIST).toContain(pickWord());
  });
  it('avoids used words when possible', () => {
    const used = WORD_LIST.slice(0, WORD_LIST.length - 1);
    const word = pickWord(used);
    expect(word).toBe(WORD_LIST[WORD_LIST.length - 1]);
  });
  it('falls back to full list when all words used', () => {
    const word = pickWord([...WORD_LIST]);
    expect(WORD_LIST).toContain(word);
  });
});
