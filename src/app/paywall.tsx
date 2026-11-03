import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Screen } from '@/components/ui';
import type { IconName } from '@/db/types';
import { COUNTRIES } from '@/lib/countries';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/links';
import { loadPlans, usePro, type PlanOption } from '@/lib/pro';
import { useTheme } from '@/lib/theme';

const AFRICAN_COUNT = COUNTRIES.filter((c) => c.region === 'africa').length;

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'calculator',
    title: 'Tax calculator',
    text: `Take-home pay with real PAYE bands, reliefs and payroll deductions for ${COUNTRIES.length} countries, ${AFRICAN_COUNT} of them in Africa.`,
  },
  { icon: 'umbrella', title: 'Pension planner', text: 'Your country’s pension scheme, contribution rates and retirement age, projected to retirement.' },
  { icon: 'flag', title: 'Savings goals', text: 'Set targets and dates, and see how much to save each month.' },
  { icon: 'calendar', title: 'Bills & subscriptions', text: 'Due-date reminders on Home and one-tap payment records.' },
  { icon: 'swap-horizontal', title: 'Currency converter', text: 'Official central bank exchange rates, with no parallel-market rates.' },
  { icon: 'trending-up', title: 'Loan & savings calculators', text: 'Repayments, overpayment savings and compound growth.' },
];

type Status = 'loading' | 'ready' | 'error';

export default function PaywallScreen() {
  const t = useTheme();
  const { isPro, available, purchase, restore, managementUrl } = usePro();
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [status, setStatus] = useState<Status>(available ? 'loading' : 'ready');
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) return;
    loadPlans().then(
      (p) => {
        setPlans(p);
        setStatus('ready');
      },
      () => setStatus('error'),
    );
  }, [available]);

  const plan = plans[selected];

  const buy = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      if ((await purchase(plan.pkg)) === 'purchased') {
        Alert.alert('Welcome to BudT Pro', 'Thanks for supporting BudT! Everything is unlocked.');
        router.back();
      }
    } catch {
      Alert.alert('Purchase failed', 'The store couldn’t complete the purchase. You haven’t been charged. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restorePurchases = async () => {
    setBusy(true);
    try {
      const restored = await restore();
      Alert.alert(restored ? 'Purchases restored' : 'Nothing to restore', restored ? 'BudT Pro is active again.' : 'No BudT Pro purchase was found for this store account.');
      if (restored) router.back();
    } catch {
      Alert.alert('Restore failed', 'Couldn’t reach the store. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const store = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

  return (
    <Screen>
      <Stack.Screen options={{ title: 'BudT Pro' }} />
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
        <AppText variant="title">{isPro ? 'You have BudT Pro' : 'Unlock BudT Pro'}</AppText>
        <AppText style={{ textAlign: 'center', color: t.muted }}>
          Plan with goals and bills, know your real take-home pay and use every financial tool.
        </AppText>
      </View>

      <Card style={{ gap: 14 }}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: t.primarySoft }]}>
              <Ionicons name={f.icon} size={20} color={t.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="700">{f.title}</AppText>
              <AppText variant="caption">{f.text}</AppText>
            </View>
          </View>
        ))}
      </Card>

      {isPro ? (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={36} color={t.income} />
          <AppText weight="700">Pro is active on this device.</AppText>
          {managementUrl ? <Button title="Manage subscription" variant="secondary" onPress={() => Linking.openURL(managementUrl)} /> : null}
        </Card>
      ) : !available ? (
        <Card>
          <AppText weight="700">Purchases aren’t set up yet</AppText>
          <AppText variant="caption">
            Add your RevenueCat API keys to .env (see .env.example) and use a development or store build to buy Pro.
          </AppText>
        </Card>
      ) : status === 'loading' ? (
        <ActivityIndicator color={t.primary} style={{ marginVertical: 24 }} />
      ) : !plans.length ? (
        <Card>
          <AppText weight="700">Plans aren’t available right now</AppText>
          <AppText variant="caption">Couldn’t load prices from the {store}. Check your connection and try again later.</AppText>
        </Card>
      ) : (
        <>
          <View style={{ gap: 10 }} accessibilityRole="radiogroup">
            {plans.map((p, i) => {
              const active = i === selected;
              return (
                <Pressable
                  key={p.pkg.identifier}
                  onPress={() => setSelected(i)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.plan, { borderColor: active ? t.primary : t.border, backgroundColor: active ? t.primarySoft : t.card }]}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? t.primary : t.muted} />
                  <View style={{ flex: 1 }}>
                    <AppText weight="700">{p.title}</AppText>
                    <AppText variant="caption">{p.price}</AppText>
                  </View>
                  {p.note ? (
                    <View style={[styles.note, { backgroundColor: t.accent }]}>
                      <AppText variant="caption" weight="800" color="#FFFFFF">
                        {p.note}
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Button title={busy ? 'Please wait…' : plan?.kind === 'lifetime' ? 'Buy lifetime access' : 'Continue'} icon="sparkles" onPress={buy} disabled={busy} />
        </>
      )}

      {!isPro && available && (
        <Pressable onPress={restorePurchases} disabled={busy} style={{ alignSelf: 'center' }} hitSlop={8}>
          <AppText weight="600" color={t.primary}>
            Restore purchases
          </AppText>
        </Pressable>
      )}

      <AppText variant="caption" style={{ textAlign: 'center' }}>
        Monthly and yearly plans renew automatically until cancelled. Cancel at least 24 hours before the end of the current period
        to avoid being charged for the next one. Manage or cancel any time in your {store} account settings. Lifetime is a one-time
        purchase.
      </AppText>
      <View style={styles.legal}>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={6}>
          <AppText variant="caption" color={t.primary}>
            Terms of Use
          </AppText>
        </Pressable>
        <AppText variant="caption">·</AppText>
        <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={6}>
          <AppText variant="caption" color={t.primary}>
            Privacy Policy
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  icon: { width: 84, height: 84, borderRadius: 20 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  note: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
