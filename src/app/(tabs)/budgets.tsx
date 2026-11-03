import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MonthSwitcher, useBudgetColor } from '@/components/finance';
import { AppText, Card, EmptyState, IconBadge, Loading, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import { budgetsWithSpending, categoryTotals } from '@/db/queries';
import { useQuery } from '@/hooks/useQuery';
import { currentMonthKey, daysInMonth, todayISO } from '@/lib/dates';
import { formatPercent } from '@/lib/money';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

export default function BudgetsScreen() {
  const t = useTheme();
  const { money } = useMoney();
  const budgetColor = useBudgetColor();
  const [month, setMonth] = useState(currentMonthKey());

  const data = useQuery(`budgets:${month}`, async (db) => {
    const [budgets, spending] = await Promise.all([budgetsWithSpending(db, month), categoryTotals(db, month, 'expense')]);
    const budgeted = new Set(budgets.map((b) => b.category_id));
    return { budgets, unbudgeted: spending.filter((s) => !budgeted.has(s.id)) };
  });

  if (!data) return <Loading />;
  const { budgets, unbudgeted } = data;

  const total = budgets.reduce((s, b) => s + b.budget, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);
  const ratio = total ? spent / total : 0;
  const isCurrent = month === currentMonthKey();
  // Fraction of the month elapsed, used to show whether spending is ahead of pace.
  const elapsed = isCurrent ? Number(todayISO().slice(8, 10)) / daysInMonth(month) : 1;
  const openBudget = (categoryId?: number) =>
    router.push(categoryId ? { pathname: '/budget', params: { categoryId: String(categoryId) } } : '/budget');

  return (
    <Screen>
      <MonthSwitcher month={month} onChange={setMonth} />

      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon="pie-chart-outline"
            title="No budgets yet"
            message="Set a monthly limit for categories like groceries or transport, and BudT will track how much is left."
            action={{ label: 'Create a budget', onPress: () => openBudget() }}
          />
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="label">Total budget</AppText>
            <View style={styles.between}>
              <AppText variant="title">{money(total - spent)}</AppText>
              <AppText variant="caption">{total >= spent ? 'left' : 'over budget'}</AppText>
            </View>
            <ProgressBar progress={ratio} color={budgetColor(ratio, t.primary)} height={10} />
            <View style={styles.between}>
              <AppText variant="caption">
                Spent {money(spent)} of {money(total)}
              </AppText>
              <AppText variant="caption">{formatPercent(ratio, 0)}</AppText>
            </View>
            {isCurrent && ratio > elapsed + 0.05 && ratio <= 1 && (
              <AppText variant="caption" color={t.warning}>
                You’ve used {formatPercent(ratio, 0)} of your budget with {formatPercent(1 - elapsed, 0)} of the month to go.
              </AppText>
            )}
          </Card>

          <View style={{ gap: 10 }}>
            {budgets.map((b) => {
              const r = b.spent / b.budget;
              const left = b.budget - b.spent;
              return (
                <Card key={b.category_id} onPress={() => openBudget(b.category_id)}>
                  <View style={styles.rowTop}>
                    <IconBadge icon={b.icon} color={b.color} size={38} />
                    <View style={{ flex: 1 }}>
                      <AppText weight="600">{b.name}</AppText>
                      <AppText variant="caption">
                        {money(b.spent)} of {money(b.budget)}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText weight="700" color={left < 0 ? t.expense : undefined}>
                        {money(Math.abs(left))}
                      </AppText>
                      <AppText variant="caption">{left < 0 ? 'over' : 'left'}</AppText>
                    </View>
                  </View>
                  <ProgressBar progress={r} color={budgetColor(r, b.color)} />
                </Card>
              );
            })}
          </View>
        </>
      )}

      {unbudgeted.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeader title="Spending without a budget" />
          <Card>
            {unbudgeted.map((c) => (
              <Pressable key={c.id} onPress={() => openBudget(c.id)} style={({ pressed }) => [styles.rowTop, pressed && { opacity: 0.6 }]}>
                <IconBadge icon={c.icon} color={c.color} size={34} />
                <AppText style={{ flex: 1 }} weight="600">
                  {c.name}
                </AppText>
                <AppText weight="600">{money(c.total)}</AppText>
                <Ionicons name="add-circle-outline" size={22} color={t.primary} accessibilityLabel={`Set budget for ${c.name}`} />
              </Pressable>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
