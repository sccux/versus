export const WORD_LIST = [
  'pizza','bottle','sun','tree','house','cat','hat','clock','book','chair',
  'fish','boat','star','moon','apple','guitar','umbrella','shoe','car','bridge',
  'cloud','flower','key','lamp','mountain','phone','ring','rocket','snake','spoon',
  'sword','table','torch','train','wave','window','balloon','banana','bell','broom',
  'butterfly','candle','crown','diamond','door','drum','egg','elephant','feather',
  'flag','frog','ghost','hammer','heart','horse','kite','ladder','leaf','lighthouse',
  'lion','mushroom','needle','owl','parachute','pencil','penguin','piano','pineapple',
  'rabbit','rainbow','robot','scissors','skull','snowflake','spider','trophy',
  'volcano','waterfall','whale','windmill',
];

export function pickWord(usedWords: string[] = []): string {
  const available = WORD_LIST.filter(w => !usedWords.includes(w));
  const pool = available.length > 0 ? available : WORD_LIST;
  return pool[Math.floor(Math.random() * pool.length)];
}
