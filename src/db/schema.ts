import type { SQLiteDatabase } from 'expo-sqlite';
import type { IconName, TxType } from './types';

export const DATABASE_NAME = 'fintrack.db';

const DEFAULT_CATEGORIES: [string, TxType, IconName, string][] = [
  ['Food & Dining', 'expense', 'restaurant', '#F97316'],
  ['Groceries', 'expense', 'cart', '#22C55E'],
  ['Transport', 'expense', 'car', '#3B82F6'],
  ['Housing', 'expense', 'home', '#8B5CF6'],
  ['Utilities', 'expense', 'flash', '#EAB308'],
  ['Shopping', 'expense', 'bag-handle', '#EC4899'],
  ['Health', 'expense', 'medkit', '#EF4444'],
  ['Entertainment', 'expense', 'film', '#A855F7'],
  ['Education', 'expense', 'school', '#0EA5E9'],
  ['Subscriptions', 'expense', 'repeat', '#6366F1'],
  ['Travel', 'expense', 'airplane', '#14B8A6'],
  ['Personal Care', 'expense', 'sparkles', '#D946EF'],
  ['Gifts & Donations', 'expense', 'gift', '#F43F5E'],
  ['Debt Payments', 'expense', 'card', '#78716C'],
  ['Other', 'expense', 'ellipsis-horizontal', '#64748B'],
  ['Salary', 'income', 'briefcase', '#10B981'],
  ['Business', 'income', 'storefront', '#06B6D4'],
  ['Freelance', 'income', 'laptop', '#84CC16'],
  ['Investments', 'income', 'trending-up', '#F59E0B'],
  ['Gifts Received', 'income', 'gift', '#EC4899'],
  ['Other Income', 'income', 'cash', '#64748B'],
];

const LATEST_VERSION = 2;

/** Runs before the app renders (via SQLiteProvider onInit). */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= LATEST_VERSION) return;

  if (version === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE transactions (
          id INTEGER PRIMARY KEY NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          amount INTEGER NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          date TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_transactions_date ON transactions(date);
        CREATE TABLE budgets (
          category_id INTEGER PRIMARY KEY NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL
        );
        CREATE TABLE goals (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          target INTEGER NOT NULL,
          saved INTEGER NOT NULL DEFAULT 0,
          deadline TEXT,
          color TEXT NOT NULL,
          icon TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE bills (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          amount INTEGER NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          due_date TEXT NOT NULL,
          frequency TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      for (const [name, type, icon, color] of DEFAULT_CATEGORIES) {
        await db.runAsync('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)', name, type, icon, color);
      }
    });
  }
  if (version < 2) {
    // Cache of official exchange rates (units of `currency` per 1 USD) so conversions work offline.
    await db.execAsync(`
      CREATE TABLE fx_rates (
        currency TEXT PRIMARY KEY NOT NULL,
        per_usd REAL NOT NULL,
        rate_date TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        source_url TEXT
      );
    `);
  }
  // Future migrations: `if (version < 3) { ... }`

  await db.execAsync(`PRAGMA user_version = ${LATEST_VERSION}`);
}
