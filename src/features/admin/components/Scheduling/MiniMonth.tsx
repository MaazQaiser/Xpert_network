'use client';

import { useState } from 'react';
import { IconButton } from '@carbon/react';
import { ChevronLeft, ChevronRight } from '@carbon/icons-react';
import type { Meeting } from '../../model/schedule.schema';
import {
  addMonths,
  formatDayNumber,
  formatMonthYear,
  monthGrid,
  sameDay,
  startOfMonth,
} from './dates';
import styles from './Scheduling.module.scss';

/**
 * The small month in the sidebar, as in Google Calendar: jump to any day; the days on screen
 * are shaded, today is filled, and a dot marks days with calls.
 */
export function MiniMonth({
  focus,
  visible,
  now,
  meetings,
  onPick,
}: {
  focus: Date;
  /** The days the calendar is showing now. */
  visible: Date[];
  now: Date;
  meetings: Meeting[];
  onPick: (day: Date) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(focus));
  const [shownFor, setShownFor] = useState(focus.getTime());
  // Follow the calendar when it moves to another month.
  if (shownFor !== focus.getTime()) {
    setShownFor(focus.getTime());
    setMonth(startOfMonth(focus));
  }
  const days = monthGrid(month);
  const busy = new Set(meetings.map((m) => new Date(m.startsAt).toISOString().slice(0, 10)));
  const first = visible[0];
  const last = visible.at(-1);

  return (
    <section className={styles.mini} aria-label="Pick a date">
      <div className={styles.miniHead}>
        <span className={styles.miniTitle}>{formatMonthYear(month)}</span>
        <span>
          <IconButton
            kind="ghost"
            size="sm"
            label="Previous month"
            align="bottom"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            label="Next month"
            align="bottom-right"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight />
          </IconButton>
        </span>
      </div>
      <div className={styles.miniGrid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => (
          <span key={i} className={styles.miniWeekday} aria-hidden="true">
            {letter}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = day.getUTCMonth() === month.getUTCMonth();
          const inView = first && last ? day >= first && day <= last : false;
          const isToday = sameDay(day, now);
          const classes = [
            styles.miniDay,
            inMonth ? '' : styles.miniDayOut,
            inView ? styles.miniDayInView : '',
            isToday ? styles.miniDayToday : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={classes}
              aria-label={day.toLocaleDateString('en-GB', {
                timeZone: 'UTC',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => onPick(day)}
            >
              {formatDayNumber(day)}
              {busy.has(day.toISOString().slice(0, 10)) ? (
                <span className={styles.miniDot} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
