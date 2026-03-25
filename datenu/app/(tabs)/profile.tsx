import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, XStack, Text, Input, Button, Spinner } from 'tamagui';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { updateUserProfile, signOut } from '@/lib/auth';
import { updateCoupleLocation } from '@/lib/couples';
import { IdeaSubmissionForm } from '@/components/profile/IdeaSubmissionForm';
import { colors, spacing, radii } from '@/constants/theme';

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const { couple, partner } = useCouple(session?.user?.id);

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [coupleLocation, setCoupleLocation] = useState(couple?.location_region ?? '');

  useEffect(() => {
    if (couple?.location_region) setCoupleLocation(couple.location_region);
  }, [couple?.location_region]);

  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      await updateUserProfile(session.user.id, {
        display_name: displayName.trim(),
      });
      if (couple?.id && coupleLocation.trim() !== couple.location_region) {
        await updateCoupleLocation(couple.id, coupleLocation.trim());
      }
      Alert.alert('Saved!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setSigningOut(false);
    }
  }

  const pairedSince = couple?.created_at
    ? new Date(couple.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <YStack padding={spacing.xl} paddingTop={insets.top + spacing.md} gap={spacing.xl}>

        {/* User info */}
        <YStack gap={spacing.md}>
          <Text fontSize={22} fontWeight="700" color={colors.textPrimary}>Profile</Text>

          <YStack
            backgroundColor={colors.surface}
            borderRadius={radii.lg}
            padding={spacing.lg}
            gap={spacing.md}
          >
            <YStack gap={spacing.xs}>
              <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Display Name</Text>
              <Input
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                height={48}
                borderRadius={radii.md}
                borderColor={colors.border}
              />
            </YStack>
            <YStack gap={spacing.xs}>
              <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Couple Location</Text>
              <Text fontSize={12} color={colors.textSecondary}>
                Used to filter date ideas for both of you.
              </Text>
              <Input
                value={coupleLocation}
                onChangeText={setCoupleLocation}
                placeholder="e.g. Copenhagen"
                height={48}
                borderRadius={radii.md}
                borderColor={colors.border}
              />
            </YStack>
            <Button
              onPress={handleSave}
              disabled={saving}
              backgroundColor={colors.accent}
              borderRadius={radii.lg}
              height={48}
            >
              {saving ? <Spinner color={colors.background} /> : (
                <Text fontWeight="600" color={colors.background}>Save changes</Text>
              )}
            </Button>
          </YStack>
        </YStack>

        {/* Couple info */}
        {couple && partner && (
          <YStack gap={spacing.md}>
            <Text fontSize={18} fontWeight="700" color={colors.textPrimary}>Your Couple 💛</Text>
            <YStack
              backgroundColor={colors.surface}
              borderRadius={radii.lg}
              padding={spacing.lg}
              gap={spacing.sm}
            >
              <XStack alignItems="center" gap={spacing.md}>
                {partner.avatar_url ? (
                  <Image
                    source={{ uri: partner.avatar_url }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    contentFit="cover"
                  />
                ) : (
                  <YStack
                    width={48}
                    height={48}
                    borderRadius={24}
                    backgroundColor={colors.accentLight}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text fontSize={20}>{partner.display_name.charAt(0).toUpperCase()}</Text>
                  </YStack>
                )}
                <YStack>
                  <Text fontWeight="600" color={colors.textPrimary}>{partner.display_name}</Text>
                  <Text fontSize={13} color={colors.textSecondary}>{partner.email}</Text>
                </YStack>
              </XStack>
              {pairedSince && (
                <Text fontSize={13} color={colors.textSecondary}>
                  Together since {pairedSince}
                </Text>
              )}
            </YStack>
          </YStack>
        )}

        {/* Idea submission CTA */}
        <YStack gap={spacing.md}>
          <Text fontSize={18} fontWeight="700" color={colors.textPrimary}>Share a Date Idea</Text>
          <YStack
            backgroundColor={colors.accentLight}
            borderRadius={radii.lg}
            padding={spacing.lg}
            gap={spacing.sm}
          >
            <Text color={colors.textPrimary} fontSize={14}>
              Have a great date idea? Submit it and it might show up for other couples!
            </Text>
            <IdeaSubmissionForm userId={session?.user?.id ?? ''} />
          </YStack>
        </YStack>

        {/* Sign out */}
        <Button
          onPress={handleSignOut}
          disabled={signingOut}
          backgroundColor="transparent"
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radii.lg}
          height={48}
          marginTop={spacing.sm}
        >
          {signingOut ? <Spinner /> : (
            <Text color={colors.textSecondary}>Sign out</Text>
          )}
        </Button>

      </YStack>
    </ScrollView>
  );
}
