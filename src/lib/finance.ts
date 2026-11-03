/** Pure financial calculations used by the Tools screens. All values in major units. */

// ---------- Loans ----------

export function loanPayment(principal: number, annualRatePct: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function simulateLoan(principal: number, annualRatePct: number, months: number, extraMonthly = 0) {
  const payment = loanPayment(principal, annualRatePct, months);
  const r = annualRatePct / 100 / 12;
  let balance = principal;
  let interest = 0;
  let count = 0;
  while (balance > 0.005 && count < 1200) {
    const i = balance * r;
    const pay = Math.min(balance + i, payment + extraMonthly);
    interest += i;
    balance = balance + i - pay;
    count++;
  }
  return { payment, totalInterest: interest, totalPaid: principal + interest, months: count };
}

// ---------- Savings growth ----------

export function savingsGrowth(initial: number, monthly: number, annualRatePct: number, years: number) {
  const r = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  let balance = initial;
  const yearly: { year: number; balance: number; contributed: number }[] = [];
  let contributed = initial;
  for (let m = 1; m <= Math.round(years * 12); m++) {
    balance = balance * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) yearly.push({ year: m / 12, balance, contributed });
  }
  return { balance, contributed, interest: balance - contributed, yearly };
}

// ---------- Income tax ----------

/**
 * A band of a progressive schedule: `rate`% applies to the slice of income above `from`
 * (up to the next band). With `rateTo`, the marginal rate rises linearly across the band,
 * as in Germany's formula-based tariff.
 */
export type TaxBracket = { from: number; rate: number; rateTo?: number };

export const EXAMPLE_BRACKETS: TaxBracket[] = [
  { from: 0, rate: 0 },
  { from: 10_000, rate: 10 },
  { from: 40_000, rate: 20 },
  { from: 100_000, rate: 40 },
];

/** Applies a band schedule to `amount`. Also used for contributions and expense deductions. */
export function applyBands(amount: number, brackets: TaxBracket[]) {
  const sorted = [...brackets].sort((a, b) => a.from - b.from);
  let total = 0;
  let marginal = 0;
  const breakdown = sorted.map((b, i) => {
    const to = sorted[i + 1]?.from ?? Infinity;
    const portion = Math.max(0, Math.min(amount, to) - b.from);
    let tax = (portion * b.rate) / 100;
    let endRate = b.rate;
    if (b.rateTo !== undefined && Number.isFinite(to) && to > b.from) {
      endRate = b.rate + ((b.rateTo - b.rate) * portion) / (to - b.from);
      tax = (portion * (b.rate + endRate)) / 200;
    }
    total += tax;
    if (amount > b.from) marginal = endRate;
    return { from: b.from, to, rate: b.rate, rateTo: b.rateTo, portion, tax };
  });
  return { total, marginal: marginal / 100, breakdown };
}

/** A payroll deduction such as social security, health insurance or a mandatory pension. */
export type Contribution = { name: string; brackets: TaxBracket[]; deductible: boolean };

/** A credit/rebate subtracted from income tax, optionally phased out above `taperFrom` taxable income. */
export type TaxCredit = { name: string; amount: number; taperFrom?: number; taperRate?: number };

export type TaxInput = {
  grossAnnual: number;
  preTaxDeductions: number;
  allowance: number;
  brackets: TaxBracket[];
  contributions: Contribution[];
  /** Deduction worked out from gross pay, e.g. a flat-rate professional expenses allowance. */
  expenseDeduction?: TaxBracket[];
  credits?: TaxCredit[];
  /** Surcharge as a % of income tax, e.g. a health cess or levy. */
  surchargePct?: number;
  /** Alternative schedule on income before allowances; the lower result applies (Hong Kong). */
  alternativeBrackets?: TaxBracket[];
};

