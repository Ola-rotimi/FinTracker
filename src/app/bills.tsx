import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, HeaderButton, IconBadge, Loading, Screen } from '@/components/ui';
import { listBills, markBillPaid, type BillRow } from '@/db/queries';
import { useQuery } from '@/hooks/useQuery';
import { daysBetween, shortDate, todayISO, type Frequency } from '@/lib/dates';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';
import { ProScreen } from '@/components/ProLock';
import { usePro } from '@/lib/pro';

const FREQUENCY_LABEL: Record<Frequency, string> = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', once: 'One-off' };
/** Rough monthly equivalent of each frequency, for the monthly commitment total. */
const PER_MONTH: Record<Frequency, number> = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12, once: 0 };

const newBill = () => router.push('/bill');

export default function BillsScreen() {
  const { money } = useMoney();
  const today = todayISO();
  const bills = useQuery(`bills:${today}`, listBills);

  const { isPro } = usePro();

  if (!isPro) return <ProScreen screenTitle="Bills & subscriptions" title="Never miss a bill" message="BudT Pro tracks rent, utilities and subscriptions, warns you before they’re due and records payments in one tap. Any bills you’ve already added are kept." />;
  if (!bills) return <Loading />;
  const next30 = bills.filter((b) => daysBetween(today, b.due_date) <= 30).reduce((s, b) => s + b.amount, 0);
  const monthly = bills.reduce((s, b) => s + b.amount * PER_MONTH[b.frequency], 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Bills & subscriptions', headerRight: () => <HeaderButton icon="add" label="New bill" onPress={newBill} /> }} />
      {bills.length === 0 ? (
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="No bills yet"
            message="Add rent, utilities and subscriptions to see what’s due and record payments in one tap."
            action={{ label: 'Add a bill', onPress: newBill }}
          />
        </Card>
      ) : (
        <>
          <View style={styles.summary}>
            <Card style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption">Due in 30 days</AppText>
              <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
                {money(next30)}
              </AppText>
            </Card>
            <Card style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption">Recurring per month</AppText>
              <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
                {money(Math.round(monthly))}
              </AppText>
            </Card>
          </View>
          {bills.map((b) => (
            <BillCard key={b.id} bill={b} today={today} />
          ))}
        </>
      )}
    </Screen>
  );
}

function BillCard({ bill: b, today }: { bill: BillRow; today: string }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const { money } = useMoney();
  const due = daysBetween(today, b.due_date);
  const status =
    due < 0 ? `Overdue by ${-due} day${due === -1 ? '' : 's'}` : due === 0 ? 'Due today' : due === 1 ? 'Due tomorrow' : `Due in ${due} days`;
  const statusColor = due < 0 ? t.expense : due <= 3 ? t.warning : t.muted;

  const pay = () =>
    Alert.alert('Mark as paid?', `Records a ${money(b.amount)} expense for “${b.name}” today${b.frequency === 'once' ? '.' : ' and moves it to the next due date.'}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark paid', onPress: () => markBillPaid(db, b) },
    ]);

  return (
    <Card onPress={() => router.push({ pathname: '/bill', params: { id: String(b.id) } })}>
      <View style={styles.row}>
        <IconBadge icon={b.category_icon} color={b.category_color} />
        <View style={{ flex: 1 }}>
          <AppText weight="700">{b.name}</AppText>
          <AppText variant="caption">
            {FREQUENCY_LABEL[b.frequency]} · {shortDate(b.due_date)}
          </AppText>
        </View>
        <AppText weight="700">{money(b.amount)}</AppText>
      </View>
      <View style={styles.row}>
        <AppText variant="label" color={statusColor} style={{ flex: 1 }}>
          {status}
        </AppText>
        <Button title="Mark paid" icon="checkmark-circle-outline" variant="secondary" onPress={pay} style={{ minHeight: 38 }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
