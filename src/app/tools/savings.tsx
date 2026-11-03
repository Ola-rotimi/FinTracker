import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart, Legend } from '@/components/charts';
import { ProLock } from '@/components/ProLock';
import { AppText, Card, Divider, Field, Screen, StatLine } from '@/components/ui';
import { savingsGrowth } from '@/lib/finance';
import { parseNumber } from '@/lib/money';
import { usePro } from '@/lib/pro';
import { useMoney } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

export default function SavingsCalculator() {
  const t = useTheme();
  const { currency, major } = useMoney();
  const { isPro } = usePro();
  const [initial, setInitial] = useState('1000');
  const [monthly, setMonthly] = useState('200');
  const [rate, setRate] = useState('5');
  const [years, setYears] = useState('10');

  const result = savingsGrowth(parseNumber(initial), parseNumber(monthly), parseNumber(rate), Math.min(60, parseNumber(years)));
  // Keep the chart readable: at most ~10 bars.
  const step = Math.max(1, Math.ceil(result.yearly.length / 10));
  const points = result.yearly.filter((_, i) => (i + 1) % step === 0 || i === result.yearly.length - 1);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Savings growth' }} />
      <Card>
        <View style={styles.pair}>
          <Field label="Starting amount" prefix={currency} value={initial} onChangeText={setInitial} keyboardType="decimal-pad" style={{ flex: 1 }} />
          <Field label="Monthly deposit" prefix={currency} value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" style={{ flex: 1 }} />
        </View>
        <View style={styles.pair}>
          <Field label="Return (% a year)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" style={{ flex: 1 }} />
          <Field label="Years" value={years} onChangeText={setYears} keyboardType="number-pad" style={{ flex: 1 }} />
        </View>
      </Card>

      {isPro ? (
        <>
          <Card>
            <AppText variant="label">Balance after {Math.round(parseNumber(years))} years</AppText>
            <AppText variant="display" color={t.income} adjustsFontSizeToFit numberOfLines={1}>
              {major(result.balance)}
            </AppText>
            <Divider />
            <StatLine label="You put in" value={major(result.contributed)} />
            <StatLine label="Interest earned" value={major(result.interest)} color={t.income} />
          </Card>

          {points.length > 1 && (
            <Card>
              <AppText variant="heading">Growth over time</AppText>
              <BarChart
                labels={points.map((p) => `Y${p.year}`)}
                series={[
                  { color: t.primary, values: points.map((p) => p.contributed) },
                  { color: t.income, values: points.map((p) => p.balance) },
                ]}
                formatValue={(v) => major(v, true)}
              />
              <Legend
                items={[
                  { color: t.primary, label: 'Contributed' },
                  { color: t.income, label: 'Balance' },
                ]}
              />
            </Card>
          )}
        </>
      ) : (
        <ProLock title="See your savings grow" message="BudT Pro projects your balance, contributions and interest earned year by year." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12 },
});
