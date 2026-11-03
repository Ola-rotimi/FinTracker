import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F6FA',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  primary: '#4F46E5',
  primarySoft: '#EEF2FF',
  onPrimary: '#FFFFFF',
  income: '#059669',
  expense: '#DC2626',
  warning: '#D97706',
  track: '#E5E7EB',
};

export type Theme = typeof light;

const dark: Theme = {
  bg: '#0B0F17',
  card: '#151B26',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#263041',
  inputBg: '#1C2431',
  primary: '#818CF8',
  primarySoft: '#1E1B4B',
  onPrimary: '#0B0F17',
  income: '#34D399',
  expense: '#F87171',
  warning: '#FBBF24',
  track: '#263041',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Palette offered when creating categories and goals. */
export const SWATCHES = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#78716C', '#64748B',
];
