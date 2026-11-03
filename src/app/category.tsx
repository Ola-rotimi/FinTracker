import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { ColorPicker, IconPicker } from '@/components/pickers';
import { AppText, Button, Field, IconBadge, Screen, Segmented } from '@/components/ui';
import { archiveCategory, getCategory, saveCategory } from '@/db/queries';
import type { IconName, TxType } from '@/db/types';

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const db = useSQLiteContext();

  const [name, setName] = useState('');
  const [type, setType] = useState<TxType>(params.type === 'income' ? 'income' : 'expense');
  const [icon, setIcon] = useState<IconName>('pricetag');
  const [color, setColor] = useState('#6366F1');

  useEffect(() => {
    if (!id) return;
    getCategory(db, id).then((c) => {
      if (!c) return;
      setName(c.name);
      setType(c.type);
      setIcon(c.icon);
      setColor(c.color);
    });
  }, [db, id]);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Give the category a name');
    await saveCategory(db, { id, name: name.trim(), type, icon, color });
    router.back();
  };

  const archive = () =>
    Alert.alert('Archive category?', 'It will be hidden from pickers and its budget removed. Past transactions keep this category.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveCategory(db, id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit category' : 'New category' }} />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <IconBadge icon={icon} color={color} size={64} />
        <AppText variant="heading">{name || 'Category name'}</AppText>
      </View>
      {!id && (
        <Segmented<TxType>
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
      )}
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Coffee" autoFocus={!id} />
      <ColorPicker value={color} onChange={setColor} />
      <IconPicker value={icon} color={color} onChange={setIcon} />
      <Button title={id ? 'Save changes' : 'Create category'} icon="checkmark" onPress={save} />
      {id ? <Button title="Archive category" variant="danger" icon="archive-outline" onPress={archive} /> : null}
    </Screen>
  );
}
