import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, HeaderButton, IconBadge, Loading, ProgressBar, Screen } from '@/components/ui';
import { listGoals } from '@/db/queries';
import type { Goal } from '@/db/types';
import { useQuery } from '@/hooks/useQuery';
import { daysBetween, shortDate, todayISO } from '@/lib/dates';
import { formatPercent } from '@/lib/money';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';
import { ProScreen } from '@/components/ProLock';
import { usePro } from '@/lib/pro';

const newGoal = () => router.push('/goal');

export default function GoalsScreen() {
  const { money } = useMoney();
  const goals = useQuery('goals', listGoals);

  const { isPro } = usePro();

  if (!isPro) return <ProScreen screenTitle="Savings goals" title="Save towards what matters" message="BudT Pro tracks savings goals with target dates and tells you how much to put aside each month. Any goals you’ve already created are kept." />;
  if (!goals) return <Loading />;
  const saved = goals.reduce((s, g) => s + g.saved, 0);
  const target = goals.reduce((s, g) => s + g.target, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Savings goals', headerRight: () => <HeaderButton icon="add" label="New goal" onPress={newGoal} /> }} />
      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon="flag-outline"
            title="No goals yet"
            message="Saving for a holiday, a car or an emergency fund? Create a goal and track your progress."
            action={{ label: 'Create a goal', onPress: newGoal }}
          />
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="label">Total saved</AppText>
            <AppText variant="title">{money(saved)}</AppText>
            <AppText variant="caption">
              {formatPercent(target ? saved / target : 0, 0)} of {money(target)} across {goals.length} goal{goals.length === 1 ? '' : 's'}
            </AppText>
          </Card>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </>
      )}
    </Screen>
  );
}

function GoalCard({ goal: g }: { goal: Goal }) {
  const t = useTheme();
  const { money } = useMoney();
  const done = g.saved >= g.target;
  const remaining = g.target - g.saved;

  let pace = '';
  if (done) pace = 'Goal reached — well done!';
  else if (g.deadline) {
    const days = daysBetween(todayISO(), g.deadline);
    if (days <= 0) pace = `Target date passed (${shortDate(g.deadline)})`;
    else {
      const months = Math.max(1, days / 30.44);
      pace = `${money(Math.ceil(remaining / months))}/month to reach it by ${shortDate(g.deadline)}`;
    }
  }

  return (
    <Card onPress={() => router.push({ pathname: '/goal', params: { id: String(g.id) } })}>
      <View style={styles.row}>
        <IconBadge icon={done ? 'trophy' : g.icon} color={g.color} />
        <View style={{ flex: 1 }}>
          <AppText weight="700">{g.name}</AppText>
          <AppText variant="caption">
            {money(g.saved)} of {money(g.target)}
          </AppText>
        </View>
        <AppText weight="700" color={g.color}>
          {formatPercent(g.saved / g.target, 0)}
        </AppText>
      </View>
      <ProgressBar progress={g.saved / g.target} color={g.color} height={10} />
      {pace ? (
        <AppText variant="caption" color={done ? t.income : undefined}>
          {pace}
        </AppText>
      ) : null}
      {!done && (
        <Button
          title="Add money"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/contribute', params: { id: String(g.id) } })}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
