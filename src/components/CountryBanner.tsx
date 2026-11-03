import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CountryPreset } from '@/lib/countries';
import { useTheme } from '@/lib/theme';
import { AppText, Card } from './ui';

/** Shows which country's rules a calculator is using, with a button to switch. */
export function CountryBanner({ preset, subtitle }: { preset?: CountryPreset; subtitle?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/country', params: { purpose: 'calc' } })}
      accessibilityRole="button"
      accessibilityLabel={`Rules for ${preset?.name ?? 'custom rates'}. Change country`}
      style={({ pressed }) => [styles.banner, { backgroundColor: t.primarySoft, borderColor: t.primary }, pressed && { opacity: 0.7 }]}>
      <Text style={styles.flag}>{preset?.flag ?? '✏️'}</Text>
      <View style={{ flex: 1 }}>
        <AppText weight="700">{preset ? preset.name : 'Custom rates'}</AppText>
        <AppText variant="caption">{subtitle ?? (preset ? `${preset.currency}` : 'Enter your own bands and rates')}</AppText>
      </View>
      <View style={styles.change}>
        <AppText variant="label" color={t.primary}>
          Change
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={t.primary} />
      </View>
    </Pressable>
  );
}

/** Bulleted notes explaining what a preset includes and leaves out. */
export function PresetNotes({ title, notes }: { title: string; notes: string[] }) {
  const t = useTheme();
  if (!notes.length) return null;
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.noteTitle}>
        <Ionicons name="information-circle-outline" size={18} color={t.primary} />
        <AppText variant="label" color={t.text}>
          {title}
        </AppText>
      </View>
      {notes.map((n) => (
        <View key={n} style={styles.note}>
          <AppText variant="caption">•</AppText>
          <AppText variant="caption" style={{ flex: 1 }}>
            {n}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  flag: { fontSize: 30 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  noteTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { flexDirection: 'row', gap: 6 },
});
