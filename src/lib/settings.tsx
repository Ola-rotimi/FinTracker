import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSetting, setSetting } from '@/db/queries';
import { CUSTOM_COUNTRY, getCountry } from './countries';
import { formatMajor, formatMoney } from './money';

type Settings = {
  currency: string;
  /** False until the user has picked a currency (directly or via their country) at least once. */
  currencyChosen: boolean;
  setCurrency: (code: string) => Promise<void>;
  /** The user's home country code, or null if not chosen yet. */
  country: string | null;
  /** Sets the home country, its currency, and the country the calculators use. */
  setCountry: (code: string) => Promise<void>;
  /** Country whose rules the tax and pension calculators apply (or `CUSTOM_COUNTRY`). */
  calcCountry: string;
  setCalcCountry: (code: string) => Promise<void>;
};

type Stored = { currency: string | null; country: string | null; calcCountry: string | null };

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [stored, setStored] = useState<Stored>();

  useEffect(() => {
    Promise.all([getSetting(db, 'currency'), getSetting(db, 'country'), getSetting(db, 'calcCountry')]).then(
      ([currency, country, calcCountry]) => setStored({ currency, country, calcCountry }),
    );
  }, [db]);

  const update = useCallback(
    async (changes: Partial<Stored>) => {
      for (const [key, value] of Object.entries(changes)) {
        if (value) await setSetting(db, key, value);
      }
      setStored((s) => (s ? { ...s, ...changes } : s));
    },
    [db],
  );

  const value = useMemo<Settings | null>(() => {
    if (!stored) return null;
    return {
      currency: stored.currency ?? 'USD',
      currencyChosen: !!stored.currency,
      setCurrency: (code) => update({ currency: code }),
      country: stored.country,
      setCountry: (code) => {
        const preset = getCountry(code);
        return update({ country: code, calcCountry: code, ...(preset && { currency: preset.currency }) });
      },
      calcCountry: stored.calcCountry ?? stored.country ?? CUSTOM_COUNTRY,
      setCalcCountry: (code) => update({ calcCountry: code }),
    };
  }, [stored, update]);

  if (!value) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

/** Formatters bound to the user's currency, or to `override` (e.g. another country's calculator). */
export function useMoney(override?: string) {
  const settings = useSettings();
  const currency = override ?? settings.currency;
  return useMemo(
    () => ({
      currency,
      money: (cents: number, opts?: { compact?: boolean; sign?: boolean }) => formatMoney(cents, currency, opts),
      major: (value: number, compact = false) => formatMajor(value, currency, compact),
    }),
    [currency],
  );
}
