import { Alert, Share } from 'react-native';
import { useState } from 'react';
import { YStack, Text, Button, Spinner } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';
import { getOrCreateCouple, buildInviteLink } from '@/lib/couples';

interface Props {
  userId: string;
  userRegion: string;
}

export function InviteLinkPanel({ userId, userRegion }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const couple = await getOrCreateCouple(userId, userRegion);
      const url = buildInviteLink(couple.invite_code);
      await Share.share({
        message: `Join me on DateNu! Use this link to pair with me: ${url}`,
        url,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YStack gap={spacing.sm}>
      <Text fontWeight="600" color={colors.textPrimary}>Invite via link</Text>
      <Text color={colors.textSecondary} fontSize={14}>
        Send your partner a link to pair instantly.
      </Text>
      <Button
        onPress={handleShare}
        disabled={loading}
        backgroundColor={colors.accent}
        borderRadius={radii.lg}
        height={52}
      >
        {loading ? <Spinner color={colors.background} /> : (
          <Text fontWeight="600" color={colors.background}>Share invite link</Text>
        )}
      </Button>
    </YStack>
  );
}
