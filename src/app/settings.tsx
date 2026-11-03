import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { AppText, Card, Divider, ListRow, Screen } from '@/components/ui';
import { exportTransactionsCsv, resetAllData } from '@/db/queries';
import { getCountry } from '@/lib/countries';
import { CURRENCIES, formatMoney } from '@/lib/money';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

export default function SettingsScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { currency, currencyChosen, setCurrency, country } = useSettings();
  const homeCountry = getCountry(country);

  const exportCsv = async () => {
    const { csv, count } = await exportTransactionsCsv(db);
    if (!count) return Alert.alert('Nothing to export', 'Add some transactions first.');
    await Share.share({ title: 'Fintrack transactions', message: csv });
  };

  const reset = () =>
    Alert.alert('Erase all data?', 'Deletes every transaction, budget, goal and bill on this device. Categories and settings are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase everything', style: 'destructive', onPress: () => resetAllData(db) },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Settings' }} />

      <Card style={{ gap: 6 }}>
        <Pressable
          onPress={() => router.push({ pathname: '/country', params: { purpose: 'home' } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.countryRow, pressed && { opacity: 0.6 }]}>
          <Text style={styles.flag}>{homeCountry?.flag ?? '🌍'}</Text>
          <View style={{ flex: 1 }}>
            <AppText weight="700">{homeCountry?.name ?? 'Choose your country'}</AppText>
            <AppText variant="caption">Sets your currency and the tax & pension presets</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Pressable>
      </Card>

      <Card>
        <AppText variant="heading">Currency</AppText>
        <AppText variant="caption">
          Example: {formatMoney(123456, currency)}. Changing currency relabels amounts; it does not convert them.
        </AppText>
        <View style={styles.grid}>
          {CURRENCIES.map((code) => {
            const active = currencyChosen && code === currency;
            return (
              <Pressable
                key={code}
                onPress={() => setCurrency(code)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.currency, { borderColor: active ? t.primary : t.border, backgroundColor: active ? t.primarySoft : t.inputBg }]}>
                <Text style={{ color: active ? t.primary : t.text, fontWeight: '700' }}>{code}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 6 }}>
        <ListRow icon="pricetags" iconColor="#EC4899" title="Categories" subtitle="Add, edit or archive" onPress={() => router.push('/categories')} />
        <Divider />
        <ListRow icon="share-outline" iconColor="#3B82F6" title="Export transactions" subtitle="Share all transactions as CSV" onPress={exportCsv} />
        <Divider />
        <ListRow
          icon="trash-outline"
          iconColor={t.expense}
          title="Erase all data"
          subtitle="Start over with a clean slate"
          onPress={reset}
          chevron={false}
        />
      </Card>

      <View style={styles.about}>
        <Ionicons name="lock-closed-outline" size={16} color={t.muted} />
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Your data is stored only on this device. Fintrack {Constants.expoConfig?.version ?? ''}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  flag: { fontSize: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currency: { width: 64, minHeight: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  about: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
});
