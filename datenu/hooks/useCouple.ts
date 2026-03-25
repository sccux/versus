import { useCallback, useEffect, useState } from 'react';
import { DbCouple, DbUser } from '@/types/database';
import { getMyCouple } from '@/lib/couples';
import { getUserProfile } from '@/lib/auth';

export interface CoupleState {
  couple: DbCouple | null;
  partner: DbUser | null;
  loading: boolean;
  refresh: () => void;
}

export function useCouple(userId: string | undefined): CoupleState {
  const [couple, setCouple] = useState<DbCouple | null>(null);
  const [partner, setPartner] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const c = await getMyCouple(userId);
      setCouple(c);
      if (c) {
        const partnerId = c.user_a_id === userId ? c.user_b_id : c.user_a_id;
        if (partnerId) {
          const p = await getUserProfile(partnerId);
          setPartner(p);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { couple, partner, loading, refresh: load };
}
