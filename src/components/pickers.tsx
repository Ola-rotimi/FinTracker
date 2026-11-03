import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { listCategories } from '@/db/queries';
import type { IconName, TxType } from '@/db/types';
import { useQuery } from '@/hooks/useQuery';
import { SWATCHES, useTheme } from '@/lib/theme';
import { AppText } from './ui';

export const ICON_CHOICES: IconName[] = [
  'restaurant', 'fast-food', 'cafe', 'pizza', 'wine', 'cart', 'basket', 'bag-handle', 'shirt', 'home',
  'bed', 'construct', 'flash', 'water', 'flame', 'wifi', 'phone-portrait', 'tv', 'car', 'car-sport',
  'bus', 'train', 'bicycle', 'airplane', 'boat', 'medkit', 'fitness', 'barbell', 'heart', 'sparkles',
  'film', 'game-controller', 'musical-notes', 'book', 'school', 'paw', 'leaf', 'gift', 'people', 'person',
  'briefcase', 'storefront', 'laptop', 'business', 'trending-up', 'cash', 'card', 'wallet', 'repeat', 'shield-checkmark',
  'umbrella', 'globe', 'diamond', 'trophy', 'rocket', 'key', 'flag', 'star', 'camera', 'ellipsis-horizontal',
];

export function CategoryPicker({ type, value, onChange }: { type: TxType; value: number | null; onChange: (id: number) => void }) {
  const t = useTheme();
  const categories = useQuery(`categories:${type}`, (db) => listCategories(db, type));

  return (
    <View style={styles.wrap}>
      {categories?.map((c) => {
        const active = c.id === value;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { borderColor: active ? c.color : t.border, backgroundColor: active ? `${c.color}22` : t.card },
            ]}>
            <Ionicons name={c.icon} size={16} color={c.color} />
            <Text style={[styles.chipText, { color: t.text }]}>{c.name}</Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => router.push({ pathname: '/category', params: { type } })}
        style={[styles.chip, { borderColor: t.border, borderStyle: 'dashed' }]}>
        <Ionicons name="add" size={16} color={t.primary} />
        <Text style={[styles.chipText, { color: t.primary }]}>New</Text>
      </Pressable>
    </View>
  );
}

export function IconPicker({ value, color, onChange }: { value: IconName; color: string; onChange: (icon: IconName) => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">Icon</AppText>
      <View style={styles.wrap}>
        {ICON_CHOICES.map((icon) => {
          const active = icon === value;
          return (
            <Pressable
              key={icon}
              onPress={() => onChange(icon)}
              accessibilityLabel={icon}
              accessibilityState={{ selected: active }}
              style={[styles.iconCell, { backgroundColor: active ? `${color}33` : t.inputBg, borderColor: active ? color : 'transparent' }]}>
              <Ionicons name={icon} size={20} color={active ? color : t.muted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">Colour</AppText>
      <View style={styles.wrap}>
        {SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityLabel={c}
            accessibilityState={{ selected: c === value }}
            style={[styles.swatch, { backgroundColor: c, borderColor: c === value ? t.text : 'transparent' }]}>
            {c === value && <Ionicons name="checkmark" size={18} color="#fff" />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  iconCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});
