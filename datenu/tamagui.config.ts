import { createTamagui, createTokens } from '@tamagui/core';
import { config as defaultConfig } from '@tamagui/config/v3';
import { colors, radii, spacing } from '@/constants/theme';

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    ...defaultConfig.tokens.color,
    appBackground: colors.background,
    appTextPrimary: colors.textPrimary,
    appTextSecondary: colors.textSecondary,
    appAccent: colors.accent,
    appAccentLight: colors.accentLight,
    appSurface: colors.surface,
    appBorder: colors.border,
    appSuccess: colors.success,
    appError: colors.error,
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
});

const config = createTamagui({
  ...defaultConfig,
  tokens,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: tokens.color.appBackground,
      color: tokens.color.appTextPrimary,
      borderColor: tokens.color.appBorder,
      accent: tokens.color.appAccent,
      accentLight: tokens.color.appAccentLight,
      surface: tokens.color.appSurface,
      success: tokens.color.appSuccess,
      error: tokens.color.appError,
    },
    dark: {
      ...defaultConfig.themes.dark,
      accent: tokens.color.appAccent,
      accentLight: tokens.color.appAccentLight,
      success: tokens.color.appSuccess,
      error: tokens.color.appError,
    },
  },
});

export type Conf = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
