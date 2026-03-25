import { useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useMatches } from '@/hooks/useMatches';
import { DateCard } from '@/components/dates/DateCard';
import { ScheduleModal } from '@/components/dates/ScheduleModal';
import { MemoryModal } from '@/components/dates/MemoryModal';
import { MatchWithIdea } from '@/lib/matches';
import { colors, spacing, radii } from '@/constants/theme';

type SubTab = 'ideas' | 'upcoming' | 'memories';

export default function DatesTab() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { couple } = useCouple(session?.user?.id);
  const { pending, scheduled, completed, loading, reload } = useMatches(couple?.id);

  const [subTab, setSubTab] = useState<SubTab>('ideas');
  const [schedulingMatch, setSchedulingMatch] = useState<MatchWithIdea | null>(null);
  const [completingMatch, setCompletingMatch] = useState<MatchWithIdea | null>(null);

  const subTabs: { key: SubTab; label: string; count: number }[] = [
    { key: 'ideas', label: 'Ideas', count: pending.length },
    { key: 'upcoming', label: 'Upcoming', count: scheduled.length },
    { key: 'memories', label: 'Memories', count: completed.length },
  ];

  const activeMatches =
    subTab === 'ideas' ? pending :
    subTab === 'upcoming' ? scheduled :
    completed;

  return (
    <YStack flex={1} backgroundColor={colors.background} paddingTop={insets.top}>
      {/* Header */}
      <XStack paddingHorizontal={spacing.lg} paddingVertical={spacing.md} justifyContent="center">
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary}>Your Dates</Text>
      </XStack>

      {/* Sub-tab selector */}
      <XStack
        paddingHorizontal={spacing.lg}
        marginBottom={spacing.md}
        backgroundColor={colors.surface}
        borderRadius={radii.lg}
        marginHorizontal={spacing.lg}
        padding={4}
      >
        {subTabs.map((tab) => (
          <YStack
            key={tab.key}
            flex={1}
            backgroundColor={subTab === tab.key ? colors.accent : 'transparent'}
            borderRadius={radii.md}
            paddingVertical={spacing.sm}
            alignItems="center"
            onPress={() => setSubTab(tab.key)}
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color={subTab === tab.key ? colors.background : colors.textSecondary}
            >
              {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Content */}
      {loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner color={colors.accent} />
        </YStack>
      ) : activeMatches.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={spacing.sm}>
          <Text fontSize={32}>
            {subTab === 'ideas' ? '🌱' : subTab === 'upcoming' ? '📅' : '✨'}
          </Text>
          <Text fontSize={16} fontWeight="600" color={colors.textPrimary}>
            {subTab === 'ideas' ? 'No matches yet' :
             subTab === 'upcoming' ? 'Nothing scheduled' :
             'No memories yet'}
          </Text>
          <Text color={colors.textSecondary} textAlign="center" paddingHorizontal={spacing.xl}>
            {subTab === 'ideas' ? 'Keep swiping — when you both like the same idea it shows up here.' :
             subTab === 'upcoming' ? 'Schedule one of your matched ideas to see it here.' :
             'Complete a date to start building your memories.'}
          </Text>
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {activeMatches.map((match) => (
            <DateCard
              key={match.id}
              match={match}
              onSchedule={match.status === 'pending' ? () => setSchedulingMatch(match) : undefined}
              onComplete={match.status === 'scheduled' ? () => setCompletingMatch(match) : undefined}
            />
          ))}
        </ScrollView>
      )}

      <ScheduleModal
        match={schedulingMatch}
        onClose={() => setSchedulingMatch(null)}
        onScheduled={reload}
      />
      <MemoryModal
        match={completingMatch}
        onClose={() => setCompletingMatch(null)}
        onCompleted={reload}
      />
    </YStack>
  );
}
