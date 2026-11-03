import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { AppText, Button, Card, Field, IconBadge, Loading, ProgressBar, Screen, Segmented } from '@/components/ui';
import { contributeToGoal, getGoal } from '@/db/queries';
import { useQuery } from '@/hooks/useQuery';
import { parseAmount } from '@/lib/money';
import { useMoney } from '@/lib/settings';
import { ProScreen } from '@/components/ProLock';
import { usePro } from '@/lib/pro';

type Mode = 'add' | 'withdraw';

export default function ContributeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { currency, money } = useMoney();
  const goal = useQuery(`goal:${id}`, (d) => getGoal(d, Number(id)));
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState('');

  const { isPro } = usePro();

  if (!isPro) return <ProScreen screenTitle="Savings goals" title="Save towards what matters" message="BudT Pro tracks savings goals with target dates and tells you how much to put aside each month. Any goals you’ve already created are kept." />;
  if (!goal) return <Loading />;

  const save = async () => {
    const cents = parseAmount(amount);
    if (!cents) return Alert.alert('Enter an amount', 'The amount must be greater than zero.');
    if (mode === 'withdraw' && cents > goal.saved) return Alert.alert('Not enough saved', `You have ${money(goal.saved)} in this goal.`);
    await contributeToGoal(db, goal.id, mode === 'add' ? cents : -cents);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: goal.name }} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon={goal.icon} color={goal.color} />
          <View style={{ flex: 1 }}>
            <AppText weight="700">{money(goal.saved)} saved</AppText>
            <AppText variant="caption">of {money(goal.target)} target</AppText>
          </View>
        </View>
        <ProgressBar progress={goal.saved / goal.target} color={goal.color} />
      </Card>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'add', label: 'Add money' },
          { value: 'withdraw', label: 'Withdraw' },
        ]}
      />
      <Field label="Amount" prefix={currency} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" autoFocus />
      <Button title={mode === 'add' ? 'Add to goal' : 'Withdraw from goal'} icon="checkmark" onPress={save} />
    </Screen>
  );
}
