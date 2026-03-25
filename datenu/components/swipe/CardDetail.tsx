import { Modal, Linking, ScrollView } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Image } from 'expo-image';
import { VibeTags } from '@/components/ui/VibeTags';
import { CostBadge } from '@/components/ui/CostBadge';
import { DbDateIdea } from '@/types/database';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  idea: DbDateIdea | null;
  onClose: () => void;
}

export function CardDetail({ idea, onClose }: Props) {
  if (!idea) return null;

  const durationLabel = idea.duration_mins < 60
    ? `${idea.duration_mins} min`
    : `${Math.round(idea.duration_mins / 60)} hrs`;

  return (
    <Modal animationType="slide" transparent presentationStyle="pageSheet" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor={colors.background}>
        <Image
          source={{ uri: idea.photo_url }}
          style={{ width: '100%', height: 280 }}
          contentFit="cover"
        />
        <ScrollView>
          <YStack padding={spacing.lg} gap={spacing.md}>
            <Text fontSize={26} fontWeight="700" color={colors.textPrimary}>{idea.title}</Text>
            <Text fontSize={16} color={colors.textSecondary}>{idea.tagline}</Text>
            <XStack gap={spacing.sm} alignItems="center">
              <CostBadge cost={idea.cost_range} />
              <Text color={colors.textSecondary} fontSize={14}>{durationLabel}</Text>
              <Text color={colors.textSecondary} fontSize={14}>📍 {idea.location_region}</Text>
            </XStack>
            <VibeTags tags={idea.vibe_tags} />

            <YStack gap={spacing.sm} marginTop={spacing.sm}>
              {idea.maps_url && (
                <Button
                  onPress={() => Linking.openURL(idea.maps_url!)}
                  backgroundColor={colors.surface}
                  borderWidth={1}
                  borderColor={colors.border}
                  borderRadius={radii.lg}
                  height={52}
                >
                  <Text color={colors.textPrimary} fontWeight="600">🗺  Open in Maps</Text>
                </Button>
              )}
              {idea.booking_url && (
                <Button
                  onPress={() => Linking.openURL(idea.booking_url!)}
                  backgroundColor={colors.accent}
                  borderRadius={radii.lg}
                  height={52}
                >
                  <Text color={colors.background} fontWeight="600">🔗 Book Now</Text>
                </Button>
              )}
            </YStack>
          </YStack>
        </ScrollView>

        <Button
          position="absolute"
          top={spacing.md}
          right={spacing.md}
          circular
          size={36}
          backgroundColor="rgba(0,0,0,0.4)"
          onPress={onClose}
        >
          <Text color="#FFFFFF" fontWeight="700">✕</Text>
        </Button>
      </YStack>
    </Modal>
  );
}
