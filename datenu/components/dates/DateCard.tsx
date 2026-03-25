import { Linking } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Image } from 'expo-image';
import { MatchWithIdea } from '@/lib/matches';
import { StarRating } from '@/components/ui/StarRating';
import { VibeTags } from '@/components/ui/VibeTags';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  match: MatchWithIdea;
  onSchedule?: () => void;
  onComplete?: () => void;
}

export function DateCard({ match, onSchedule, onComplete }: Props) {
  const idea = match.date_ideas;
  const scheduled = match.scheduled_dates;
  const memory = match.date_memories;

  const scheduledLabel = scheduled
    ? new Date(scheduled.scheduled_at).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <YStack
      backgroundColor={colors.surface}
      borderRadius={radii.lg}
      overflow="hidden"
      style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
    >
      {/* Photo */}
      <Image
        source={{ uri: idea.photo_url }}
        style={{ width: '100%', height: 160 }}
        contentFit="cover"
      />

      <YStack padding={spacing.md} gap={spacing.sm}>
        <Text fontSize={18} fontWeight="700" color={colors.textPrimary}>{idea.title}</Text>
        <Text fontSize={14} color={colors.textSecondary}>{idea.tagline}</Text>
        <VibeTags tags={idea.vibe_tags} />

        {/* Scheduled date label */}
        {scheduledLabel && (
          <XStack gap={spacing.xs} alignItems="center">
            <Text fontSize={13}>📅</Text>
            <Text fontSize={13} color={colors.accent} fontWeight="600">{scheduledLabel}</Text>
          </XStack>
        )}

        {/* Memory: read-only rating + note */}
        {memory && (
          <YStack gap={spacing.xs}>
            <StarRating value={memory.rating ?? 0} readonly />
            {memory.note && (
              <Text fontSize={13} color={colors.textSecondary} fontStyle="italic">"{memory.note}"</Text>
            )}
          </YStack>
        )}

        {/* Action buttons */}
        <XStack gap={spacing.sm} marginTop={spacing.xs}>
          {idea.maps_url && (
            <Button
              flex={1}
              onPress={() => Linking.openURL(idea.maps_url!)}
              backgroundColor={colors.surface}
              borderWidth={1}
              borderColor={colors.border}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.textPrimary}>🗺 Maps</Text>
            </Button>
          )}
          {idea.booking_url && (
            <Button
              flex={1}
              onPress={() => Linking.openURL(idea.booking_url!)}
              backgroundColor={colors.surface}
              borderWidth={1}
              borderColor={colors.border}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.textPrimary}>🔗 Book</Text>
            </Button>
          )}
          {match.status === 'pending' && onSchedule && (
            <Button
              flex={1}
              onPress={onSchedule}
              backgroundColor={colors.accent}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.background} fontWeight="600">Schedule</Text>
            </Button>
          )}
          {match.status === 'scheduled' && onComplete && (
            <Button
              flex={1}
              onPress={onComplete}
              backgroundColor={colors.accent}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.background} fontWeight="600">✓ Done</Text>
            </Button>
          )}
        </XStack>
      </YStack>
    </YStack>
  );
}
