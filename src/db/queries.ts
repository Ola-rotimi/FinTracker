import type { SQLiteDatabase } from 'expo-sqlite';
import { advanceDate, shiftMonth, todayISO } from '@/lib/dates';
import { notifyChange } from './events';
import type { Bill, Budget, Category, Goal, IconName, Transaction, TxType } from './types';

/** `[start, end)` date bounds for a `YYYY-MM` month key. */
function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${shiftMonth(month, 1)}-01`];
}

// ---------- Settings ----------

export async function getSetting(db: SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
  notifyChange();
}

// ---------- Categories ----------

export function listCategories(db: SQLiteDatabase, type?: TxType) {
  return type
    ? db.getAllAsync<Category>('SELECT * FROM categories WHERE archived = 0 AND type = ? ORDER BY name', type)
    : db.getAllAsync<Category>('SELECT * FROM categories WHERE archived = 0 ORDER BY type DESC, name');
}

export function getCategory(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', id);
}

export async function saveCategory(db: SQLiteDatabase, c: Omit<Category, 'id' | 'archived'> & { id?: number }) {
  if (c.id) {
    await db.runAsync('UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?', c.name, c.icon, c.color, c.id);
  } else {
    await db.runAsync('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)', c.name, c.type, c.icon, c.color);
  }
  notifyChange();
}

/** Categories are archived rather than deleted so past transactions keep their label. */
export async function archiveCategory(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE categories SET archived = 1 WHERE id = ?', id);
    await db.runAsync('DELETE FROM budgets WHERE category_id = ?', id);
  });
  notifyChange();
}

// ---------- Transactions ----------

export type TxRow = Transaction & { category_name: string; category_icon: IconName; category_color: string };

const TX_SELECT = `
  SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
  FROM transactions t JOIN categories c ON c.id = t.category_id`;

export function listTransactions(db: SQLiteDatabase, month: string, type?: TxType, search = '') {
  const [start, end] = monthRange(month);
  const where = ['t.date >= ?', 't.date < ?'];
  const params: (string | number)[] = [start, end];
  if (type) {
    where.push('t.type = ?');
    params.push(type);
  }
  if (search.trim()) {
    where.push('(t.note LIKE ? OR c.name LIKE ?)');
    const like = `%${search.trim()}%`;
    params.push(like, like);
  }
  return db.getAllAsync<TxRow>(`${TX_SELECT} WHERE ${where.join(' AND ')} ORDER BY t.date DESC, t.id DESC`, params);
}

export function recentTransactions(db: SQLiteDatabase, limit = 5) {
  return db.getAllAsync<TxRow>(`${TX_SELECT} ORDER BY t.date DESC, t.id DESC LIMIT ?`, limit);
}

export function getTransaction(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', id);
}

export async function saveTransaction(db: SQLiteDatabase, tx: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'date' | 'note'> & { id?: number }) {
  if (tx.id) {
    await db.runAsync(
      'UPDATE transactions SET type = ?, amount = ?, category_id = ?, date = ?, note = ? WHERE id = ?',
      tx.type, tx.amount, tx.category_id, tx.date, tx.note, tx.id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)',
      tx.type, tx.amount, tx.category_id, tx.date, tx.note,
    );
  }
  notifyChange();
}

export async function deleteTransaction(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  notifyChange();
}

// ---------- Aggregates ----------

export type Totals = { income: number; expense: number };

const TOTALS_SQL = `
  SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
  FROM transactions`;

export async function monthTotals(db: SQLiteDatabase, month: string): Promise<Totals> {
  const row = await db.getFirstAsync<Totals>(`${TOTALS_SQL} WHERE date >= ? AND date < ?`, monthRange(month));
  return row ?? { income: 0, expense: 0 };
}

export async function allTimeTotals(db: SQLiteDatabase): Promise<Totals> {
  const row = await db.getFirstAsync<Totals>(TOTALS_SQL);
  return row ?? { income: 0, expense: 0 };
}

/** Income/expense per month for the `count` months ending at `endMonth`, oldest first. */
export async function monthlyTotals(db: SQLiteDatabase, endMonth: string, count: number) {
  const startMonth = shiftMonth(endMonth, -(count - 1));
  const rows = await db.getAllAsync<Totals & { month: string }>(
    `SELECT substr(date, 1, 7) AS month,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
     FROM transactions WHERE date >= ? AND date < ? GROUP BY month`,
    `${startMonth}-01`, `${shiftMonth(endMonth, 1)}-01`,
  );
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(startMonth, i);
    const r = byMonth.get(month);
    return { month, income: r?.income ?? 0, expense: r?.expense ?? 0 };
  });
}

export type CategoryTotal = { id: number; name: string; icon: IconName; color: string; total: number; count: number };

export function categoryTotals(db: SQLiteDatabase, month: string, type: TxType) {
  const [start, end] = monthRange(month);
  return db.getAllAsync<CategoryTotal>(
    `SELECT c.id, c.name, c.icon, c.color, SUM(t.amount) AS total, COUNT(*) AS count
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.type = ? AND t.date >= ? AND t.date < ?
     GROUP BY c.id ORDER BY total DESC`,
    type, start, end,
  );
}

// ---------- Budgets ----------

export type BudgetRow = { category_id: number; name: string; icon: IconName; color: string; budget: number; spent: number };

export function budgetsWithSpending(db: SQLiteDatabase, month: string) {
  const [start, end] = monthRange(month);
  return db.getAllAsync<BudgetRow>(
    `SELECT c.id AS category_id, c.name, c.icon, c.color, b.amount AS budget,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
                      WHERE t.category_id = c.id AND t.type = 'expense' AND t.date >= ? AND t.date < ?), 0) AS spent
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE c.archived = 0
     ORDER BY c.name`,
    start, end,
  );
}

export function getBudget(db: SQLiteDatabase, categoryId: number) {
  return db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE category_id = ?', categoryId);
}

export async function setBudget(db: SQLiteDatabase, categoryId: number, amount: number) {
  await db.runAsync(
    'INSERT INTO budgets (category_id, amount) VALUES (?, ?) ON CONFLICT(category_id) DO UPDATE SET amount = excluded.amount',
    categoryId, amount,
  );
  notifyChange();
}

export async function deleteBudget(db: SQLiteDatabase, categoryId: number) {
  await db.runAsync('DELETE FROM budgets WHERE category_id = ?', categoryId);
  notifyChange();
}

// ---------- Goals ----------

export function listGoals(db: SQLiteDatabase) {
  return db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY (saved >= target), deadline IS NULL, deadline, created_at');
}

export function getGoal(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', id);
}

export async function saveGoal(db: SQLiteDatabase, g: Omit<Goal, 'id' | 'created_at'> & { id?: number }) {
  if (g.id) {
    await db.runAsync(
      'UPDATE goals SET name = ?, target = ?, saved = ?, deadline = ?, color = ?, icon = ? WHERE id = ?',
      g.name, g.target, g.saved, g.deadline, g.color, g.icon, g.id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO goals (name, target, saved, deadline, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
      g.name, g.target, g.saved, g.deadline, g.color, g.icon,
    );
  }
  notifyChange();
}

/** Adds (or, with a negative delta, withdraws) money from a goal. Never goes below zero. */
export async function contributeToGoal(db: SQLiteDatabase, id: number, delta: number) {
  await db.runAsync('UPDATE goals SET saved = MAX(0, saved + ?) WHERE id = ?', delta, id);
  notifyChange();
}

export async function deleteGoal(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
  notifyChange();
}

// ---------- Bills ----------

export type BillRow = Bill & { category_name: string; category_icon: IconName; category_color: string };

export function listBills(db: SQLiteDatabase) {
  return db.getAllAsync<BillRow>(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM bills b JOIN categories c ON c.id = b.category_id
     WHERE b.active = 1 ORDER BY b.due_date, b.name`,
  );
}

