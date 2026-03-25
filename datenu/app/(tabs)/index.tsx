import { useState, useEffect, useRef } from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useIdeas } from '@/hooks/useIdeas';
import { recordSwipe } from '@/lib/swipes';
import { getIdeaById } from '@/lib/ideas';
import { CardStack } from '@/components/swipe/CardStack';
import { CardDetail } from '@/components/swipe/CardDetail';
import { MatchReveal } from '@/components/swipe/MatchReveal';
import { DbDateIdea, DbMatch } from '@/types/database';
import { colors, spacing } from '@/constants/theme';

export default function SwipeTab() {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const { couple } = useCouple(session?.user?.id);
  const { ideas, loading, error, removeTop } = useIdeas({
    coupleId: couple?.id ?? '',
    userId: session?.user?.id ?? '',
    locationRegion: couple?.location_region ?? user?.location_region ?? '',
  });

  const [detailIdea, setDetailIdea] = useState<DbDateIdea | null>(null);
  const [matchedIdea, setMatchedIdea] = useState<DbDateIdea | null>(null);
  const matchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!couple?.id) return;

    const channel = supabase
      .channel(`matches:${couple.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `couple_id=eq.${couple.id}` },
        async (payload) => {
          const match = payload.new as DbMatch;
          const idea = await getIdeaById(match.idea_id).catch(() => null);
          if (idea) setMatchedIdea(idea);
        }
      )
      .subscribe();

    matchChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [couple?.id]);

  async function handleSwipeRight(idea: DbDateIdea) {
    removeTop();
    if (!couple?.id || !session?.user?.id) return;
    try {
      await recordSwipe({
        coupleId: couple.id,
        userId: session.user.id,
        ideaId: idea.id,
        direction: 'like',
      });
    } catch (e) {
      console.error('Failed to record swipe:', e);
    }
  }

  async function handleSwipeLeft(idea: DbDateIdea) {
    removeTop();
    if (!couple?.id || !session?.user?.id) return;
    try {
      await recordSwipe({
        coupleId: couple.id,
        userId: session.user.id,
        ideaId: idea.id,
        direction: 'pass',
      });
    } catch (e) {
      console.error('Failed to record swipe:', e);
    }
  }

  if (!couple) return null;

  return (
    <YStack flex={1} backgroundColor={colors.background} paddingTop={insets.top}>
      <XStack paddingHorizontal={spacing.lg} paddingVertical={spacing.md} justifyContent="center">
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary}>💛 DateNu</Text>
      </XStack>

      <YStack flex={1} justifyContent="center" alignItems="center">
        {loading ? (
          <Spinner size="large" color={colors.accent} />
        ) : error ? (
          <Text color={colors.error}>{error}</Text>
        ) : (
          <CardStack
            ideas={ideas}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onCardPress={setDetailIdea}
          />
        )}
      </YStack>

      {!loading && ideas.length > 0 && (
        <XStack justifyContent="space-between" paddingHorizontal={spacing.xxl} paddingBottom={insets.bottom + spacing.lg}>
          <Text color={colors.textSecondary} fontSize={13}>← Pass</Text>
          <Text color={colors.textSecondary} fontSize={13}>Like →</Text>
        </XStack>
      )}

      <CardDetail idea={detailIdea} onClose={() => setDetailIdea(null)} />
      <MatchReveal idea={matchedIdea} onDismiss={() => setMatchedIdea(null)} />
    </YStack>
  );
}
