import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { getSetting, setSetting } from '@/db/queries';
import { CUSTOM_COUNTRY, getCountry } from './countries';
import { formatMajor, formatMoney } from './money';
import type { ThemePreference } from './theme';

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
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => Promise<void>;
  /** Re-reads every setting from the database, e.g. after restoring a backup. */
  reload: () => Promise<void>;
};

type Stored = { currency: string | null; country: string | null; calcCountry: string | null; theme: string | null };

const SettingsContext = createContext<Settings | null>(null);

/** Pins the whole app (including native pickers and alerts) to light/dark, or follows the system. */
function applyTheme(theme: string | null) {
  Appearance.setColorScheme(theme === 'light' || theme === 'dark' ? theme : 'auto');
}

async function readAll(db: SQLiteDatabase): Promise<Stored> {
  const [currency, country, calcCountry, theme] = await Promise.all(
    ['currency', 'country', 'calcCountry', 'theme'].map((key) => getSetting(db, key)),
  );
  applyTheme(theme);
  return { currency, country, calcCountry, theme };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [stored, setStored] = useState<Stored>();

  useEffect(() => {
    readAll(db).then(setStored);
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
      theme: stored.theme === 'light' || stored.theme === 'dark' ? stored.theme : 'system',
      setTheme: (theme) => {
        applyTheme(theme);
        return update({ theme });
      },
      reload: () => readAll(db).then(setStored),
    };
  }, [db, stored, update]);

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
