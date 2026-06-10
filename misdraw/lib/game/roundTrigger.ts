import type { RoomMode } from '@/lib/supabase/types';

export function isRoundTrigger(
  mode: RoomMode,
  currentPlayerId: string,
  hostPlayerId: string | null
): boolean {
  if (mode === 'couch') {
    return currentPlayerId === '';
  }
  return hostPlayerId !== null && currentPlayerId === hostPlayerId;
}
