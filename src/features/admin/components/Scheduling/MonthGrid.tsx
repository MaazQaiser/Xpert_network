'use client';

import type { Meeting, ScheduleProject } from '../../model/schedule.schema';
import { formatDayNumber, formatTime, formatWeekday, monthGrid, sameDay } from './dates';
import { meetingLabel } from './meetingLabel';
import styles from './Scheduling.module.scss';

/** A day shows this many meetings; the rest fold into "+N more", which opens the day. */
const PER_DAY = 3;

/**
 * Month view: six weeks of days, each with its first few meetings as small chips in their
 * project's colour. Days outside the month are quieter; today's number is circled.
 */
export function MonthGrid({
  month,
  meetings,
  projects,
  now,
  openId,
  onOpen,
  onOpenDay,
}: {
  month: Date;
  meetings: Meeting[];
  projects: Record<string, ScheduleProject>;
  now: Date;
  openId: string | null;
  onOpen: (meeting: Meeting, anchor: HTMLElement) => void;
  onOpenDay: (day: Date) => void;
}) {
  const days = monthGrid(month);
  return (
    <div className={styles.monthGrid}>
      {days.slice(0, 7).map((day) => (
        <div key={`h-${day.toISOString()}`} className={styles.monthHead} aria-hidden="true">
          {formatWeekday(day)}
        </div>
      ))}
      {days.map((day) => {
        const dayMeetings = meetings.filter((m) => sameDay(new Date(m.startsAt), day));
        const inMonth = day.getUTCMonth() === month.getUTCMonth();
        const isToday = sameDay(day, now);
        const more = dayMeetings.length - PER_DAY;
        return (
          <div
            key={day.toISOString()}
            className={inMonth ? styles.monthCell : `${styles.monthCell} ${styles.monthCellOut}`}
          >
            <button
              type="button"
              className={
                isToday ? `${styles.monthDate} ${styles.monthDateToday}` : styles.monthDate
              }
              aria-current={isToday ? 'date' : undefined}
              aria-label={`Open ${day.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}`}
              onClick={() => onOpenDay(day)}
            >
              {formatDayNumber(day)}
            </button>
            <ul className={styles.monthList}>
              {dayMeetings.slice(0, PER_DAY).map((meeting) => {
                const colour = projects[meeting.projectId]?.colour ?? 'blue';
                const classes = [
                  styles.chip,
                  styles[colour],
                  meeting.kind === 'held' ? styles.chipHeld : '',
                  meeting.id === openId ? styles.eventOpen : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <li key={meeting.id}>
                    <button
                      type="button"
                      className={classes}
                      aria-label={meetingLabel(meeting)}
                      aria-haspopup="dialog"
                      aria-expanded={meeting.id === openId}
                      onClick={(event) => onOpen(meeting, event.currentTarget)}
                    >
                      <span className={styles.chipTime}>
                        {formatTime(new Date(meeting.startsAt))}
                      </span>
                      <span className={styles.chipName}>{meeting.expert.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {more > 0 ? (
              <button type="button" className={styles.more} onClick={() => onOpenDay(day)}>
                +{more} more
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
