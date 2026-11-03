/**
 * Official exchange rates. Each currency's rate comes from its own central bank (or its official
 * fixed peg), never from parallel/black markets or blended commercial feeds. Central bank data is
 * fetched through Frankfurter (frankfurter.dev), an open-source API that republishes each bank's
 * published rates unchanged when queried with a single `providers` filter.
 *
 * Every rate is stored as units of the currency per 1 US dollar; cross rates go through USD.
 */
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { todayISO } from './dates';

const API = 'https://api.frankfurter.dev/v2';
/** Re-fetch a cached rate after this long. Central banks publish at most once a day. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

type Source =
  | { type: 'pivot' }
  | { type: 'bank'; provider: string; bank: string; note?: string }
  | { type: 'peg'; anchor: string; perAnchor: number; authority: string };

export const FX_CURRENCIES: Record<string, { name: string; flag: string; source: Source }> = {
  // Africa
  NGN: { name: 'Nigerian naira', flag: '🇳🇬', source: { type: 'bank', provider: 'cbn', bank: 'Central Bank of Nigeria' } },
  GHS: {
    name: 'Ghanaian cedi',
    flag: '🇬🇭',
    source: {
      type: 'bank',
      provider: 'bdi',
      bank: 'Banca d’Italia',
      note: 'The Bank of Ghana doesn’t publish a machine-readable feed, so this uses the official reference rate published by Italy’s central bank.',
    },
  },
  KES: { name: 'Kenyan shilling', flag: '🇰🇪', source: { type: 'bank', provider: 'cbk', bank: 'Central Bank of Kenya' } },
  ZAR: { name: 'South African rand', flag: '🇿🇦', source: { type: 'bank', provider: 'sarb', bank: 'South African Reserve Bank' } },
  EGP: { name: 'Egyptian pound', flag: '🇪🇬', source: { type: 'bank', provider: 'cbe', bank: 'Central Bank of Egypt' } },
  UGX: {
    name: 'Ugandan shilling',
    flag: '🇺🇬',
    source: {
      type: 'bank',
      provider: 'cbk',
      bank: 'Central Bank of Kenya',
      note: 'The Bank of Uganda doesn’t publish a machine-readable feed, so this uses the official rate published by the Central Bank of Kenya.',
    },
  },
  TZS: { name: 'Tanzanian shilling', flag: '🇹🇿', source: { type: 'bank', provider: 'bota', bank: 'Bank of Tanzania' } },
  RWF: { name: 'Rwandan franc', flag: '🇷🇼', source: { type: 'bank', provider: 'bnrrw', bank: 'National Bank of Rwanda' } },
  ETB: { name: 'Ethiopian birr', flag: '🇪🇹', source: { type: 'bank', provider: 'nbe', bank: 'National Bank of Ethiopia' } },
  MAD: { name: 'Moroccan dirham', flag: '🇲🇦', source: { type: 'bank', provider: 'bam', bank: 'Bank Al-Maghrib' } },
  ZMW: { name: 'Zambian kwacha', flag: '🇿🇲', source: { type: 'bank', provider: 'boz', bank: 'Bank of Zambia' } },
  BWP: { name: 'Botswana pula', flag: '🇧🇼', source: { type: 'bank', provider: 'bob', bank: 'Bank of Botswana' } },
  NAD: { name: 'Namibian dollar', flag: '🇳🇦', source: { type: 'peg', anchor: 'ZAR', perAnchor: 1, authority: 'Bank of Namibia: fixed 1:1 with the rand' } },
  MUR: { name: 'Mauritian rupee', flag: '🇲🇺', source: { type: 'bank', provider: 'bomu', bank: 'Bank of Mauritius' } },
  MWK: { name: 'Malawian kwacha', flag: '🇲🇼', source: { type: 'bank', provider: 'rbm', bank: 'Reserve Bank of Malawi' } },
  XOF: { name: 'West African CFA franc', flag: '🌍', source: { type: 'bank', provider: 'bceao', bank: 'BCEAO' } },
  XAF: {
    name: 'Central African CFA franc',
    flag: '🌍',
    source: { type: 'peg', anchor: 'EUR', perAnchor: 655.957, authority: 'BEAC: fixed parity of 655.957 per euro' },
  },
  // Rest of the world
  USD: { name: 'US dollar', flag: '🇺🇸', source: { type: 'pivot' } },
  EUR: { name: 'Euro', flag: '🇪🇺', source: { type: 'bank', provider: 'ecb', bank: 'European Central Bank' } },
  GBP: { name: 'British pound', flag: '🇬🇧', source: { type: 'bank', provider: 'boe', bank: 'Bank of England' } },
  CAD: { name: 'Canadian dollar', flag: '🇨🇦', source: { type: 'bank', provider: 'boc', bank: 'Bank of Canada' } },
  AUD: { name: 'Australian dollar', flag: '🇦🇺', source: { type: 'bank', provider: 'rba', bank: 'Reserve Bank of Australia' } },
  NZD: {
    name: 'New Zealand dollar',
    flag: '🇳🇿',
    source: { type: 'bank', provider: 'ecb', bank: 'European Central Bank', note: 'Reserve Bank of New Zealand rates aren’t available, so the ECB reference rate is used.' },
  },
  INR: { name: 'Indian rupee', flag: '🇮🇳', source: { type: 'bank', provider: 'fbil', bank: 'FBIL (RBI reference rate)' } },
  JPY: { name: 'Japanese yen', flag: '🇯🇵', source: { type: 'bank', provider: 'boj', bank: 'Bank of Japan' } },
  CNY: { name: 'Chinese yuan', flag: '🇨🇳', source: { type: 'bank', provider: 'cfets', bank: 'CFETS central parity (People’s Bank of China)' } },
  CHF: {
    name: 'Swiss franc',
    flag: '🇨🇭',
    source: { type: 'bank', provider: 'ecb', bank: 'European Central Bank', note: 'Swiss National Bank rates aren’t available, so the ECB reference rate is used.' },
  },
  SEK: { name: 'Swedish krona', flag: '🇸🇪', source: { type: 'bank', provider: 'rb', bank: 'Sveriges Riksbank' } },
  NOK: { name: 'Norwegian krone', flag: '🇳🇴', source: { type: 'bank', provider: 'nb', bank: 'Norges Bank' } },
  DKK: { name: 'Danish krone', flag: '🇩🇰', source: { type: 'bank', provider: 'dnb', bank: 'Danmarks Nationalbank' } },
  BRL: { name: 'Brazilian real', flag: '🇧🇷', source: { type: 'bank', provider: 'bcb', bank: 'Banco Central do Brasil' } },
  MXN: { name: 'Mexican peso', flag: '🇲🇽', source: { type: 'bank', provider: 'banxico', bank: 'Banco de México' } },
  AED: { name: 'UAE dirham', flag: '🇦🇪', source: { type: 'peg', anchor: 'USD', perAnchor: 3.6725, authority: 'Central Bank of the UAE: fixed peg to the US dollar' } },
  SAR: { name: 'Saudi riyal', flag: '🇸🇦', source: { type: 'peg', anchor: 'USD', perAnchor: 3.75, authority: 'Saudi Central Bank: fixed peg to the US dollar' } },
  SGD: { name: 'Singapore dollar', flag: '🇸🇬', source: { type: 'bank', provider: 'mas', bank: 'Monetary Authority of Singapore' } },
  HKD: {
    name: 'Hong Kong dollar',
    flag: '🇭🇰',
    source: {
      type: 'bank',
      provider: 'ecb',
      bank: 'European Central Bank',
      note: 'The HKMA feed is only updated monthly, so the ECB’s daily reference rate is used. The HKD is pegged between 7.75 and 7.85 per US dollar.',
    },
  },
  PHP: { name: 'Philippine peso', flag: '🇵🇭', source: { type: 'bank', provider: 'bsp', bank: 'Bangko Sentral ng Pilipinas' } },
};

export type FxQuote = {
  currency: string;
  /** Units of `currency` per 1 US dollar. */
  perUsd: number;
  /** Date the central bank published the rate (YYYY-MM-DD). */
  date: string;
  fetchedAt: string;
  sourceUrl: string | null;
  /** True when the network failed and this is an older cached rate. */
  offline?: boolean;
};

