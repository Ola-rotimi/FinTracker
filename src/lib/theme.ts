import { useColorScheme } from 'react-native';

/** Brand colours taken from the BudT app icon. */
export const BRAND = {
  gradientStart: '#0F766E',
  gradientEnd: '#064E3B',
  amber: '#FBBF24',
};

const light = {
  bg: '#F3F7F6',
  card: '#FFFFFF',
  text: '#0F1F1C',
  muted: '#5F6F6B',
  border: '#DDE7E4',
  inputBg: '#F7FAF9',
  primary: '#0F766E',
  primarySoft: '#DDF3EE',
  onPrimary: '#FFFFFF',
  accent: '#D97706',
  income: '#059669',
  expense: '#DC2626',
  warning: '#D97706',
  track: '#E3ECE9',
};

export type Theme = typeof light;

const dark: Theme = {
  bg: '#08110F',
  card: '#111C1A',
  text: '#ECF5F3',
  muted: '#93A6A1',
  border: '#1F2E2B',
  inputBg: '#16231F',
  primary: '#2DD4BF',
  primarySoft: '#123B36',
  onPrimary: '#04201C',
  accent: '#FBBF24',
  income: '#34D399',
  expense: '#F87171',
  warning: '#FBBF24',
  track: '#1F2E2B',
};

/** Follows the app's colour scheme, which the user can pin to light or dark in Settings. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export type ThemePreference = 'system' | 'light' | 'dark';

/** Palette offered when creating categories and goals. */
export const SWATCHES = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#78716C', '#64748B',
];
