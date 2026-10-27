'use client';

import type { Meeting, ScheduleProject } from '../../model/schedule.schema';
import { formatDayNumber, formatTime, formatWeekday, minutesOfDay, sameDay } from './dates';
import { meetingLabel } from './meetingLabel';
import styles from './Scheduling.module.scss';

/** The grid shows the working day; every call sits well inside it. */
export const FIRST_HOUR = 7;
export const LAST_HOUR = 21;
/** One hour is 4rem tall ($spacing-10). */
const HOUR_REM = 4;

type Placed = { meeting: Meeting; lane: number; lanes: number };

/** Side by side when meetings overlap, as in Google Calendar: each cluster shares the width. */
function placeDay(meetings: Meeting[]): Placed[] {
  const sorted = [...meetings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = 0;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    for (const p of cluster) p.lanes = lanes;
    placed.push(...cluster);
    cluster = [];
  };
  for (const meeting of sorted) {
    const start = new Date(meeting.startsAt).getTime();
    const end = new Date(meeting.endsAt).getTime();
    if (cluster.length > 0 && start >= clusterEnd) flush();
    const laneEnds = new Map<number, number>();
    for (const p of cluster) {
      laneEnds.set(
        p.lane,
        Math.max(laneEnds.get(p.lane) ?? 0, new Date(p.meeting.endsAt).getTime()),
      );
    }
    let lane = 0;
    while ((laneEnds.get(lane) ?? 0) > start) lane += 1;
    cluster.push({ meeting, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return placed;
}

/**
 * Week and Day views: a time grid like Google Calendar's. Days across the top (today circled),
 * hours down the side, each meeting a block in its project's colour; held slots are dashed.
 * A red line marks now.
 */
export function TimeGrid({
  days,
  meetings,
  projects,
  now,
  openId,
  onOpen,
}: {
  days: Date[];
  meetings: Meeting[];
  projects: Record<string, ScheduleProject>;
  now: Date;
  openId: string | null;
  onOpen: (meeting: Meeting, anchor: HTMLElement) => void;
}) {
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const nowMinutes = minutesOfDay(now);
  const showNow = nowMinutes >= FIRST_HOUR * 60 && nowMinutes <= LAST_HOUR * 60;

  return (
    <div
      className={days.length > 1 ? `${styles.timeGrid} ${styles.timeGridWide}` : styles.timeGrid}
      style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {/* The day headers. */}
      <div className={styles.cornerCell} aria-hidden="true">
        GMT
      </div>
      {days.map((day) => {
        const isToday = sameDay(day, now);
        return (
          <div
            key={day.toISOString()}
            className={isToday ? `${styles.dayHead} ${styles.dayHeadToday}` : styles.dayHead}
          >
            <span className={styles.dayName}>{formatWeekday(day)}</span>
            <span className={styles.dayNumber} aria-current={isToday ? 'date' : undefined}>
              {formatDayNumber(day)}
            </span>
          </div>
        );
      })}

      {/* The hours, then one column per day. */}
      <div className={styles.hourGutter} aria-hidden="true">
        {hours.map((hour) => (
          <span key={hour} className={styles.hourLabel} style={{ blockSize: `${HOUR_REM}rem` }}>
            {hour === FIRST_HOUR ? '' : `${String(hour).padStart(2, '0')}:00`}
          </span>
        ))}
      </div>
      {days.map((day) => {
        const dayMeetings = meetings.filter((m) => sameDay(new Date(m.startsAt), day));
        const isToday = sameDay(day, now);
        return (
          <div
            key={day.toISOString()}
            className={styles.dayColumn}
            style={{ blockSize: `${hours.length * HOUR_REM}rem` }}
            role="list"
            aria-label={`${formatWeekday(day)} ${formatDayNumber(day)}`}
          >
            {hours.map((hour) => (
              <span
                key={hour}
                className={styles.hourLine}
                style={{ insetBlockStart: `${(hour - FIRST_HOUR) * HOUR_REM}rem` }}
                aria-hidden="true"
              />
            ))}
            {isToday && showNow ? (
              <span
                className={styles.nowLine}
                style={{
                  insetBlockStart: `${((nowMinutes - FIRST_HOUR * 60) / 60) * HOUR_REM}rem`,
                }}
                aria-hidden="true"
              />
            ) : null}
            {placeDay(dayMeetings).map(({ meeting, lane, lanes }) => {
              const start = new Date(meeting.startsAt);
              const end = new Date(meeting.endsAt);
              const top = ((minutesOfDay(start) - FIRST_HOUR * 60) / 60) * HOUR_REM;
              const height = ((end.getTime() - start.getTime()) / 3_600_000) * HOUR_REM;
              const colour = projects[meeting.projectId]?.colour ?? 'blue';
              // Under 45 minutes there's room for one line: the name, then the start time.
              const isShort = end.getTime() - start.getTime() < 45 * 60_000;
              const classes = [
                styles.event,
                isShort ? styles.eventShort : '',
                styles[colour],
                meeting.kind === 'held' ? styles.eventHeld : '',
                meeting.id === openId ? styles.eventOpen : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div key={meeting.id} role="listitem">
                  <button
                    type="button"
                    className={classes}
                    style={{
                      insetBlockStart: `${top}rem`,
                      blockSize: `calc(${height}rem - 2px)`,
                      insetInlineStart: `${(lane / lanes) * 100}%`,
                      inlineSize: `calc(${100 / lanes}% - 4px)`,
                    }}
                    aria-label={meetingLabel(meeting)}
                    aria-haspopup="dialog"
                    aria-expanded={meeting.id === openId}
                    onClick={(event) => onOpen(meeting, event.currentTarget)}
                  >
                    {isShort ? (
                      <span className={styles.eventLine}>
                        <strong>
                          {meeting.kind === 'held' ? 'Held · ' : ''}
                          {meeting.expert.name}
                        </strong>
                        , {formatTime(start)}
                      </span>
                    ) : (
                      <>
                        <span className={styles.eventTitle}>
                          {meeting.kind === 'held' ? 'Held · ' : ''}
                          {meeting.expert.name}
                        </span>
                        <span className={styles.eventMeta}>
                          {formatTime(start)} – {formatTime(end)} · {meeting.client.detail}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