/** Human-readable description of where a currency's rate comes from. */
export function describeSource(currency: string) {
  const s = FX_CURRENCIES[currency]?.source;
  if (!s) return { label: 'No official source', note: undefined };
  if (s.type === 'pivot') return { label: 'Base currency for all conversions', note: undefined };
  if (s.type === 'peg') return { label: s.authority, note: undefined };
  return { label: `${s.bank}: official rate`, note: s.note };
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type Row = { currency: string; per_usd: number; rate_date: string; fetched_at: string; source_url: string | null };

async function readCache(db: SQLiteDatabase, currency: string): Promise<FxQuote | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM fx_rates WHERE currency = ?', currency);
  return row && { currency, perUsd: row.per_usd, date: row.rate_date, fetchedAt: row.fetched_at, sourceUrl: row.source_url };
}

async function writeCache(db: SQLiteDatabase, q: FxQuote) {
  await db.runAsync(
    `INSERT INTO fx_rates (currency, per_usd, rate_date, fetched_at, source_url) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(currency) DO UPDATE SET per_usd = excluded.per_usd, rate_date = excluded.rate_date,
       fetched_at = excluded.fetched_at, source_url = excluded.source_url`,
    q.currency, q.perUsd, q.date, q.fetchedAt, q.sourceUrl,
  );
}

