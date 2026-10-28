'use client';

import Image from 'next/image';
import styles from './Calls.module.scss';

/** "12:40" from seconds; "1:02:05" past an hour. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Whole minutes between two ISO times. */
export function minutesBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
}

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC', ...options });

export const timeOf = (iso: string) => fmt(iso, { hour: '2-digit', minute: '2-digit' });
export const dateOf = (iso: string) =>
  fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const longDateOf = (iso: string) =>
  fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });

/** "Today", "Tomorrow", "Yesterday", else "Thu 29 Oct": how a day's group is headed. */
export function dayLabel(iso: string, now: Date): string {
  const day = Date.UTC(
    new Date(iso).getUTCFullYear(),
    new Date(iso).getUTCMonth(),
    new Date(iso).getUTCDate(),
  );
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.round((day - today) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return dateOf(iso);
}

/** A round portrait; initials when there is no photo. */
export function Avatar({
  name,
  photoUrl,
  size = 32,
  className,
}: {
  name: string;
  photoUrl: string | null;
  size?: 24 | 32 | 48 | 64 | 96;
  className?: string;
}) {
  // First and last name, so "Joost de Wit" reads JW, not Jd.
  const parts = name.split(' ').filter(Boolean);
  const initials = [parts[0], parts.length > 1 ? parts.at(-1) : undefined]
    .map((part) => part?.[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={[styles.avatar, styles[`avatar${size}`], className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {photoUrl ? (
        <Image src={photoUrl} alt="" width={size} height={size} className={styles.photo} />
      ) : (
        initials
      )}
    </span>
  );
}
