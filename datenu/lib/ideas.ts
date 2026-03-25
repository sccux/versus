import { supabase } from '@/lib/supabase';
import { DbDateIdea } from '@/types/database';

interface GetIdeasParams {
  coupleId: string;
  locationRegion: string;
  seenIdeaIds: string[];
}

export async function getIdeasForCouple({
  locationRegion,
  seenIdeaIds,
}: GetIdeasParams): Promise<DbDateIdea[]> {
  let query = supabase
    .from('date_ideas')
    .select('*')
    .eq('is_approved', true)
    .eq('location_region', locationRegion);

  if (seenIdeaIds.length > 0) {
    const ids = seenIdeaIds.map((id) => `"${id}"`).join(',');
    query = query.not('id', 'in', `(${ids})`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getIdeaById(id: string): Promise<DbDateIdea | null> {
  const { data, error } = await supabase
    .from('date_ideas')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
