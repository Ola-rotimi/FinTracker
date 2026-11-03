import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart, DonutChart, Legend } from '@/components/charts';
import { MonthSwitcher } from '@/components/finance';
import { AppText, Card, EmptyState, IconBadge, Loading, ProgressBar, Screen, Segmented } from '@/components/ui';
import { categoryTotals, monthlyTotals } from '@/db/queries';
import type { TxType } from '@/db/types';
import { useQuery } from '@/hooks/useQuery';
import { currentMonthKey, daysInMonth, monthLabel, shiftMonth, todayISO } from '@/lib/dates';
import { formatPercent } from '@/lib/money';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

export default function InsightsScreen() {
  const t = useTheme();
  const { money } = useMoney();
  const [month, setMonth] = useState(currentMonthKey());
  const [type, setType] = useState<TxType>('expense');

  const data = useQuery(`insights:${month}:${type}`, async (db) => {
    const [categories, trend] = await Promise.all([categoryTotals(db, month, type), monthlyTotals(db, month, 6)]);
    return { categories, trend };
  });

  if (!data) return <Loading />;
  const { categories, trend } = data;

  const current = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const total = categories.reduce((s, c) => s + c.total, 0);
  const savingsRate = current.income > 0 ? (current.income - current.expense) / current.income : null;
  const daysCounted = month === currentMonthKey() ? Number(todayISO().slice(8, 10)) : daysInMonth(month);
  const expenseChange = previous.expense > 0 ? (current.expense - previous.expense) / previous.expense : null;
  const monthsWithData = trend.filter((m) => m.income || m.expense);
  const avgExpense = monthsWithData.length ? monthsWithData.reduce((s, m) => s + m.expense, 0) / monthsWithData.length : 0;

  return (
    <Screen>
      <MonthSwitcher month={month} onChange={setMonth} />

      <View style={styles.grid}>
        <Stat label="Savings rate" value={savingsRate === null ? '—' : formatPercent(savingsRate, 0)} color={savingsRate !== null && savingsRate < 0 ? t.expense : t.income} />
        <Stat label="Avg. daily spend" value={money(Math.round(current.expense / daysCounted))} />
        <Stat
          label={`vs ${monthLabel(shiftMonth(month, -1), true)}`}
          value={expenseChange === null ? '—' : `${expenseChange > 0 ? '+' : ''}${formatPercent(expenseChange, 0)}`}
          color={expenseChange === null ? undefined : expenseChange > 0 ? t.expense : t.income}
          caption="spending"
        />
        <Stat label="6-month avg. spend" value={money(Math.round(avgExpense))} />
      </View>

      <Card>
        <Segmented<TxType>
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: 'Spending' },
            { value: 'income', label: 'Income' },
          ]}
        />
        {categories.length === 0 ? (
          <EmptyState icon="pie-chart-outline" title={`No ${type === 'expense' ? 'spending' : 'income'} in ${monthLabel(month)}`} />
        ) : (
          <>
            <DonutChart data={categories.map((c) => ({ value: c.total, color: c.color }))}>
              <AppText variant="caption">Total</AppText>
              <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 120 }}>
                {money(total)}
              </AppText>
            </DonutChart>
            <View style={{ gap: 12 }}>
              {categories.map((c) => (
                <View key={c.id} style={{ gap: 6 }}>
                  <View style={styles.row}>
                    <IconBadge icon={c.icon} color={c.color} size={32} />
                    <View style={{ flex: 1 }}>
                      <AppText weight="600">{c.name}</AppText>
                      <AppText variant="caption">
                        {c.count} transaction{c.count === 1 ? '' : 's'} · {formatPercent(c.total / total, 0)}
                      </AppText>
                    </View>
                    <AppText weight="700">{money(c.total)}</AppText>
                  </View>
                  <ProgressBar progress={c.total / categories[0].total} color={c.color} height={6} />
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      <Card>
        <AppText variant="heading">Last 6 months</AppText>
        <BarChart
          labels={trend.map((m) => monthLabel(m.month, true))}
          series={[
            { color: t.income, values: trend.map((m) => m.income) },
            { color: t.expense, values: trend.map((m) => m.expense) },
          ]}
          formatValue={(v) => money(v, { compact: true })}
        />
        <Legend
          items={[
            { color: t.income, label: 'Income' },
            { color: t.expense, label: 'Expenses' },
          ]}
        />
      </Card>
    </Screen>
  );
}

function Stat({ label, value, color, caption }: { label: string; value: string; color?: string; caption?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.card, borderColor: t.border }]}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="heading" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {caption ? <AppText variant="caption">{caption}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
