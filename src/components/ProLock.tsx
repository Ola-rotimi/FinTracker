import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BRAND, useTheme } from '@/lib/theme';
import { AppText, Button, Card, Screen } from './ui';

/** Shown in place of a Pro-only result: explains what unlocking gives and opens the paywall. */
export function ProLock({ title, message }: { title: string; message: string }) {
  const t = useTheme();
  return (
    <Card style={[styles.card, { borderColor: t.primary }]}>
      <View style={[styles.badge, { backgroundColor: t.primarySoft }]}>
        <Ionicons name="lock-closed" size={22} color={t.primary} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText style={{ textAlign: 'center', color: t.muted }}>{message}</AppText>
      <Button title="Unlock with BudT Pro" icon="sparkles" onPress={() => router.push('/paywall')} style={{ alignSelf: 'stretch' }} />
    </Card>
  );
}

/** Full-screen replacement for a Pro-only screen. Existing data is kept, just hidden until unlocked. */
export function ProScreen({ screenTitle, title, message }: { screenTitle: string; title: string; message: string }) {
  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle, headerRight: undefined }} />
      <ProLock title={title} message={message} />
    </Screen>
  );
}

/** Small "PRO" pill for menus. */
export function ProBadge() {
  return (
    <View style={[styles.pill, { backgroundColor: BRAND.amber }]}>
      <AppText variant="caption" weight="800" color="#3B2502">
        PRO
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', borderWidth: 1.5, paddingVertical: 24 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
