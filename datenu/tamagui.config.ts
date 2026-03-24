import { createTamagui, createTokens } from '@tamagui/core';
import { config as defaultConfig } from '@tamagui/config/v3';
import { colors, radii, spacing } from '@/constants/theme';

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    ...defaultConfig.tokens.color,
    background: colors.background,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    accent: colors.accent,
    accentLight: colors.accentLight,
    surface: colors.surface,
    border: colors.border,
    success: colors.success,
    error: colors.error,
  },
  radius: {
    ...defaultConfig.tokens.radius,
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    full: radii.full,
  },
  space: {
    ...defaultConfig.tokens.space,
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    xxl: spacing.xxl,
  },
  size: {
    ...defaultConfig.tokens.size,
  },
});

const config = createTamagui({
  ...defaultConfig,
  tokens,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: '$background',
      color: '$textPrimary',
      borderColor: '$border',
    },
  },
});

export type Conf = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
