import { useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DbUser } from '@/types/database';
import { getUserProfile } from '@/lib/auth';

export interface AuthState {
  session: Session | null;
  user: DbUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingUserId = useRef<string | null>(null);

  useEffect(() => {
    // onAuthStateChange fires immediately with current session in Supabase v2
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    // Avoid duplicate concurrent fetches for the same user
    if (loadingUserId.current === userId) return;
    loadingUserId.current = userId;
    try {
      const profile = await getUserProfile(userId);
      setUser(profile);
    } finally {
      loadingUserId.current = null;
      setLoading(false);
    }
  }

  return { session, user, loading };
}
