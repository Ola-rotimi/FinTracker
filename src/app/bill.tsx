import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { DateField } from '@/components/DateField';
import { CategoryPicker } from '@/components/pickers';
import { AppText, Button, Field, Screen, Segmented } from '@/components/ui';
import { deleteBill, getBill, saveBill } from '@/db/queries';
import { todayISO, type Frequency } from '@/lib/dates';
import { centsToInput, parseAmount } from '@/lib/money';
import { useSettings } from '@/lib/settings';

export default function BillScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const db = useSQLiteContext();
  const { currency } = useSettings();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(todayISO());
  const [frequency, setFrequency] = useState<Frequency>('monthly');

  useEffect(() => {
    if (!id) return;
    getBill(db, id).then((b) => {
      if (!b) return;
      setName(b.name);
      setAmount(centsToInput(b.amount));
      setCategoryId(b.category_id);
      setDueDate(b.due_date);
      setFrequency(b.frequency);
    });
  }, [db, id]);

  const save = async () => {
    const cents = parseAmount(amount);
    if (!name.trim()) return Alert.alert('Give the bill a name');
    if (!cents) return Alert.alert('Enter an amount', 'The amount must be greater than zero.');
    if (!categoryId) return Alert.alert('Pick a category');
    await saveBill(db, { id, name: name.trim(), amount: cents, category_id: categoryId, due_date: dueDate, frequency });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete bill?', 'Past payments stay in your transactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBill(db, id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit bill' : 'New bill' }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Rent, Netflix, Electricity" autoFocus={!id} />
      <Field label="Amount" prefix={currency} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <View style={{ gap: 8 }}>
        <AppText variant="label">Repeats</AppText>
        <Segmented<Frequency>
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
            { value: 'once', label: 'Once' },
          ]}
        />
      </View>
      <DateField label="Next due date" value={dueDate} onChange={setDueDate} />
      <View style={{ gap: 8 }}>
        <AppText variant="label">Category</AppText>
        <CategoryPicker type="expense" value={categoryId} onChange={setCategoryId} />
      </View>
      <Button title={id ? 'Save changes' : 'Add bill'} icon="checkmark" onPress={save} />
      {id ? <Button title="Delete bill" variant="danger" icon="trash-outline" onPress={remove} /> : null}
    </Screen>
  );
}
