import { supabase } from '@/lib/supabase';
import { DbMatch, DbDateIdea, DbScheduledDate, DbDateMemory } from '@/types/database';

export interface MatchWithIdea extends DbMatch {
  date_ideas: DbDateIdea;
  scheduled_dates: DbScheduledDate | null;
  date_memories: DbDateMemory | null;
}

export async function getMatchesForCouple(coupleId: string): Promise<MatchWithIdea[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      date_ideas(*),
      scheduled_dates(*),
      date_memories(*)
    `)
    .eq('couple_id', coupleId)
    .order('matched_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

interface ScheduleMatchParams {
  matchId: string;
  scheduledAt: Date;
  calendarEventId?: string;
}

export async function scheduleMatch(params: ScheduleMatchParams): Promise<void> {
  const { error: schedError } = await supabase.from('scheduled_dates').upsert(
    {
      match_id: params.matchId,
      scheduled_at: params.scheduledAt.toISOString(),
      calendar_event_id: params.calendarEventId ?? null,
    },
    { onConflict: 'match_id' }
  );
  if (schedError) throw schedError;

  const { error: matchError } = await supabase
    .from('matches')
    .update({ status: 'scheduled' })
    .eq('id', params.matchId);
  if (matchError) throw matchError;
}

interface CompleteMatchParams {
  matchId: string;
  rating?: number;
  note?: string;
}

export async function completeMatch(params: CompleteMatchParams): Promise<void> {
  const { error: memError } = await supabase.from('date_memories').insert({
    match_id: params.matchId,
    rating: params.rating ?? null,
    note: params.note ?? null,
  });
  if (memError) throw memError;

  const { error: matchError } = await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', params.matchId);
  if (matchError) throw matchError;
}
