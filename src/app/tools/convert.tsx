import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppText, Button, Card, Divider, Field, Screen } from '@/components/ui';
import { shortDate } from '@/lib/dates';
import { crossRate, describeSource, formatRate, FX_CURRENCIES, useFxRates } from '@/lib/fx';
import { CURRENCIES, formatMajor, parseNumber } from '@/lib/money';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

type Side = 'from' | 'to';

export default function CurrencyConverter() {
  const t = useTheme();
  const { currency } = useSettings();
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState(currency);
  const [to, setTo] = useState(currency === 'USD' ? 'EUR' : 'USD');
  const [picking, setPicking] = useState<Side | null>(null);

  const fx = useFxRates([from, to]);
  const rate = crossRate(fx.quotes, from, to);
  const value = parseNumber(amount);

  const pick = (code: string) => {
    if (picking === 'from') {
      if (code === to) setTo(from);
      setFrom(code);
    } else {
      if (code === from) setFrom(to);
      setTo(code);
    }
    setPicking(null);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Currency converter' }} />

      <Card>
        <Field label="Amount" prefix={from} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <View style={styles.pairRow}>
          <CurrencyButton label="From" code={from} active={picking === 'from'} onPress={() => setPicking(picking === 'from' ? null : 'from')} />
          <Pressable
            onPress={() => {
              setFrom(to);
              setTo(from);
            }}
            accessibilityLabel="Swap currencies"
            hitSlop={8}
            style={({ pressed }) => [styles.swap, { backgroundColor: t.primarySoft }, pressed && { opacity: 0.6 }]}>
            <Ionicons name="swap-horizontal" size={22} color={t.primary} />
          </Pressable>
          <CurrencyButton label="To" code={to} active={picking === 'to'} onPress={() => setPicking(picking === 'to' ? null : 'to')} />
        </View>
        {picking && (
          <View style={styles.grid}>
            {CURRENCIES.map((code) => {
              const active = code === (picking === 'from' ? from : to);
              return (
                <Pressable
                  key={code}
                  onPress={() => pick(code)}
                  accessibilityRole="button"
                  accessibilityLabel={FX_CURRENCIES[code]?.name ?? code}
                  accessibilityState={{ selected: active }}
                  style={[styles.code, { borderColor: active ? t.primary : t.border, backgroundColor: active ? t.primarySoft : t.inputBg }]}>
                  <Text style={{ fontSize: 16 }}>{FX_CURRENCIES[code]?.flag}</Text>
                  <Text style={{ color: active ? t.primary : t.text, fontWeight: '700' }}>{code}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        {rate === null ? (
          fx.loading ? (
            <View style={styles.status}>
              <ActivityIndicator color={t.primary} />
              <AppText variant="caption">Fetching official rates…</AppText>
            </View>
          ) : (
            <View style={styles.status}>
              <Ionicons name="cloud-offline-outline" size={28} color={t.muted} />
              <AppText style={{ textAlign: 'center' }}>Couldn’t load the official rate for {fx.failed.join(' and ')}.</AppText>
              <AppText variant="caption" style={{ textAlign: 'center' }}>
                Check your connection and try again. Rates are saved for offline use once loaded.
              </AppText>
              <Button title="Try again" icon="refresh" variant="secondary" onPress={fx.refresh} />
            </View>
          )
        ) : (
          <>
            <AppText variant="label">
              {formatMajor(value, from)} =
            </AppText>
            <AppText variant="display" color={t.primary} adjustsFontSizeToFit numberOfLines={1} selectable>
              {formatMajor(value * rate, to)}
            </AppText>
            <Divider />
            <AppText weight="600">
              1 {from} = {formatRate(rate)} {to}
            </AppText>
            <AppText variant="caption">
              1 {to} = {formatRate(1 / rate)} {from}
            </AppText>
            {fx.offline && (
              <AppText variant="caption" color={t.warning}>
                You’re offline, so the last saved official rates are shown.
              </AppText>
            )}
            <Button title={fx.loading ? 'Refreshing…' : 'Refresh rates'} icon="refresh" variant="ghost" onPress={fx.refresh} disabled={fx.loading} />
          </>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText variant="heading">Where these rates come from</AppText>
        {[from, to].map((code) => {
          const quote = fx.quotes[code];
          const { label, note } = describeSource(code);
          return (
            <View key={code} style={styles.source}>
              <Text style={{ fontSize: 22 }}>{FX_CURRENCIES[code]?.flag}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="600">
                  {code} · {FX_CURRENCIES[code]?.name}
                </AppText>
                <AppText variant="caption">{label}</AppText>
                {quote && code !== 'USD' && (
                  <AppText variant="caption">
                    1 USD = {formatRate(quote.perUsd)} {code} · published {shortDate(quote.date)}
                  </AppText>
                )}
                {note ? <AppText variant="caption">{note}</AppText> : null}
                {quote?.sourceUrl ? (
                  <Pressable onPress={() => Linking.openURL(quote.sourceUrl!)} hitSlop={6}>
                    <AppText variant="caption" color={t.primary}>
                      View the central bank’s page
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      <AppText variant="caption" style={{ textAlign: 'center', paddingHorizontal: 16 }}>
        Official central bank reference rates only. No parallel-market or bureau rates are used. Conversions between two non-USD currencies
        are calculated through each bank’s US dollar rate. Banks and bureaux may charge a different rate.
      </AppText>
    </Screen>
  );
}

function CurrencyButton({ label, code, active, onPress }: { label: string; code: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${FX_CURRENCIES[code]?.name ?? code}`}
      style={({ pressed }) => [
        styles.currencyButton,
        { borderColor: active ? t.primary : t.border, backgroundColor: t.inputBg },
        pressed && { opacity: 0.6 },
      ]}>
      <AppText variant="caption">{label}</AppText>
      <View style={styles.currencyValue}>
        <Text style={{ fontSize: 20 }}>{FX_CURRENCIES[code]?.flag}</Text>
        <AppText variant="heading">{code}</AppText>
        <Ionicons name={active ? 'chevron-up' : 'chevron-down'} size={16} color={t.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  currencyButton: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  currencyValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 76, minHeight: 40, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center' },
  status: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  source: { flexDirection: 'row', gap: 12 },
});
