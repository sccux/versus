import type { RoomMode } from '@/lib/supabase/types';

const COUCH_PREFIX = 'C';

function randomChars(length: number): string {
  let result = '';
  while (result.length < length) {
    result += Math.random().toString(36).substring(2);
  }
  return result.slice(0, length).toUpperCase();
}

export function generateCode(mode: RoomMode): string {
  if (mode === 'couch') {
    return COUCH_PREFIX + randomChars(5);
  }

  let code = randomChars(6);
  while (code[0] === COUCH_PREFIX) {
    code = randomChars(6);
  }
  return code;
}

export function isCouchCode(code: string): boolean {
  return code.toUpperCase().startsWith(COUCH_PREFIX);
}