export function getBill(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Bill>('SELECT * FROM bills WHERE id = ?', id);
}

export async function saveBill(db: SQLiteDatabase, b: Omit<Bill, 'id' | 'active'> & { id?: number }) {
  if (b.id) {
    await db.runAsync(
      'UPDATE bills SET name = ?, amount = ?, category_id = ?, due_date = ?, frequency = ? WHERE id = ?',
      b.name, b.amount, b.category_id, b.due_date, b.frequency, b.id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO bills (name, amount, category_id, due_date, frequency) VALUES (?, ?, ?, ?, ?)',
      b.name, b.amount, b.category_id, b.due_date, b.frequency,
    );
  }
  notifyChange();
}

export async function deleteBill(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM bills WHERE id = ?', id);
  notifyChange();
}

/** Records the payment as an expense today and moves the bill to its next due date. */
export async function markBillPaid(db: SQLiteDatabase, bill: Bill) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)',
      'expense', bill.amount, bill.category_id, todayISO(), bill.name,
    );
    if (bill.frequency === 'once') {
      await db.runAsync('UPDATE bills SET active = 0 WHERE id = ?', bill.id);
    } else {
      await db.runAsync('UPDATE bills SET due_date = ? WHERE id = ?', advanceDate(bill.due_date, bill.frequency), bill.id);
    }
  });
  notifyChange();
}

// ---------- Data management ----------

export async function exportTransactionsCsv(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<TxRow>(`${TX_SELECT} ORDER BY t.date, t.id`);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = rows.map((r) => [r.date, r.type, esc(r.category_name), (r.amount / 100).toFixed(2), esc(r.note)].join(','));
  return { csv: ['Date,Type,Category,Amount,Note', ...lines].join('\n'), count: rows.length };
}

export async function resetAllData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM transactions; DELETE FROM budgets; DELETE FROM goals; DELETE FROM bills;');
  });
  notifyChange();
}