async function fetchQuote(db: SQLiteDatabase, currency: string, force: boolean): Promise<Omit<FxQuote, 'fetchedAt'>> {
  const source = FX_CURRENCIES[currency]?.source;
  if (!source) throw new Error(`No official source for ${currency}`);
  if (source.type === 'pivot') return { currency, perUsd: 1, date: todayISO(), sourceUrl: null };
  if (source.type === 'peg') {
    if (source.anchor === 'USD') return { currency, perUsd: source.perAnchor, date: todayISO(), sourceUrl: null };
    const anchor = await getRate(db, source.anchor, force);
    return { currency, perUsd: anchor.perUsd * source.perAnchor, date: anchor.date, sourceUrl: anchor.sourceUrl };
  }
  // A single provider filter returns that central bank's own published rate, not a blend.
  const [rows, meta] = await Promise.all([
    fetchJson<{ date: string; rate: number }[]>(`${API}/rates?providers=${source.provider}&base=USD&quotes=${currency}`),
    fetchJson<{ data_url?: string }>(`${API}/providers/${source.provider}`).catch(() => ({ data_url: undefined })),
  ]);
  const row = rows[0];
  if (!row || !(row.rate > 0)) throw new Error(`${source.bank} has no rate for ${currency}`);
  return { currency, perUsd: row.rate, date: row.date, sourceUrl: meta.data_url ?? null };
}

/** Returns a fresh (or recently cached) official rate, falling back to the cache when offline. */
export async function getRate(db: SQLiteDatabase, currency: string, force = false): Promise<FxQuote> {
  const cached = await readCache(db, currency);
  if (cached && !force && Date.now() - new Date(cached.fetchedAt).getTime() < MAX_AGE_MS) return cached;
  try {
    const quote = { ...(await fetchQuote(db, currency, force)), fetchedAt: new Date().toISOString() };
    await writeCache(db, quote);
    return quote;
  } catch (e) {
    if (cached) return { ...cached, offline: true };
    throw e;
  }
}

/** Loads official rates for `currencies`. `refresh()` bypasses the cache. */
export function useFxRates(currencies: string[]) {
  const db = useSQLiteContext();
  const key = [...new Set(currencies)].sort().join(',');
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{ key: string; quotes: Record<string, FxQuote>; failed: string[] }>();

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(',') : [];
    Promise.all(
      list.map((c) =>
        getRate(db, c, nonce > 0).then(
          (q) => ({ c, q }),
          () => ({ c, q: null }),
        ),
      ),
    ).then((rows) => {
      if (cancelled) return;
      const quotes: Record<string, FxQuote> = {};
      const failed: string[] = [];
      for (const { c, q } of rows) {
        if (q) quotes[c] = q;
        else failed.push(c);
      }
      setResult({ key: `${key}#${nonce}`, quotes, failed });
    });
    return () => {
      cancelled = true;
    };
  }, [db, key, nonce]);

  const current = result?.key === `${key}#${nonce}` ? result : undefined;
  return {
    quotes: current?.quotes ?? result?.quotes ?? {},
    failed: current?.failed ?? [],
    loading: !current,
    offline: Object.values(current?.quotes ?? {}).some((q) => q.offline),
    refresh: () => setNonce((n) => n + 1),
  };
}

/** Multiplier from `from` to `to` (null until both official rates are known). */
export function crossRate(quotes: Record<string, FxQuote>, from: string, to: string) {
  if (from === to) return 1;
  const a = quotes[from];
  const b = quotes[to];
  return a && b ? b.perUsd / a.perUsd : null;
}

/** Official conversion factor between two currencies, for showing "≈ in your currency" hints. */
export function useConversion(from: string, to: string) {
  const fx = useFxRates(from === to ? [] : [from, to]);
  const rate = crossRate(fx.quotes, from, to);
  const dates = [fx.quotes[from]?.date, fx.quotes[to]?.date].filter(Boolean) as string[];
  return { rate, date: dates.sort()[0] ?? null };
}

/** Rates span from 0.00001 to 100,000+, so format by significant digits. */
export function formatRate(n: number) {
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: n >= 1000 ? 7 : 5 }).format(n);
}
