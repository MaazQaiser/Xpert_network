/**
 * Calendar maths in GMT, so every PM sees the same grid as the clients' invites. Dates are
 * midnight-GMT `Date`s; weeks start on Monday.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -((day.getUTCDay() + 6) % 7));
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** The six-week block a month view shows, Monday first. */
export function monthGrid(month: Date): Date[] {
  const first = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleString('en-GB', { timeZone: 'UTC', ...options });

export const formatTime = (date: Date) => fmt(date, { hour: '2-digit', minute: '2-digit' });
export const formatWeekday = (date: Date) => fmt(date, { weekday: 'short' });
export const formatDayNumber = (date: Date) => fmt(date, { day: 'numeric' });
export const formatMonthYear = (date: Date) => fmt(date, { month: 'long', year: 'numeric' });
export const formatLongDate = (date: Date) =>
  fmt(date, { weekday: 'long', day: 'numeric', month: 'long' });

/** "26 Oct – 1 Nov 2026", or "28 Sept – 4 Oct 2026" across months. */
export function formatRange(from: Date, to: Date): string {
  const sameMonth = from.getUTCMonth() === to.getUTCMonth();
  const left = sameMonth
    ? fmt(from, { day: 'numeric' })
    : fmt(from, { day: 'numeric', month: 'short' });
  return `${left} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Minutes since midnight GMT. */
export function minutesOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}
