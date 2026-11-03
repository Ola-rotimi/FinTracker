import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, TextInput, View } from 'react-native';
import { MonthSwitcher, TransactionRow } from '@/components/finance';
import { AppText, EmptyState, HeaderButton, Segmented } from '@/components/ui';
import { listTransactions, type TxRow } from '@/db/queries';
import type { TxType } from '@/db/types';
import { useQuery } from '@/hooks/useQuery';
import { currentMonthKey, dayLabel } from '@/lib/dates';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

type Filter = 'all' | TxType;

export default function TransactionsScreen() {
  const t = useTheme();
  const { money } = useMoney();
  const [month, setMonth] = useState(currentMonthKey());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const rows = useQuery(`tx:${month}:${filter}:${search}`, (db) =>
    listTransactions(db, month, filter === 'all' ? undefined : filter, search),
  );

  const { sections, income, expense } = useMemo(() => {
    const groups = new Map<string, TxRow[]>();
    let income = 0;
    let expense = 0;
    for (const r of rows ?? []) {
      if (r.type === 'income') income += r.amount;
      else expense += r.amount;
      const list = groups.get(r.date);
      if (list) list.push(r);
      else groups.set(r.date, [r]);
    }
    const sections = [...groups].map(([date, data]) => ({
      date,
      data,
      net: data.reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0),
    }));
    return { sections, income, expense };
  }, [rows]);

  return (
    <SectionList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 8 }}>
          <Stack.Screen
            options={{
              title: 'Activity',
              headerRight: () => <HeaderButton icon="add" label="Add transaction" onPress={() => router.push('/transaction')} />,
            }}
          />
          <MonthSwitcher month={month} onChange={setMonth} />
          <View style={[styles.search, { backgroundColor: t.inputBg, borderColor: t.border }]}>
            <Ionicons name="search" size={18} color={t.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search notes or categories"
              placeholderTextColor={t.muted}
              style={[styles.searchInput, { color: t.text }]}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
          />
          <View style={[styles.summary, { backgroundColor: t.card, borderColor: t.border }]}>
            <SummaryItem label="Income" value={money(income)} color={t.income} />
            <SummaryItem label="Expenses" value={money(expense)} color={t.expense} />
            <SummaryItem label="Net" value={money(income - expense, { sign: true })} color={t.text} />
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <AppText variant="label">{dayLabel(section.date)}</AppText>
          <AppText variant="caption">{money(section.net, { sign: true })}</AppText>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={[styles.item, { backgroundColor: t.card }]}>
          <TransactionRow tx={item} />
        </View>
      )}
      ListEmptyComponent={
        rows ? (
          <EmptyState
            icon="receipt-outline"
            title={search ? 'No matches' : 'Nothing recorded this month'}
            message={search ? 'Try a different search term.' : 'Tap + to add an income or expense.'}
            action={search ? undefined : { label: 'Add transaction', onPress: () => router.push('/transaction') }}
          />
        ) : undefined
      }
    />
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="caption">{label}</AppText>
      <AppText weight="700" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 16 },
  summary: { flexDirection: 'row', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 6, paddingHorizontal: 4 },
  item: { paddingHorizontal: 12, borderRadius: 12, marginBottom: 6 },
});
