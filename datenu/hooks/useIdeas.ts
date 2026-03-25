import { useEffect, useState, useCallback } from 'react';
import { DbDateIdea } from '@/types/database';
import { getIdeasForCouple } from '@/lib/ideas';
import { getSwipedIdeaIds } from '@/lib/swipes';

interface UseIdeasParams {
  coupleId: string;
  userId: string;
  locationRegion: string;
}

export function useIdeas({ coupleId, userId, locationRegion }: UseIdeasParams) {
  const [ideas, setIdeas] = useState<DbDateIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const seenIds = await getSwipedIdeaIds(coupleId, userId);
      const fresh = await getIdeasForCouple({ coupleId, locationRegion, seenIdeaIds: seenIds });
      setIdeas(fresh);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [coupleId, userId, locationRegion]);

  useEffect(() => { load(); }, [load]);

  function removeTop() {
    setIdeas((prev) => prev.slice(0, -1));
  }

  return { ideas, loading, error, reload: load, removeTop };
}
