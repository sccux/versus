import { Dimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VibeTags } from '@/components/ui/VibeTags';
import { CostBadge } from '@/components/ui/CostBadge';
import { DbDateIdea } from '@/types/database';
import { colors, spacing, radii } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
export const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface Props {
  idea: DbDateIdea;
  onPress: () => void;
}

export function SwipeCard({ idea, onPress }: Props) {
  const durationLabel = idea.duration_mins < 60
    ? `${idea.duration_mins} min`
    : `${Math.round(idea.duration_mins / 60)} hrs`;

  return (
    <YStack
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      borderRadius={radii.lg}
      overflow="hidden"
      onPress={onPress}
      style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
    >
      <Image
        source={{ uri: idea.photo_url }}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        contentFit="cover"
        transition={200}
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' }}
      />

      <XStack position="absolute" top={spacing.md} right={spacing.md} gap={spacing.xs}>
        <CostBadge cost={idea.cost_range} />
        <XStack
          backgroundColor="rgba(0,0,0,0.35)"
          borderRadius={radii.full}
          paddingHorizontal={spacing.sm}
          paddingVertical={4}
        >
          <Text fontSize={13} color="#FFFFFF" fontWeight="600">{durationLabel}</Text>
        </XStack>
      </XStack>

      <YStack position="absolute" bottom={0} left={0} right={0} padding={spacing.lg} gap={spacing.sm}>
        <Text fontSize={22} fontWeight="700" color="#FFFFFF">{idea.title}</Text>
        <Text fontSize={14} color="rgba(255,255,255,0.85)">{idea.tagline}</Text>
        <VibeTags tags={idea.vibe_tags} />
      </YStack>
    </YStack>
  );
}
