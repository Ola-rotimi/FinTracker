import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { CategoryPicker } from '@/components/pickers';
import { AppText, Button, Field, Screen } from '@/components/ui';
import { categoryTotals, deleteBudget, getBudget, setBudget } from '@/db/queries';
import { currentMonthKey, shiftMonth } from '@/lib/dates';
import { centsToInput, parseAmount } from '@/lib/money';
import { useMoney } from '@/lib/settings';

export default function BudgetScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const db = useSQLiteContext();
  const { currency, money } = useMoney();
  const [categoryId, setCategoryId] = useState<number | null>(params.categoryId ? Number(params.categoryId) : null);
  const [amount, setAmount] = useState('');
  const [exists, setExists] = useState(false);
  const [lastMonth, setLastMonth] = useState<number | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    getBudget(db, categoryId).then((b) => {
      setExists(!!b);
      setAmount(b ? centsToInput(b.amount) : '');
    });
    categoryTotals(db, shiftMonth(currentMonthKey(), -1), 'expense').then((rows) =>
      setLastMonth(rows.find((r) => r.id === categoryId)?.total ?? 0),
    );
  }, [db, categoryId]);

  const save = async () => {
    const cents = parseAmount(amount);
    if (!categoryId) return Alert.alert('Pick a category');
    if (!cents) return Alert.alert('Enter a monthly limit', 'The amount must be greater than zero.');
    await setBudget(db, categoryId, cents);
    router.back();
  };

  const remove = async () => {
    await deleteBudget(db, categoryId!);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: exists ? 'Edit budget' : 'New budget' }} />
      <View style={{ gap: 8 }}>
        <AppText variant="label">Category</AppText>
        <CategoryPicker type="expense" value={categoryId} onChange={setCategoryId} />
      </View>
      <Field
        label="Monthly limit"
        prefix={currency}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        hint={lastMonth ? `You spent ${money(lastMonth)} on this last month.` : 'Budgets repeat every month.'}
      />
      <Button title="Save budget" icon="checkmark" onPress={save} />
      {exists && <Button title="Remove budget" variant="danger" icon="trash-outline" onPress={remove} />}
    </Screen>
  );
}
