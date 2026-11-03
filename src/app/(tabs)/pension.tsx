import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/charts';
import { CountryBanner, PresetNotes } from '@/components/CountryBanner';
import { AppText, Card, Divider, Field, Screen, StatLine } from '@/components/ui';
import { getCountry, type CountryPreset } from '@/lib/countries';
import { projectPension, type PensionInput } from '@/lib/finance';
import { ProLock } from '@/components/ProLock';
import { useConversion } from '@/lib/fx';
import { formatMajor, parseNumber } from '@/lib/money';
import { usePro } from '@/lib/pro';
import { useMoney, useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

type Inputs = Record<keyof PensionInput, string>;

function defaultsFor(preset?: CountryPreset): Inputs {
  const p = preset?.pension;
  return {
    currentAge: '30',
    retireAge: String(p?.retireAge ?? 65),
    currentPot: '0',
    salary: String(preset?.typicalSalary ?? 40_000),
    employeePct: String(p?.employeePct ?? 5),
    employerPct: String(p?.employerPct ?? 5),
    salaryCap: String(p?.salaryCap ?? 0),
    extraMonthly: '0',
    returnPct: String(p?.returnPct ?? 5),
    salaryGrowthPct: String(p?.salaryGrowthPct ?? 3),
    inflationPct: String(p?.inflationPct ?? 2.5),
    withdrawalPct: '4',
    targetMonthlyIncome: '0',
  };
}

export default function PensionCalculator() {
  const { calcCountry } = useSettings();
  const preset = getCountry(calcCountry);
  // Keyed on the country so switching resets every input to that country's preset.
  return <PensionForm key={calcCountry} preset={preset} />;
}

function PensionForm({ preset }: { preset?: CountryPreset }) {
  const t = useTheme();
  const { currency, major } = useMoney(preset?.currency);
  const { currency: homeCurrency } = useSettings();
  const { isPro } = usePro();
  // Skip fetching rates while the results are locked.
  const conversion = useConversion(currency, isPro ? homeCurrency : currency);
  const [inputs, setInputs] = useState<Inputs>(() => defaultsFor(preset));

  const num = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, parseNumber(v)])) as PensionInput;
  const r = projectPension({ ...num, retireAge: Math.min(num.retireAge, num.currentAge + 70) });

  const field = (key: keyof PensionInput, label: string, opts: { money?: boolean; hint?: string } = {}) => (
    <Field
      label={label}
      prefix={opts.money ? currency : undefined}
      hint={opts.hint}
      value={inputs[key]}
      onChangeText={(v) => setInputs((s) => ({ ...s, [key]: v }))}
      keyboardType="decimal-pad"
      style={{ flex: 1 }}
    />
  );

  const step = Math.max(1, Math.ceil(r.yearly.length / 10));
  const points = r.yearly.filter((_, i) => (i + 1) % step === 0 || i === r.yearly.length - 1);
  const onTrack = num.targetMonthlyIncome > 0 && r.shortfallReal <= 0;

  return (
    <Screen>
      <CountryBanner preset={preset} subtitle={preset ? `${preset.pension.scheme} · ${preset.currency}` : undefined} />

      <Card>
        <AppText variant="heading">About you</AppText>
        <View style={styles.pair}>
          {field('currentAge', 'Current age')}
          {field('retireAge', 'Retirement age')}
        </View>
        <View style={styles.pair}>
          {field('currentPot', 'Saved so far', { money: true })}
          {field('salary', 'Annual salary', { money: true, hint: `${major(num.salary / 12)} a month` })}
        </View>
      </Card>

      <Card>
        <AppText variant="heading">Contributions</AppText>
        <View style={styles.pair}>
          {field('employeePct', 'You (% of salary)')}
          {field('employerPct', 'Employer (%)')}
        </View>
        {field('salaryCap', 'Contribution salary cap (per year)', {
          money: true,
          hint: num.salaryCap > 0 ? 'Contributions stop above this salary. Set it to 0 for no cap.' : 'No cap. Contributions apply to your full salary.',
        })}
        {field('extraMonthly', 'Extra monthly top-up', { money: true, hint: 'Voluntary contributions on top of the mandatory ones.' })}
      </Card>

      <Card>
        <AppText variant="heading">Assumptions</AppText>
        <View style={styles.pair}>
          {field('returnPct', 'Investment return %')}
          {field('salaryGrowthPct', 'Salary growth %')}
        </View>
        <View style={styles.pair}>
          {field('inflationPct', 'Inflation %')}
          {field('withdrawalPct', 'Withdrawal rate %')}
        </View>
        {field('targetMonthlyIncome', 'Target monthly income (today’s money)', {
          money: true,
          hint: 'Optional. Set it to see whether you’re on track.',
        })}
      </Card>

      {isPro ? (
        <>
          <Card>
            <AppText variant="label">Pot at age {num.currentAge + r.years}</AppText>
            <AppText variant="display" color={t.primary} adjustsFontSizeToFit numberOfLines={1}>
              {major(r.pot)}
            </AppText>
            <AppText variant="caption">Worth {major(r.potReal)} in today’s money</AppText>
            {conversion.rate !== null && currency !== homeCurrency && (
              <AppText variant="caption" color={t.primary}>
                ≈ {formatMajor(r.potReal * conversion.rate, homeCurrency)} in {homeCurrency} today, at official central bank rates
              </AppText>
            )}
            <Divider />
            <StatLine label="Estimated retirement income" value={`${major(r.monthlyIncomeReal)}/month`} color={t.income} bold />
            <AppText variant="caption">In today’s money, withdrawing {inputs.withdrawalPct}% of the pot a year.</AppText>
            <Divider />
            <StatLine label="Starting pot" value={major(num.currentPot)} />
            <StatLine label="Your contributions" value={major(r.employeeTotal)} />
            <StatLine label="Employer contributions" value={major(r.employerTotal)} />
            {r.extraTotal > 0 && <StatLine label="Extra top-ups" value={major(r.extraTotal)} />}
            <StatLine label="Investment growth" value={major(r.growth)} color={t.income} />
          </Card>

          {num.targetMonthlyIncome > 0 && (
            <Card style={{ borderColor: onTrack ? t.income : t.warning, borderWidth: 1 }}>
              <AppText variant="heading" color={onTrack ? t.income : t.warning}>
                {onTrack ? 'You’re on track' : 'You may fall short'}
              </AppText>
              <StatLine label="Pot needed (today’s money)" value={major(r.requiredPotReal)} />
              {!onTrack && (
                <>
                  <StatLine label="Shortfall (today’s money)" value={major(r.shortfallReal)} color={t.expense} />
                  <StatLine label="Extra needed each month" value={major(r.extraMonthlyNeeded)} bold />
                </>
              )}
            </Card>
          )}

          {points.length > 1 && (
            <Card>
              <AppText variant="heading">Pot by age</AppText>
              <BarChart
                labels={points.map((p) => String(p.age))}
                series={[{ color: t.primary, values: points.map((p) => p.pot) }]}
                formatValue={(v) => major(v, true)}
              />
            </Card>
          )}

        </>
      ) : (
        <ProLock
          title="See your retirement projection"
          message={`BudT Pro projects your pension pot and retirement income${preset ? ` under ${preset.pension.scheme}` : ''}, and shows whether you’re on track.`}
        />
      )}

      <PresetNotes
        title={preset ? `${preset.name}: ${preset.pension.scheme}` : 'About this projection'}
        notes={[
          ...(preset?.pension.notes ?? []),
          'Projections are estimates based on your assumptions, not financial advice. Investment returns are not guaranteed.',
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12 },
});
