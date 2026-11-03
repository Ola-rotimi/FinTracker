import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { DateField } from '@/components/DateField';
import { CategoryPicker } from '@/components/pickers';
import { AppText, Button, Field, HeaderDeleteButton, Screen, Segmented } from '@/components/ui';
import { deleteTransaction, getTransaction, saveTransaction } from '@/db/queries';
import type { TxType } from '@/db/types';
import { todayISO } from '@/lib/dates';
import { centsToInput, groupDigits, parseAmount } from '@/lib/money';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

export default function TransactionScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const db = useSQLiteContext();
  const t = useTheme();
  const { currency } = useSettings();

  const [type, setType] = useState<TxType>(params.type === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) return;
    getTransaction(db, id).then((tx) => {
      if (!tx) return;
      setType(tx.type);
      setAmount(centsToInput(tx.amount));
      setCategoryId(tx.category_id);
      setDate(tx.date);
      setNote(tx.note);
    });
  }, [db, id]);

  const changeType = (next: TxType) => {
    if (next !== type) setCategoryId(null);
    setType(next);
  };

  const save = async () => {
    const cents = parseAmount(amount);
    if (!cents) return Alert.alert('Enter an amount', 'The amount must be greater than zero.');
    if (!categoryId) return Alert.alert('Pick a category');
    await saveTransaction(db, { id, type, amount: cents, category_id: categoryId, date, note: note.trim() });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(db, id!);
          router.back();
        },
      },
    ]);

  const accent = type === 'income' ? t.income : t.expense;

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit transaction' : 'New transaction', headerRight: id ? () => <HeaderDeleteButton label="Delete transaction" onPress={remove} /> : undefined }} />
      <Segmented<TxType>
        value={type}
        onChange={changeType}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />

      <View style={[styles.amountBox, { backgroundColor: t.card, borderColor: t.border }]}>
        <AppText variant="label">Amount ({currency})</AppText>
        <TextInput
          value={groupDigits(amount)}
          onChangeText={(text) => setAmount(groupDigits(text, groupDigits(amount)))}
          placeholder="0.00"
          placeholderTextColor={t.muted}
          keyboardType="decimal-pad"
          autoFocus={!id}
          style={[styles.amountInput, { color: accent }]}
          accessibilityLabel="Amount"
        />
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label">Category</AppText>
        <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />
      </View>

      <DateField label="Date" value={date} onChange={setDate} />
      <Field label="Note" value={note} onChangeText={setNote} placeholder="What was it for? (optional)" returnKeyType="done" />

      <Button title={id ? 'Save changes' : `Add ${type}`} icon="checkmark" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountBox: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, alignItems: 'center', gap: 4 },
  amountInput: { fontSize: 40, fontWeight: '800', textAlign: 'center', minWidth: 160, fontVariant: ['tabular-nums'] },
});
