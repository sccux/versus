import { createTamagui, createTokens } from '@tamagui/core';
import { config as defaultConfig } from '@tamagui/config/v3';
import { colors, radii, spacing, fontSizes } from '@/constants/theme';

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    background: colors.background,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    accent: colors.accent,
    accentLight: colors.accentLight,
    surface: colors.surface,
    border: colors.border,
  },
  radius: {
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    full: radii.full,
  },
  space: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    xxl: spacing.xxl,
  },
});

const config = createTamagui({
  ...defaultConfig,
  tokens,
  themes: {
    light: {
      ...defaultConfig.themes.light,
      background: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
  },
  defaultTheme: 'light',
});

export type Conf = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
