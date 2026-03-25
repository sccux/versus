import { useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { YStack, Text } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SwipeCard, CARD_WIDTH, CARD_HEIGHT } from './SwipeCard';
import { DbDateIdea } from '@/types/database';
import { colors, spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

interface Props {
  ideas: DbDateIdea[];
  onSwipeLeft: (idea: DbDateIdea) => void;
  onSwipeRight: (idea: DbDateIdea) => void;
  onCardPress: (idea: DbDateIdea) => void;
}

function SwipeableCard({
  idea,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  isTop,
}: {
  idea: DbDateIdea;
  onSwipeLeft: (idea: DbDateIdea) => void;
  onSwipeRight: (idea: DbDateIdea) => void;
  onPress: () => void;
  isTop: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 10 }, () => {
          runOnJS(onSwipeRight)(idea);
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 10 }, () => {
          runOnJS(onSwipeLeft)(idea);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .onEnd(() => runOnJS(onPress)());

  const composedGesture = Gesture.Simultaneous(gesture, tapGesture);

  const animStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cardContainer, animStyle]}>
        <SwipeCard idea={idea} onPress={onPress} />
      </Animated.View>
    </GestureDetector>
  );
}

export function CardStack({ ideas, onSwipeLeft, onSwipeRight, onCardPress }: Props) {
  if (!ideas.length) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap={spacing.md}>
        <Text fontSize={40}>🌟</Text>
        <Text fontSize={18} fontWeight="600" color={colors.textPrimary}>You're all caught up!</Text>
        <Text color={colors.textSecondary}>Check back soon for new date ideas.</Text>
      </YStack>
    );
  }

  const visible = ideas.slice(-3);

  return (
    <YStack width={CARD_WIDTH} height={CARD_HEIGHT} position="relative">
      {visible.map((idea, index) => (
        <SwipeableCard
          key={idea.id}
          idea={idea}
          isTop={index === visible.length - 1}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          onPress={() => onCardPress(idea)}
        />
      ))}
    </YStack>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
