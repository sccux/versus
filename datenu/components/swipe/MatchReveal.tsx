import { Modal } from 'react-native';
import { YStack, Text, Button } from 'tamagui';
import LottieView from 'lottie-react-native';
import { colors, spacing, radii } from '@/constants/theme';
import { DbDateIdea } from '@/types/database';

interface Props {
  idea: DbDateIdea | null;
  onDismiss: () => void;
}

export function MatchReveal({ idea, onDismiss }: Props) {
  if (!idea) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <YStack
        flex={1}
        backgroundColor="rgba(201, 123, 132, 0.95)"
        justifyContent="center"
        alignItems="center"
        padding={spacing.xl}
      >
        <LottieView
          source={require('@/assets/animations/heart-burst.json')}
          autoPlay
          loop={false}
          style={{ width: 250, height: 250 }}
        />
        <Text fontSize={36} fontWeight="700" color="#FFFFFF" textAlign="center" marginTop={spacing.lg}>
          It's a match! 💛
        </Text>
        <Text fontSize={18} color="rgba(255,255,255,0.9)" textAlign="center" marginTop={spacing.sm}>
          {idea.title}
        </Text>
        <Text fontSize={14} color="rgba(255,255,255,0.75)" textAlign="center" marginTop={spacing.xs}>
          {idea.tagline}
        </Text>

        <Button
          onPress={onDismiss}
          backgroundColor="#FFFFFF"
          borderRadius={radii.lg}
          height={52}
          width="100%"
          marginTop={spacing.xxl}
        >
          <Text fontWeight="700" color={colors.accent}>Keep swiping</Text>
        </Button>
      </YStack>
    </Modal>
  );
}
