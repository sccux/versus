import { supabase } from '@/lib/supabase';
import { SwipeDirection } from '@/types/database';

interface RecordSwipeParams {
  coupleId: string;
  userId: string;
  ideaId: string;
  direction: SwipeDirection;
}

export async function recordSwipe(params: RecordSwipeParams): Promise<void> {
  const { error } = await supabase.from('swipes').insert({
    couple_id: params.coupleId,
    user_id: params.userId,
    idea_id: params.ideaId,
    direction: params.direction,
  });
  // Ignore unique constraint violations (idempotent)
  if (error && error.code !== '23505') throw error;
}

export async function getSwipedIdeaIds(coupleId: string, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('swipes')
    .select('idea_id')
    .eq('couple_id', coupleId)
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.idea_id);
}
