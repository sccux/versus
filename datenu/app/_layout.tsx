import { useEffect } from 'react';
import { TamaguiProvider } from '@tamagui/core';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import config from '@/tamagui.config';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';

export const PENDING_INVITE_KEY = 'pendingInviteCode';

SplashScreen.preventAutoHideAsync();

async function consumeInviteLink(url: string) {
  const match = url.match(/code=([A-Z0-9]{6})/);
  if (match) {
    await SecureStore.setItemAsync(PENDING_INVITE_KEY, match[1]);
  }
}

function AuthGuard() {
  const { session, loading: authLoading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple(session?.user?.id);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !coupleLoading) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, coupleLoading]);

  useEffect(() => {
    if (authLoading || coupleLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPairing = segments[0] === 'pairing';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (!couple) {
      if (!inPairing) router.replace('/pairing');
    } else {
      if (inAuthGroup || inPairing) router.replace('/(tabs)');
    }
  }, [session, couple, authLoading, coupleLoading]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    async function handleInitialUrl() {
      const url = await Linking.getInitialURL();
      if (url) consumeInviteLink(url);
    }
    handleInitialUrl();
    const sub = Linking.addEventListener('url', ({ url }) => consumeInviteLink(url));
    return () => sub.remove();
  }, []);

  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  );
}
