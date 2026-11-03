import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { DonutChart, Legend } from '@/components/charts';
import { CountryBanner, PresetNotes } from '@/components/CountryBanner';
import { AppText, Button, Card, Divider, Field, Screen, Segmented, StatLine } from '@/components/ui';
import { getCountry, type CountryPreset } from '@/lib/countries';
import { calculateTax, EXAMPLE_BRACKETS, type Contribution, type TaxBracket } from '@/lib/finance';
import { useConversion } from '@/lib/fx';
import { formatMajor, formatPercent, parseNumber } from '@/lib/money';
import { useMoney, useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

type Period = 'month' | 'year';
type BracketInput = { key: number; from: string; rate: string; rateTo?: number };

const toInputs = (brackets: TaxBracket[]): BracketInput[] =>
  brackets.map((b, i) => ({ key: i, from: String(b.from), rate: String(b.rate), rateTo: b.rateTo }));

export default function TaxCalculator() {
  const { calcCountry } = useSettings();
  const preset = getCountry(calcCountry);
  // Keyed on the country so switching resets every input to that country's preset.
  return <TaxForm key={calcCountry} preset={preset} />;
}

function TaxForm({ preset }: { preset?: CountryPreset }) {
  const t = useTheme();
  const { currency, major } = useMoney(preset?.currency);
  const { currency: homeCurrency } = useSettings();
  const conversion = useConversion(currency, homeCurrency);
  const tax = preset?.tax;

  const [period, setPeriod] = useState<Period>('month');
  const [salary, setSalary] = useState(String(Math.round((preset?.typicalSalary ?? 60_000) / 12)));
  const [deductions, setDeductions] = useState('0');
  const [allowance, setAllowance] = useState(String(tax?.allowance ?? 0));
  const [social, setSocial] = useState('0');
  const [brackets, setBrackets] = useState(() => toInputs(tax?.brackets ?? EXAMPLE_BRACKETS));
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [showBands, setShowBands] = useState(!preset);

  const perYear = period === 'year' ? 1 : 12;
  const gross = parseNumber(salary) * perYear;
  const contributions: Contribution[] = preset
    ? tax!.contributions.filter((c) => !disabled.has(c.name))
    : [{ name: 'Social contributions', deductible: false, brackets: [{ from: 0, rate: parseNumber(social) }] }];

  const result = calculateTax({
    grossAnnual: gross,
    preTaxDeductions: parseNumber(deductions) * perYear,
    allowance: parseNumber(allowance),
    brackets: brackets.map((b) => ({ from: parseNumber(b.from), rate: parseNumber(b.rate), rateTo: b.rateTo })),
    contributions,
    expenseDeduction: tax?.expenseDeduction,
    credits: tax?.credits,
    surchargePct: tax?.surchargePct,
    alternativeBrackets: tax?.alternativeBrackets,
  });
  /** Converts an annual figure to the selected period for display. */
  const p = (annual: number) => major(annual / perYear);
  const periodLabel = period === 'month' ? 'month' : 'year';

  const updateBracket = (key: number, field: 'from' | 'rate', value: string) =>
    setBrackets((list) => list.map((b) => (b.key === key ? { ...b, [field]: value, ...(field === 'rate' && { rateTo: undefined }) } : b)));
  const addBracket = () => {
    const last = brackets[brackets.length - 1];
    const key = Math.max(-1, ...brackets.map((b) => b.key)) + 1;
    setBrackets([...brackets, { key, from: String(parseNumber(last?.from ?? '0') + 10_000), rate: last?.rate ?? '0' }]);
  };
  const toggleContribution = (name: string, on: boolean) =>
    setDisabled((s) => {
      const next = new Set(s);
      if (on) next.delete(name);
      else next.add(name);
      return next;
    });

  const pieData = [
    { value: Math.max(0, result.netAnnual), color: t.income, label: 'Take-home' },
    { value: result.incomeTax, color: t.expense, label: 'Income tax' },
    { value: result.contributionsTotal, color: t.warning, label: 'Contributions' },
    { value: parseNumber(deductions) * perYear, color: t.primary, label: 'Pre-tax deductions' },
  ].filter((d) => d.value > 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tax calculator' }} />
      <CountryBanner preset={preset} subtitle={preset ? `${tax!.year} · ${preset.currency}` : undefined} />

      <Card>
        <Segmented<Period>
          value={period}
          onChange={(next) => {
            // Keep the same salary when switching between monthly and annual entry.
            if (next !== period) {
              const factor = next === 'year' ? 12 : 1 / 12;
              setSalary(String(Math.round(parseNumber(salary) * factor)));
              setDeductions(String(Math.round(parseNumber(deductions) * factor)));
            }
            setPeriod(next);
          }}
          options={[
            { value: 'month', label: 'Monthly pay' },
            { value: 'year', label: 'Annual pay' },
          ]}
        />
        <Field
          label={`Gross salary per ${periodLabel}`}
          prefix={currency}
          value={salary}
          onChangeText={setSalary}
          keyboardType="decimal-pad"
          hint={period === 'month' ? `${major(gross)} a year` : `${major(gross / 12)} a month`}
        />
        <Field
          label={`Pre-tax deductions per ${periodLabel}`}
          prefix={currency}
          value={deductions}
          onChangeText={setDeductions}
          keyboardType="decimal-pad"
          hint="Reliefs paid before tax, such as voluntary pension, rent relief or retirement annuity."
        />
        {!preset && (
          <Field
            label="Social security (% of gross)"
            value={social}
            onChangeText={setSocial}
            keyboardType="decimal-pad"
          />
        )}
      </Card>

      {preset && tax!.contributions.length > 0 && (
        <Card style={{ gap: 10 }}>
          <AppText variant="heading">Payroll contributions</AppText>
          {tax!.contributions.map((c) => (
            <View key={c.name} style={styles.contribution}>
              <View style={{ flex: 1 }}>
                <AppText weight="600">{c.name}</AppText>
                <AppText variant="caption">
                  {describeBands(c.brackets, (v) => major(v, true))}
                  {c.deductible ? ' · reduces taxable income' : ''}
                </AppText>
              </View>
              <Switch
                value={!disabled.has(c.name)}
                onValueChange={(on) => toggleContribution(c.name, on)}
                trackColor={{ true: t.primary }}
                accessibilityLabel={`Include ${c.name}`}
              />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Pressable onPress={() => setShowBands((s) => !s)} style={styles.bandsHeader} accessibilityRole="button">
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Tax bands & allowance</AppText>
            <AppText variant="caption">
              {brackets.length} bands{preset ? ` · ${tax!.year}` : ''} · tap to {showBands ? 'hide' : 'review or edit'}
            </AppText>
          </View>
          <Ionicons name={showBands ? 'chevron-up' : 'chevron-down'} size={20} color={t.muted} />
        </Pressable>
        {showBands && (
          <>
            <Field
              label={`${tax?.allowanceLabel ?? 'Tax-free allowance'} (per year)`}
              prefix={currency}
              value={allowance}
              onChangeText={setAllowance}
              keyboardType="decimal-pad"
            />
            <AppText variant="caption">
              Annual thresholds. Each rate applies to taxable income above its threshold.
              {preset ? '' : ' These example bands are placeholders, so replace them with your local rates.'}
            </AppText>
            {brackets.map((b, i) => (
              <View key={b.key} style={{ gap: 2 }}>
                <View style={styles.bracket}>
                  <Field
                    label={i === 0 ? 'From' : ''}
                    prefix={currency}
                    value={b.from}
                    onChangeText={(v) => updateBracket(b.key, 'from', v)}
                    keyboardType="decimal-pad"
                    style={{ flex: 2 }}
                  />
                  <Field
                    label={i === 0 ? 'Rate %' : ''}
                    value={b.rate}
                    onChangeText={(v) => updateBracket(b.key, 'rate', v)}
                    keyboardType="decimal-pad"
                    style={{ flex: 1 }}
                  />
                  <Pressable
                    onPress={() => setBrackets((list) => list.filter((x) => x.key !== b.key))}
                    disabled={brackets.length === 1}
                    accessibilityLabel="Remove band"
                    hitSlop={8}
                    style={[styles.remove, brackets.length === 1 && { opacity: 0.3 }]}>
                    <Ionicons name="close-circle" size={24} color={t.muted} />
                  </Pressable>
                </View>
                {b.rateTo !== undefined && <AppText variant="caption">Rate rises gradually to {b.rateTo}% across this band.</AppText>}
              </View>
            ))}
            <Button title="Add band" icon="add" variant="ghost" onPress={addBracket} />
          </>
        )}
      </Card>

      <Card>
        <AppText variant="label">Take-home pay</AppText>
        <AppText variant="display" color={t.income} adjustsFontSizeToFit numberOfLines={1}>
          {major(result.netMonthly)}
          <AppText variant="heading" color={t.muted}>
            {' '}
            /month
          </AppText>
        </AppText>
        <AppText variant="caption">{major(result.netAnnual)} a year</AppText>
        {conversion.rate !== null && currency !== homeCurrency && (
          <AppText variant="caption" color={t.primary}>
            ≈ {formatMajor(result.netMonthly * conversion.rate, homeCurrency)} a month in {homeCurrency} at official central bank rates
          </AppText>
        )}
        {pieData.length > 1 && (
          <>
            <DonutChart data={pieData} size={160} thickness={20}>
              <AppText variant="caption">You keep</AppText>
              <AppText variant="heading">{formatPercent(gross ? result.netAnnual / gross : 0, 0)}</AppText>
            </DonutChart>
            <Legend items={pieData} />
          </>
        )}
        <Divider />
        <AppText variant="label">Per {periodLabel}</AppText>
        <StatLine label="Gross pay" value={p(gross)} />
        {result.expenses > 0 && <StatLine label={tax?.expenseLabel ?? 'Expense deduction'} value={`−${p(result.expenses)}`} />}
        <StatLine label="Taxable income" value={p(result.taxable)} />
        {result.creditsApplied > 0 && (
          <StatLine label={summariseCredits(result.credits.map((c) => c.name))} value={`−${p(result.creditsApplied)}`} color={t.income} />
        )}
        {result.surcharge > 0 && <StatLine label={tax?.surchargeLabel ?? 'Surcharge'} value={p(result.surcharge)} color={t.expense} />}
        <StatLine label="Income tax" value={p(result.incomeTax)} color={t.expense} />
        {result.contributions.map((c) => (
          <StatLine key={c.name} label={c.name} value={p(c.amount)} color={t.expense} />
        ))}
        <StatLine label="Total deductions" value={p(result.totalTax)} bold />
        <Divider />
        <StatLine label="Effective rate (tax + contributions)" value={formatPercent(result.effectiveRate)} />
        <StatLine label="Marginal income tax rate" value={formatPercent(result.marginalRate, 1)} />
        {result.usedAlternative && <AppText variant="caption">The standard-rate method gives a lower bill, so it is used.</AppText>}
      </Card>

      <Card>
        <AppText variant="heading">Income tax by band (per year)</AppText>
        {result.breakdown.map((b, i) => (
          <StatLine
            key={i}
            label={`${major(b.from, true)}${Number.isFinite(b.to) ? `–${major(b.to, true)}` : '+'} @ ${b.rate}%${b.rateTo !== undefined ? `→${b.rateTo}%` : ''}`}
            value={major(b.tax)}
          />
        ))}
      </Card>

      <PresetNotes
        title="About these rules"
        notes={[
          ...(tax?.notes ?? []),
          'Estimates for a single employee with no dependants. Tax rules change with each budget, so confirm with your tax authority or payslip.',
        ]}
      />
    </Screen>
  );
}

/** Short description of a contribution schedule, e.g. "6% up to KSh 1.3M" or "0.5% → 2% → 3% → 8%". */
function describeBands(brackets: TaxBracket[], fmt: (v: number) => string) {
  const [first, second] = brackets;
  if (brackets.length === 1) return `${first.rate}% of pay`;
  if (brackets.length === 2 && second.rate === 0) return `${first.rate}% of pay up to ${fmt(second.from)} a year`;
  if (brackets.length === 2 && first.rate === 0) return `${second.rate}% of pay above ${fmt(second.from)}`;
  return brackets.map((b) => `${b.rate}%`).join(' → ') + ' by band';
}

function summariseCredits(names: string[]) {
  return [...new Set(names)].join(' + ');
}

const styles = StyleSheet.create({
  contribution: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bandsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bracket: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  remove: { height: 48, justifyContent: 'center' },
});
