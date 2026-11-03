/** Serialises the whole database to a plain object and restores it. Used by backup/restore. */
import type { SQLiteDatabase } from 'expo-sqlite';
import { notifyChange } from './events';

export const SNAPSHOT_FORMAT = 1;

/** Columns copied for each table, in insert order (parents before children). */
const TABLES = {
  categories: ['id', 'name', 'type', 'icon', 'color', 'archived'],
  transactions: ['id', 'type', 'amount', 'category_id', 'date', 'note', 'created_at'],
  budgets: ['category_id', 'amount'],
  goals: ['id', 'name', 'target', 'saved', 'deadline', 'color', 'icon', 'created_at'],
  bills: ['id', 'name', 'amount', 'category_id', 'due_date', 'frequency', 'active'],
  settings: ['key', 'value'],
} as const;

type TableName = keyof typeof TABLES;
type Row = Record<string, string | number | null>;

export type Snapshot = {
  app: 'BudT';
  format: number;
  exportedAt: string;
  tables: Record<TableName, Row[]>;
};

export class SnapshotError extends Error {}

const entries = () => Object.entries(TABLES) as [TableName, readonly string[]][];

export async function exportSnapshot(db: SQLiteDatabase): Promise<Snapshot> {
  const tables = {} as Record<TableName, Row[]>;
  for (const [name, columns] of entries()) {
    tables[name] = await db.getAllAsync<Row>(`SELECT ${columns.join(', ')} FROM ${name}`);
  }
  return { app: 'BudT', format: SNAPSHOT_FORMAT, exportedAt: new Date().toISOString(), tables };
}

/** Checks that parsed JSON is a BudT snapshot this version can restore. */
export function validateSnapshot(parsed: unknown): Snapshot {
  const s = parsed as Partial<Snapshot> | null;
  if (s?.app !== 'BudT' || typeof s.tables !== 'object' || !s.tables) throw new SnapshotError('That file isn’t a BudT backup.');
  if ((s.format ?? 0) > SNAPSHOT_FORMAT) {
    throw new SnapshotError('This backup was made by a newer version of BudT. Update the app and try again.');
  }
  for (const [name] of entries()) {
    if (!Array.isArray(s.tables[name])) throw new SnapshotError('This backup is incomplete or damaged.');
  }
  return s as Snapshot;
}

/** Replaces all app data with the snapshot's contents, atomically: on any error nothing changes. */
export async function importSnapshot(db: SQLiteDatabase, snapshot: Snapshot) {
  try {
    await db.withTransactionAsync(async () => {
      // Children first so foreign keys never point at missing rows.
      await db.execAsync(
        'DELETE FROM budgets; DELETE FROM bills; DELETE FROM transactions; DELETE FROM goals; DELETE FROM categories; DELETE FROM settings;',
      );
      for (const [name, columns] of entries()) {
        for (const row of snapshot.tables[name]) {
          // Omit missing values so column defaults apply; only known column names ever reach the SQL.
          const cols = columns.filter((c) => row[c] !== undefined && row[c] !== null);
          await db.runAsync(
            `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
            cols.map((c) => row[c] as string | number),
          );
        }
      }
    });
  } catch {
    throw new SnapshotError('This backup is damaged and couldn’t be restored. Your existing data hasn’t been changed.');
  }
  notifyChange();
}
