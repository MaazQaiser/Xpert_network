'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Dropdown, IconButton, SkeletonText } from '@carbon/react';
import { ChevronLeft, ChevronRight, SidePanelClose, SidePanelOpen } from '@carbon/icons-react';
import { Calendar as CalendarPictogram } from '@carbon/pictograms-react';
import { AsyncBoundary, EmptyState } from '@/shared/ui';
import { useSchedule } from '../../api/queries';
import type { Meeting, Schedule, ScheduleProject } from '../../model/schedule.schema';
import {
  addDays,
  addMonths,
  formatLongDate,
  formatMonthYear,
  formatRange,
  monthGrid,
  sameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './dates';
import { MeetingPreview } from './MeetingPreview';
import { MiniMonth } from './MiniMonth';
import { MonthGrid } from './MonthGrid';
import { TimeGrid } from './TimeGrid';
import styles from './Scheduling.module.scss';

type View = 'day' | 'week' | 'month';
const VIEW_ITEMS: { id: View; text: string }[] = [
  { id: 'day', text: 'Day' },
  { id: 'week', text: 'Week' },
  { id: 'month', text: 'Month' },
];

function daysFor(view: View, focus: Date): Date[] {
  if (view === 'day') return [focus];
  if (view === 'week') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(focus), i));
  return monthGrid(focus);
}

/**
 * Scheduling (F15): the PM's calendar of expert calls across projects, laid out like Google
 * Calendar. One compact bar (title, Today, arrows, the period, a view menu); a mini month and
 * project filters on the left; the calendar filling the rest. Click a meeting for its details
 * and Join, which opens the call in our meeting room.
 */
export function Scheduling() {
  const schedule = useSchedule();
  const [now] = useState(() => new Date());
  // A phone opens on one day; seven columns don't fit its width.
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 41.98rem)').matches
      ? 'day'
      : 'week',
  );
  const [focus, setFocus] = useState(() => startOfDay(now));
  // The mini month and filters can fold away for a wider calendar.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((isOpen) => !isOpen);
  const days = daysFor(view, focus);
  const first = days[0] ?? focus;
  const last = days.at(-1) ?? focus;

  const title =
    view === 'day'
      ? `${formatLongDate(focus)} ${focus.getUTCFullYear()}`
      : view === 'week'
        ? formatRange(first, last)
        : formatMonthYear(focus);
  const isCurrent =
    view === 'month'
      ? sameDay(startOfMonth(focus), startOfMonth(now))
      : view === 'day'
        ? sameDay(focus, now)
        : days.some((d) => sameDay(d, now));
  const step = (direction: -1 | 1) =>
    setFocus((f) =>
      view === 'day'
        ? addDays(f, direction)
        : view === 'week'
          ? addDays(f, 7 * direction)
          : addMonths(f, direction),
    );

  return (
    <div className={styles.root}>
      {/* One bar, as in Google Calendar: what this is, where you are, how you're looking. */}
      <header className={sidebarOpen ? `${styles.topBar} ${styles.topBarAligned}` : styles.topBar}>
        <div className={styles.titleGroup}>
          <IconButton
            kind="ghost"
            size="md"
            label={sidebarOpen ? 'Hide the side panel' : 'Show the side panel'}
            align="bottom-left"
            aria-expanded={sidebarOpen}
            aria-controls="schedule-sidebar"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <SidePanelClose size={20} /> : <SidePanelOpen size={20} />}
          </IconButton>
          <h1 className={styles.pageTitle}>Scheduling</h1>
        </div>
        <div className={styles.toolbarNav}>
          <Button
            kind="tertiary"
            size="md"
            className={styles.todayButton}
            disabled={isCurrent}
            onClick={() => setFocus(startOfDay(now))}
          >
            Today
          </Button>
          <IconButton
            kind="ghost"
            size="md"
            label={`Previous ${view}`}
            align="bottom"
            onClick={() => step(-1)}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            kind="ghost"
            size="md"
            label={`Next ${view}`}
            align="bottom"
            onClick={() => step(1)}
          >
            <ChevronRight />
          </IconButton>
          <h2 className={styles.toolbarTitle} aria-live="polite">
            {title}
          </h2>
        </div>
        <Dropdown
          id="schedule-view"
          className={styles.viewMenu}
          titleText="View"
          hideLabel
          label="View"
          size="md"
          items={VIEW_ITEMS}
          itemToString={(item) => item?.text ?? ''}
          selectedItem={VIEW_ITEMS.find((item) => item.id === view) ?? null}
          onChange={({ selectedItem }) => selectedItem && setView(selectedItem.id)}
        />
      </header>

      <AsyncBoundary
        query={schedule}
        errorTitle="Your calendar didn’t load"
        loading={
          <div aria-busy="true" aria-label="Loading your calendar">
            <SkeletonText paragraph lineCount={10} />
          </div>
        }
        isEmpty={(data) => data.meetings.length === 0}
        empty={
          <EmptyState
            pictogram={<CalendarPictogram aria-hidden="true" />}
            title="No calls scheduled yet"
            description="When a client picks an expert’s time, the call lands here with its link to join. Times you hold for clients show here too."
          />
        }
      >
        {(data) => (
          <CalendarView
            schedule={data}
            view={view}
            focus={focus}
            days={days}
            now={now}
            sidebarOpen={sidebarOpen}
            onFocus={setFocus}
            onOpenDay={(day) => {
              setFocus(startOfDay(day));
              setView('day');
            }}
          />
        )}
      </AsyncBoundary>
    </div>
  );
}

