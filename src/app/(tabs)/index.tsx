import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TransactionRow, useBudgetColor } from '@/components/finance';
import { AppText, Button, Card, EmptyState, ListRow, Loading, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import { allTimeTotals, budgetsWithSpending, listBills, listGoals, monthTotals, recentTransactions } from '@/db/queries';
import { useQuery } from '@/hooks/useQuery';
import { currentMonthKey, dayLabel, daysBetween, daysInMonth, monthLabel, todayISO } from '@/lib/dates';
import { formatPercent } from '@/lib/money';
import { useMoney, useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

export default function HomeScreen() {
  const t = useTheme();
  const { money } = useMoney();
  const { currencyChosen, country } = useSettings();
  const budgetColor = useBudgetColor();
  const month = currentMonthKey();
  const today = todayISO();

  const data = useQuery(`home:${month}:${today}`, async (db) => {
    const [totals, allTime, budgets, bills, goals, recent] = await Promise.all([
      monthTotals(db, month),
      allTimeTotals(db),
      budgetsWithSpending(db, month),
      listBills(db),
      listGoals(db),
      recentTransactions(db, 5),
    ]);
    return { totals, allTime, budgets, bills, goals, recent };
  });

  if (!data) return <Loading />;
  const { totals, allTime, budgets, bills, goals, recent } = data;

  const net = totals.income - totals.expense;
  const budgetTotal = budgets.reduce((s, b) => s + b.budget, 0);
  const budgetSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const budgetRatio = budgetTotal ? budgetSpent / budgetTotal : 0;
  const dayOfMonth = Number(today.slice(8, 10));
  const daysLeft = daysInMonth(month) - dayOfMonth + 1;
  const upcoming = bills.filter((b) => daysBetween(today, b.due_date) <= 14).slice(0, 3);
  const activeGoals = goals.filter((g) => g.saved < g.target).slice(0, 2);

  return (
    <Screen>
      {!country && (
        <Card
          onPress={() => router.push({ pathname: '/country', params: { purpose: 'home' } })}
          style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="globe-outline" size={22} color={t.primary} />
          <View style={{ flex: 1 }}>
            <AppText weight="700">Where are you based?</AppText>
            <AppText variant="caption">
              Pick your country to set your currency{currencyChosen ? '' : ' (USD for now)'} and fill in local tax & pension rules.
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Card>
      )}

      <View style={[styles.hero, { backgroundColor: t.primary }]}>
        <AppText color={t.onPrimary} style={{ opacity: 0.85 }}>
          {monthLabel(month)} · net
        </AppText>
        <AppText variant="display" color={t.onPrimary} adjustsFontSizeToFit numberOfLines={1}>
          {money(net, { sign: true })}
        </AppText>
        <View style={styles.heroRow}>
          <HeroStat icon="arrow-down" label="Income" value={money(totals.income)} />
          <HeroStat icon="arrow-up" label="Expenses" value={money(totals.expense)} />
        </View>
        <AppText variant="caption" color={t.onPrimary} style={{ opacity: 0.8 }}>
          All-time balance {money(allTime.income - allTime.expense)}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          title="Expense"
          icon="remove-circle-outline"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/transaction', params: { type: 'expense' } })}
        />
        <Button
          title="Income"
          icon="add-circle-outline"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/transaction', params: { type: 'income' } })}
        />
      </View>

      <Card>
        <SectionHeader title="Monthly budget" action={{ label: budgets.length ? 'Details' : 'Set up', onPress: () => router.navigate('/budgets') }} />
        {budgets.length ? (
          <>
            <ProgressBar progress={budgetRatio} color={budgetColor(budgetRatio, t.primary)} height={10} />
            <View style={styles.between}>
              <AppText variant="caption">
                {money(budgetSpent)} of {money(budgetTotal)} ({formatPercent(budgetRatio, 0)})
              </AppText>
              <AppText variant="caption">
                {daysLeft} day{daysLeft === 1 ? '' : 's'} left
              </AppText>
            </View>
            {budgetTotal > budgetSpent && (
              <AppText variant="caption">
                You can spend about {money(Math.floor((budgetTotal - budgetSpent) / daysLeft))} a day for the rest of the month.
              </AppText>
            )}
          </>
        ) : (
          <AppText variant="caption">Set spending limits per category to keep your month on track.</AppText>
        )}
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <SectionHeader title="Upcoming bills" action={{ label: 'All bills', onPress: () => router.push('/bills') }} />
          {upcoming.map((b) => {
            const due = daysBetween(today, b.due_date);
            return (
              <ListRow
                key={b.id}
                icon={b.category_icon}
                iconColor={b.category_color}
                title={b.name}
                subtitle={due < 0 ? `Overdue by ${-due} day${due === -1 ? '' : 's'}` : due === 0 ? 'Due today' : `Due ${dayLabel(b.due_date)}`}
                right={
                  <AppText weight="700" color={due < 0 ? t.expense : undefined}>
                    {money(b.amount)}
                  </AppText>
                }
                onPress={() => router.push('/bills')}
                chevron={false}
              />
            );
          })}
        </Card>
      )}

      {activeGoals.length > 0 && (
        <Card>
          <SectionHeader title="Savings goals" action={{ label: 'All goals', onPress: () => router.push('/goals') }} />
          {activeGoals.map((g) => (
            <View key={g.id} style={{ gap: 6 }}>
              <View style={styles.between}>
                <AppText weight="600">{g.name}</AppText>
                <AppText variant="caption">
                  {money(g.saved)} / {money(g.target)}
                </AppText>
              </View>
              <ProgressBar progress={g.saved / g.target} color={g.color} />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <SectionHeader title="Recent activity" action={recent.length ? { label: 'See all', onPress: () => router.navigate('/transactions') } : undefined} />
        {recent.length ? (
          recent.map((tx) => <TransactionRow key={tx.id} tx={tx} showDate={dayLabel(tx.date)} />)
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No transactions yet"
            message="Record your first income or expense to start tracking."
            action={{ label: 'Add transaction', onPress: () => router.push('/transaction') }}
          />
        )}
      </Card>
    </Screen>
  );
}

function HeroStat({ icon, label, value }: { icon: 'arrow-down' | 'arrow-up'; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroIcon}>
        <Ionicons name={icon} size={16} color={t.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={t.onPrimary} style={{ opacity: 0.85 }}>
          {label}
        </AppText>
        <AppText weight="700" color={t.onPrimary} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 20, gap: 12 },
  heroRow: { flexDirection: 'row', gap: 12 },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