export function calculateTax(input: TaxInput) {
  const gross = Math.max(0, input.grossAnnual);
  const contributions = input.contributions.map((c) => ({
    name: c.name,
    deductible: c.deductible,
    amount: applyBands(gross, c.brackets).total,
  }));
  const contributionsTotal = contributions.reduce((s, c) => s + c.amount, 0);
  const deductibleContributions = contributions.reduce((s, c) => s + (c.deductible ? c.amount : 0), 0);
  const expenses = input.expenseDeduction ? Math.min(gross, applyBands(gross, input.expenseDeduction).total) : 0;

  const netIncome = Math.max(0, gross - input.preTaxDeductions - expenses - deductibleContributions);
  const taxable = Math.max(0, netIncome - input.allowance);
  const bands = applyBands(taxable, input.brackets);

  const credits = (input.credits ?? []).map((c) => {
    const over = c.taperFrom === undefined ? 0 : Math.max(0, taxable - c.taperFrom);
    return { name: c.name, amount: Math.max(0, c.amount - (over * (c.taperRate ?? 0)) / 100) };
  });
  const creditsTotal = credits.reduce((s, c) => s + c.amount, 0);
  let baseTax = Math.max(0, bands.total - creditsTotal);

  let usedAlternative = false;
  if (input.alternativeBrackets?.length) {
    const alt = applyBands(netIncome, input.alternativeBrackets).total;
    if (alt < baseTax) {
      baseTax = alt;
      usedAlternative = true;
    }
  }

  const surchargeFactor = (input.surchargePct ?? 0) / 100;
  const surcharge = baseTax * surchargeFactor;
  const incomeTax = baseTax + surcharge;
  const totalTax = incomeTax + contributionsTotal;
  const netAnnual = gross - input.preTaxDeductions - totalTax;
  return {
    expenses,
    taxable,
    credits,
    creditsApplied: Math.min(creditsTotal, bands.total),
    surcharge,
    incomeTax,
    contributions,
    contributionsTotal,
    totalTax,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: gross > 0 ? totalTax / gross : 0,
    marginalRate: bands.marginal * (1 + surchargeFactor),
    usedAlternative,
    breakdown: bands.breakdown,
  };
}

// ---------- Pension / retirement ----------

export type PensionInput = {
  currentAge: number;
  retireAge: number;
  currentPot: number;
  salary: number;
  employeePct: number;
  employerPct: number;
  /** Annual salary above which mandatory contributions stop (0 = no cap). Held flat in nominal terms. */
  salaryCap: number;
  extraMonthly: number;
  returnPct: number;
  salaryGrowthPct: number;
  inflationPct: number;
  withdrawalPct: number;
  /** Desired retirement income per month, in today's money. 0 = not set. */
  targetMonthlyIncome: number;
};

export function projectPension(p: PensionInput) {
  const years = Math.max(0, Math.round(p.retireAge - p.currentAge));
  const months = years * 12;
  const r = Math.pow(1 + p.returnPct / 100, 1 / 12) - 1;

  let pot = p.currentPot;
  let salary = p.salary;
  let employeeTotal = 0;
  let employerTotal = 0;
  let extraTotal = 0;
  const yearly: { age: number; pot: number }[] = [];

  for (let m = 1; m <= months; m++) {
    const pensionable = p.salaryCap > 0 ? Math.min(salary, p.salaryCap) : salary;
    const employee = (pensionable / 12) * (p.employeePct / 100);
    const employer = (pensionable / 12) * (p.employerPct / 100);
    pot = pot * (1 + r) + employee + employer + p.extraMonthly;
    employeeTotal += employee;
    employerTotal += employer;
    extraTotal += p.extraMonthly;
    if (m % 12 === 0) {
      yearly.push({ age: p.currentAge + m / 12, pot });
      salary *= 1 + p.salaryGrowthPct / 100;
    }
  }

  const inflationFactor = Math.pow(1 + p.inflationPct / 100, years);
  const potReal = pot / inflationFactor;
  const withdrawal = p.withdrawalPct / 100;
  const annualIncomeReal = potReal * withdrawal;
  const contributions = p.currentPot + employeeTotal + employerTotal + extraTotal;

  let requiredPotReal = 0;
  let shortfallReal = 0;
  let extraMonthlyNeeded = 0;
  if (p.targetMonthlyIncome > 0 && withdrawal > 0) {
    requiredPotReal = (p.targetMonthlyIncome * 12) / withdrawal;
    shortfallReal = Math.max(0, requiredPotReal - potReal);
    const shortfallNominal = shortfallReal * inflationFactor;
    if (shortfallNominal > 0 && months > 0) {
      const growth = r === 0 ? months : (Math.pow(1 + r, months) - 1) / r;
      extraMonthlyNeeded = shortfallNominal / growth;
    }
  }

  return {
    years,
    pot,
    potReal,
    annualIncomeReal,
    monthlyIncomeReal: annualIncomeReal / 12,
    employeeTotal,
    employerTotal,
    extraTotal,
    contributions,
    growth: pot - contributions,
    yearly,
    requiredPotReal,
    shortfallReal,
    extraMonthlyNeeded,
  };
}
