/** Dates are stored as local `YYYY-MM-DD` strings; months as `YYYY-MM`. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISODate(new Date());
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function currentMonthKey() {
  return monthKey(todayISO());
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(key: string, short = false) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, short ? { month: 'short' } : { month: 'long', year: 'numeric' });
}

export function dayLabel(iso: string) {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === toISODate(addDays(new Date(), -1))) return 'Yesterday';
  return fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: iso.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric' });
}

export function shortDate(iso: string) {
  return fromISODate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((fromISODate(toIso).getTime() - fromISODate(fromIso).getTime()) / 86_400_000);
}

export type Frequency = 'weekly' | 'monthly' | 'yearly' | 'once';

export function advanceDate(iso: string, freq: Frequency) {
  const d = fromISODate(iso);
  if (freq === 'weekly') return toISODate(addDays(d, 7));
  if (freq === 'yearly') return toISODate(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()));
  // Monthly: clamp to the last day of the next month (e.g. Jan 31 -> Feb 28).
  const target = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  return toISODate(target);
}