function CalendarView({
  schedule,
  view,
  focus,
  days,
  now,
  sidebarOpen,
  onFocus,
  onOpenDay,
}: {
  schedule: Schedule;
  view: View;
  focus: Date;
  days: Date[];
  now: Date;
  sidebarOpen: boolean;
  onFocus: (day: Date) => void;
  onOpenDay: (day: Date) => void;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState<{ meeting: Meeting; anchor: HTMLElement } | null>(null);
  // Moving to another period or view puts any open preview away.
  const [openFor, setOpenFor] = useState(`${view}-${focus.getTime()}`);
  if (openFor !== `${view}-${focus.getTime()}`) {
    setOpenFor(`${view}-${focus.getTime()}`);
    setOpen(null);
  }

  const projects = useMemo(
    () =>
      Object.fromEntries(schedule.projects.map((p) => [p.id, p])) as Record<
        string,
        ScheduleProject
      >,
    [schedule.projects],
  );
  const meetings = schedule.meetings.filter((m) => !hidden.includes(m.projectId));
  const first = days[0] ?? focus;
  const last = days.at(-1) ?? focus;
  const inRange = meetings.filter((m) => {
    const day = startOfDay(new Date(m.startsAt));
    return view === 'month'
      ? day.getUTCMonth() === focus.getUTCMonth() && day.getUTCFullYear() === focus.getUTCFullYear()
      : day >= first && day <= last;
  });
  const booked = inRange.filter((m) => m.kind === 'booked').length;
  const held = inRange.length - booked;
  const period = view === 'day' ? 'today' : view === 'week' ? 'this week' : 'this month';

  const toggleProject = (id: string, on: boolean) =>
    setHidden((current) => (on ? current.filter((x) => x !== id) : [...current, id]));
  const onOpen = (meeting: Meeting, anchor: HTMLElement) =>
    setOpen((current) => (current?.meeting.id === meeting.id ? null : { meeting, anchor }));

  return (
    <div className={sidebarOpen ? styles.layout : `${styles.layout} ${styles.layoutWide}`}>
      {/* Left: jump to a date, choose which projects show. It can fold away. */}
      <aside
        id="schedule-sidebar"
        className={styles.sidebar}
        aria-label="Calendar options"
        hidden={!sidebarOpen}
      >
        <MiniMonth
          focus={focus}
          visible={view === 'month' ? [] : days}
          now={now}
          meetings={meetings}
          onPick={(day) => onFocus(startOfDay(day))}
        />
        <fieldset className={styles.filters}>
          <legend className={styles.filtersTitle}>My projects</legend>
          {schedule.projects.map((project) => (
            <Checkbox
              key={project.id}
              id={`schedule-project-${project.id}`}
              className={`${styles.filter} ${styles[project.colour]}`}
              labelText={project.name}
              checked={!hidden.includes(project.id)}
              onChange={(_, { checked }) => toggleProject(project.id, checked)}
            />
          ))}
        </fieldset>
      </aside>

      {/* Right: the calendar itself. */}
      <section className={styles.calendar} aria-label="Calendar">
        <p className={styles.summary} aria-live="polite">
          {inRange.length === 0
            ? `No calls ${period}.`
            : `${booked} booked ${booked === 1 ? 'call' : 'calls'}${held > 0 ? ` and ${held} held ${held === 1 ? 'slot' : 'slots'}` : ''} ${period}.`}
        </p>

        {/* Keyed by view, so each view opens at its own top rather than another's scroll. */}
        <div key={view} className={styles.calendarBody}>
          {view === 'month' ? (
            <MonthGrid
              month={focus}
              meetings={meetings}
              projects={projects}
              now={now}
              openId={open?.meeting.id ?? null}
              onOpen={onOpen}
              onOpenDay={onOpenDay}
            />
          ) : (
            <TimeGrid
              days={days}
              meetings={meetings}
              projects={projects}
              now={now}
              openId={open?.meeting.id ?? null}
              onOpen={onOpen}
            />
          )}
        </div>
      </section>

      {open ? (
        <MeetingPreview
          key={open.meeting.id}
          meeting={open.meeting}
          project={projects[open.meeting.projectId]}
          anchor={open.anchor}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
