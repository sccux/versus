import { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, Input, Button, Spinner } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';
import { getOrCreateCouple, joinCoupleByCode } from '@/lib/couples';

interface Props {
  userId: string;
  userRegion: string;
  onPaired: () => void;
}

export function InviteCodePanel({ userId, userRegion, onPaired }: Props) {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const couple = await getOrCreateCouple(userId, userRegion);
      setMyCode(couple.invite_code);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!enteredCode.trim()) return;
    setLoading(true);
    try {
      await joinCoupleByCode(userId, enteredCode.trim());
      onPaired();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YStack gap={spacing.lg}>
      <YStack gap={spacing.sm}>
        <Text fontWeight="600" color={colors.textPrimary}>Share your code</Text>
        {myCode ? (
          <YStack
            backgroundColor={colors.accentLight}
            borderRadius={radii.lg}
            padding={spacing.lg}
            alignItems="center"
          >
            <Text fontSize={32} fontWeight="700" letterSpacing={8} color={colors.accent}>
              {myCode}
            </Text>
          </YStack>
        ) : (
          <Button
            onPress={handleGenerate}
            disabled={loading}
            backgroundColor={colors.surface}
            borderWidth={1}
            borderColor={colors.border}
            borderRadius={radii.lg}
            height={52}
          >
            {loading ? <Spinner /> : <Text color={colors.textPrimary}>Generate my code</Text>}
          </Button>
        )}
      </YStack>

      <YStack gap={spacing.sm}>
        <Text fontWeight="600" color={colors.textPrimary}>Enter partner's code</Text>
        <XStack gap={spacing.sm}>
          <Input
            flex={1}
            placeholder="ABC123"
            value={enteredCode}
            onChangeText={(t) => setEnteredCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            height={52}
            borderRadius={radii.lg}
            borderColor={colors.border}
          />
          <Button
            onPress={handleJoin}
            disabled={loading || enteredCode.length < 6}
            backgroundColor={colors.accent}
            borderRadius={radii.lg}
            height={52}
            paddingHorizontal={spacing.lg}
          >
            <Text fontWeight="600" color={colors.background}>Join</Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
