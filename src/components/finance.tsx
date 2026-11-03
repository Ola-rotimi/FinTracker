import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TxRow } from '@/db/queries';
import { currentMonthKey, monthLabel, shiftMonth } from '@/lib/dates';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';
import { AppText, IconBadge } from './ui';

export function TransactionRow({ tx, showDate }: { tx: TxRow; showDate?: string }) {
  const t = useTheme();
  const { money } = useMoney();
  const income = tx.type === 'income';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transaction', params: { id: String(tx.id) } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <IconBadge icon={tx.category_icon} color={tx.category_color} size={40} />
      <View style={{ flex: 1 }}>
        <AppText weight="600" numberOfLines={1}>
          {tx.note || tx.category_name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {[tx.note ? tx.category_name : null, showDate].filter(Boolean).join(' · ') || (income ? 'Income' : 'Expense')}
        </AppText>
      </View>
      <AppText weight="700" color={income ? t.income : t.text} style={{ fontVariant: ['tabular-nums'] }}>
        {income ? '+' : '−'}
        {money(tx.amount)}
      </AppText>
    </Pressable>
  );
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const t = useTheme();
  const atCurrent = month >= currentMonthKey();
  return (
    <View style={styles.switcher}>
      <Pressable onPress={() => onChange(shiftMonth(month, -1))} hitSlop={10} accessibilityLabel="Previous month" style={styles.arrow}>
        <Ionicons name="chevron-back" size={22} color={t.primary} />
      </Pressable>
      <Pressable onPress={() => onChange(currentMonthKey())} accessibilityLabel="Go to current month">
        <AppText variant="heading">{monthLabel(month)}</AppText>
      </Pressable>
      <Pressable
        onPress={() => onChange(shiftMonth(month, 1))}
        disabled={atCurrent}
        hitSlop={10}
        accessibilityLabel="Next month"
        style={[styles.arrow, atCurrent && { opacity: 0.3 }]}>
        <Ionicons name="chevron-forward" size={22} color={t.primary} />
      </Pressable>
    </View>
  );
}

/** Colour for a spent/limit ratio: normal, warning past 80%, over budget past 100%. */
export function useBudgetColor() {
  const t = useTheme();
  return (ratio: number, base: string) => (ratio > 1 ? t.expense : ratio >= 0.8 ? t.warning : base);
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  switcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { padding: 6 },
});
