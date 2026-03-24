export const colors = {
  background: '#FAFAF8',
  textPrimary: '#1C1C1E',
  textSecondary: '#6B6B6B',
  accent: '#C97B84',
  accentLight: '#F2D9DC',
  surface: '#FFFFFF',
  border: '#E8E8E6',
  success: '#4CAF50',
  error: '#E53935',
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
