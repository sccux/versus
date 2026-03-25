import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { YStack, XStack, Text, Input, Button, Separator, Spinner } from 'tamagui';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { createUserProfile } from '@/lib/auth';
import { colors, spacing, radii } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!email || !password) return Alert.alert('Please enter email and password');
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await createUserProfile({
            id: data.user.id,
            email,
            displayName: email.split('@')[0],
            authProvider: 'email',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const redirectUri = makeRedirectUri({ scheme: 'datenu' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === 'success') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await createUserProfile({
              id: session.user.id,
              email: session.user.email ?? '',
              displayName: session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'User',
              authProvider: 'google',
              avatarUrl: session.user.user_metadata?.avatar_url,
            });
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign-In is only available on iOS');
      return;
    }
    setLoading(true);
    try {
      const redirectUri = makeRedirectUri({ scheme: 'datenu' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === 'success') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await createUserProfile({
              id: session.user.id,
              email: session.user.email ?? '',
              displayName: session.user.user_metadata?.full_name ?? 'User',
              authProvider: 'apple',
            });
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YStack flex={1} backgroundColor={colors.background} justifyContent="center" padding={spacing.xl}>
      {/* Logo placeholder */}
      <YStack alignItems="center" marginBottom={spacing.xxl}>
        <Text fontSize={40}>💛</Text>
        <Text fontSize={32} fontWeight="700" color={colors.textPrimary} marginTop={spacing.sm}>
          DateNu
        </Text>
        <Text fontSize={16} color={colors.textSecondary} marginTop={spacing.xs}>
          Find your next adventure together
        </Text>
      </YStack>

      {/* Social login */}
      <YStack gap={spacing.sm}>
        <Button
          onPress={handleGoogleSignIn}
          disabled={loading}
          backgroundColor={colors.surface}
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radii.lg}
          height={52}
        >
          <Text fontWeight="600" color={colors.textPrimary}>Continue with Google</Text>
        </Button>

        {Platform.OS === 'ios' && (
          <Button
            onPress={handleAppleSignIn}
            disabled={loading}
            backgroundColor={colors.textPrimary}
            borderRadius={radii.lg}
            height={52}
          >
            <Text fontWeight="600" color={colors.background}>Continue with Apple</Text>
          </Button>
        )}
      </YStack>

      <XStack alignItems="center" marginVertical={spacing.lg}>
        <Separator flex={1} />
        <Text color={colors.textSecondary} marginHorizontal={spacing.sm} fontSize={12}>or</Text>
        <Separator flex={1} />
      </XStack>

      {/* Email login */}
      <YStack gap={spacing.sm}>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          height={52}
          borderRadius={radii.lg}
          borderColor={colors.border}
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          height={52}
          borderRadius={radii.lg}
          borderColor={colors.border}
        />
        <Button
          onPress={handleEmailAuth}
          disabled={loading}
          backgroundColor={colors.accent}
          borderRadius={radii.lg}
          height={52}
        >
          {loading ? <Spinner color={colors.background} /> : (
            <Text fontWeight="600" color={colors.background}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </Button>

        <Button unstyled onPress={() => setIsSignUp(!isSignUp)} marginTop={spacing.xs}>
          <Text color={colors.textSecondary} textAlign="center" fontSize={14}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
