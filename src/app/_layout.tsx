import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { SettingsProvider } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

/** Form screens presented as modals over the current screen. */
const MODALS = ['transaction', 'budget', 'goal', 'contribute', 'bill', 'category', 'country'];

export default function RootLayout() {
  const t = useTheme();
  const base = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: t.primary, background: t.bg, card: t.card, text: t.text, border: t.border },
  };

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: t.primary, headerTitleStyle: { color: t.text } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
            {MODALS.map((name) => (
              <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />
            ))}
          </Stack>
        </ThemeProvider>
      </SettingsProvider>
    </SQLiteProvider>
  );
}
