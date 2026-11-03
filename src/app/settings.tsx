import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { AppText, Card, Divider, ListRow, Screen, Segmented } from '@/components/ui';
import { exportTransactionsCsv, resetAllData } from '@/db/queries';
import { BackupError, pickBackup, restoreBackup, shareBackup } from '@/lib/backup';
import { getCountry } from '@/lib/countries';
import { shortDate } from '@/lib/dates';
import { PRIVACY_POLICY_URL } from '@/lib/links';
import { usePro } from '@/lib/pro';
import { CURRENCIES, formatMoney } from '@/lib/money';
import { useSettings } from '@/lib/settings';
import { useTheme, type ThemePreference } from '@/lib/theme';

const showError = (title: string, e: unknown) =>
  Alert.alert(title, e instanceof BackupError ? e.message : 'Something went wrong. Please try again.');

export default function SettingsScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { currency, currencyChosen, setCurrency, country, theme, setTheme, reload } = useSettings();
  const homeCountry = getCountry(country);
  const pro = usePro();

  const restorePro = async () => {
    try {
      const restored = await pro.restore();
      Alert.alert(restored ? 'Purchases restored' : 'Nothing to restore', restored ? 'BudT Pro is active.' : 'No BudT Pro purchase was found for this store account.');
    } catch {
      Alert.alert('Restore failed', 'Couldn’t reach the store. Check your connection and try again.');
    }
  };

  const backup = async () => {
    try {
      await shareBackup(db);
    } catch (e) {
      showError('Backup failed', e);
    }
  };

  const restore = async () => {
    try {
      const file = await pickBackup();
      if (!file) return;
      const count = file.tables.transactions.length;
      Alert.alert(
        'Restore this backup?',
        `Backup from ${shortDate(file.exportedAt.slice(0, 10))} with ${count} transaction${count === 1 ? '' : 's'}. It replaces ALL data currently in BudT.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace my data',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(db, file);
                await reload();
                Alert.alert('Backup restored', 'Your data has been restored.');
              } catch (e) {
                showError('Restore failed', e);
              }
            },
          },
        ],
      );
    } catch (e) {
      showError('Couldn’t open backup', e);
    }
  };

  const exportCsv = async () => {
    const { csv, count } = await exportTransactionsCsv(db);
    if (!count) return Alert.alert('Nothing to export', 'Add some transactions first.');
    await Share.share({ title: 'BudT transactions', message: csv });
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
        <ListRow
          icon="sparkles"
          iconColor={t.accent}
          title={pro.isPro ? 'BudT Pro is active' : 'Upgrade to BudT Pro'}
          subtitle={pro.isPro ? 'Thanks for supporting BudT' : 'Goals, bills, tax & pension, and every financial tool'}
          onPress={() => router.push('/paywall')}
        />
        {pro.isPro && pro.managementUrl ? (
          <>
            <Divider />
            <ListRow icon="card-outline" iconColor={t.primary} title="Manage subscription" onPress={() => Linking.openURL(pro.managementUrl!)} />
          </>
        ) : null}
        {!pro.isPro && pro.available ? (
          <>
            <Divider />
            <ListRow icon="refresh" iconColor={t.primary} title="Restore purchases" onPress={restorePro} chevron={false} />
          </>
        ) : null}
        {__DEV__ && (
          <>
            <Divider />
            <View style={styles.devRow}>
              <AppText variant="caption" style={{ flex: 1 }}>
                Developer: simulate Pro (development builds only)
              </AppText>
              <Switch value={pro.devOverride} onValueChange={pro.setDevOverride} trackColor={{ true: t.primary }} />
            </View>
          </>
        )}
      </Card>

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
        <AppText variant="heading">Appearance</AppText>
        <Segmented<ThemePreference>
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
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
      </Card>

      <Card style={{ gap: 6 }}>
        <AppText variant="label">YOUR DATA</AppText>
        <ListRow
          icon="cloud-upload-outline"
          iconColor={t.primary}
          title="Back up data"
          subtitle="Save a backup file to Files, Drive or email"
          onPress={backup}
        />
        <Divider />
        <ListRow
          icon="cloud-download-outline"
          iconColor={t.primary}
          title="Restore from backup"
          subtitle="Replace this device’s data with a backup file"
          onPress={restore}
        />
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

      <Card style={{ gap: 6 }}>
        <ListRow
          icon="shield-checkmark-outline"
          iconColor={t.primary}
          title="Privacy policy"
          subtitle="How BudT handles your data"
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        />
      </Card>

      <View style={styles.about}>
        <Ionicons name="lock-closed-outline" size={16} color={t.muted} />
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          Your data is stored only on this device. Uninstalling BudT deletes it, so back up regularly.
        </AppText>
        <AppText variant="caption">BudT {Constants.expoConfig?.version ?? ''}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  flag: { fontSize: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currency: { width: 64, minHeight: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  about: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
});
