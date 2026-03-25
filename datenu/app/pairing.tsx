import { useEffect, useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import * as SecureStore from 'expo-secure-store';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { joinCoupleByCode } from '@/lib/couples';
import { PENDING_INVITE_KEY } from '@/app/_layout';
import { InviteCodePanel } from '@/components/pairing/InviteCodePanel';
import { InviteLinkPanel } from '@/components/pairing/InviteLinkPanel';
import { QRPanel } from '@/components/pairing/QRPanel';

type Method = 'code' | 'link' | 'qr';

export default function PairingScreen() {
  const { session, user } = useAuth();
  const { refresh } = useCouple(session?.user?.id);
  const [method, setMethod] = useState<Method>('code');
  const userId = session?.user?.id ?? '';
  const userRegion = user?.location_region ?? '';

  function onPaired() {
    refresh();
  }

  useEffect(() => {
    SecureStore.getItemAsync(PENDING_INVITE_KEY).then(async (code) => {
      if (code && userId) {
        await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
        try {
          await joinCoupleByCode(userId, code);
          onPaired();
        } catch (_) { /* let user pair manually */ }
      }
    });
  }, [userId]);

  return (
    <ScrollView backgroundColor={colors.background}>
      <YStack padding={spacing.xl} gap={spacing.xl} paddingTop={64}>
        <YStack gap={spacing.xs}>
          <Text fontSize={28} fontWeight="700" color={colors.textPrimary}>Find your person 💛</Text>
          <Text color={colors.textSecondary}>Connect with your partner to start discovering dates together.</Text>
        </YStack>

        <XStack gap={spacing.sm}>
          {(['code', 'link', 'qr'] as Method[]).map((m) => (
            <YStack
              key={m}
              flex={1}
              backgroundColor={method === m ? colors.accent : colors.surface}
              borderRadius={8}
              borderWidth={1}
              borderColor={method === m ? colors.accent : colors.border}
              padding={spacing.sm}
              alignItems="center"
              onPress={() => setMethod(m)}
            >
              <Text
                fontWeight="600"
                fontSize={13}
                color={method === m ? colors.background : colors.textPrimary}
              >
                {m === 'code' ? 'Code' : m === 'link' ? 'Link' : 'QR'}
              </Text>
            </YStack>
          ))}
        </XStack>

        {method === 'code' && <InviteCodePanel userId={userId} userRegion={userRegion} onPaired={onPaired} />}
        {method === 'link' && <InviteLinkPanel userId={userId} userRegion={userRegion} />}
        {method === 'qr' && <QRPanel userId={userId} userRegion={userRegion} onPaired={onPaired} />}
      </YStack>
    </ScrollView>
  );
}
