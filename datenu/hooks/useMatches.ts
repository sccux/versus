import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getMatchesForCouple, MatchWithIdea } from '@/lib/matches';

export function useMatches(coupleId: string | undefined) {
  const [matches, setMatches] = useState<MatchWithIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coupleId) return;
    try {
      const data = await getMatchesForCouple(coupleId);
      setMatches(data);
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: reload when matches or scheduled_dates change
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`couple-dates:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `couple_id=eq.${coupleId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_dates' },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId, load]);

  const pending = matches.filter((m) => m.status === 'pending');
  const scheduled = matches.filter((m) => m.status === 'scheduled').sort(
    (a, b) =>
      new Date(a.scheduled_dates!.scheduled_at).getTime() -
      new Date(b.scheduled_dates!.scheduled_at).getTime()
  );
  const completed = matches.filter((m) => m.status === 'completed');

  return { matches, pending, scheduled, completed, loading, reload: load };
}
