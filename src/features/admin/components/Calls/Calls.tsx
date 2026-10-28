'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Button,
  Search,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react';
import { ArrowRight, Video } from '@carbon/icons-react';
import { VideoChat } from '@carbon/pictograms-react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState } from '@/shared/ui';
import { useCalls } from '../../api/queries';
import type { CallRecord } from '../../model/calls.schema';
import { Avatar, dayLabel, minutesBetween, timeOf } from './callParts';
import styles from './Calls.module.scss';

/**
 * Calls (F16): every expert call across projects, after Fathom. A live call sits on top with
 * Join; below, Upcoming (time, people, briefing, Join) and Completed (a recording tile, how
 * much the call covered, and whether its follow-ups went out). Each call opens its review.
 */
export function Calls() {
  const calls = useCalls();
  const [query, setQuery] = useState('');
  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <h1 className={styles.pageTitle}>Calls</h1>
        <Search
          size="md"
          labelText="Search calls"
          placeholder="Search by expert, client or project"
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </header>
      <AsyncBoundary
        query={calls}
        errorTitle="Your calls didn’t load"
        loading={
          <div aria-busy="true" aria-label="Loading your calls">
            <SkeletonText paragraph lineCount={8} />
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            pictogram={<VideoChat aria-hidden="true" />}
            title="No calls yet"
            description="When a client books an expert, the call shows here. After it ends, its summary, transcript and follow-ups land here too."
          />
        }
      >
        {(data) => <CallsView calls={data} query={query} />}
      </AsyncBoundary>
    </div>
  );
}

function matches(call: CallRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [call.expert.name, call.client.name, call.client.detail, call.projectName]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/** Calls grouped under day headings, in the order given. */
function byDay(calls: CallRecord[], now: Date): [string, CallRecord[]][] {
  const groups = new Map<string, CallRecord[]>();
  for (const call of calls) {
    const label = dayLabel(call.startsAt, now);
    groups.set(label, [...(groups.get(label) ?? []), call]);
  }
  return [...groups.entries()];
}

function CallsView({ calls, query }: { calls: CallRecord[]; query: string }) {
  const [now] = useState(() => new Date());
  const shown = calls.filter((c) => matches(c, query));
  const live = shown.filter((c) => c.status === 'live');
  const upcoming = shown
    .filter((c) => c.status === 'upcoming')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const completed = shown
    .filter((c) => c.status === 'completed')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const toSend = completed.filter((c) => c.followUpsOpen > 0).length;
  const upcomingGroups = byDay(upcoming, now);
  const completedGroups = byDay(completed, now);

  return (
    <div className={styles.body}>
      {live.map((call) => (
        <LiveCard key={call.id} call={call} now={now} />
      ))}

      <section className={styles.panel} aria-label="Calls">
        <Tabs defaultSelectedIndex={toSend > 0 ? 1 : 0}>
          <TabList aria-label="Calls" className={styles.tabs}>
            <Tab>Upcoming ({upcoming.length})</Tab>
            <Tab>
              Completed ({completed.length})
              {toSend > 0 ? (
                <span
                  className={styles.tabDot}
                  aria-label={`${toSend} ${toSend === 1 ? 'report' : 'reports'} to send`}
                />
              ) : null}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel className={styles.tabPanel}>
              {upcomingGroups.length === 0 ? (
                <p className={styles.none}>
                  {query ? 'No upcoming calls match your search.' : 'No upcoming calls.'}
                </p>
              ) : (
                upcomingGroups.map(([label, group]) => (
                  <DayGroup key={label} label={label}>
                    {group.map((call) => (
                      <UpcomingRow key={call.id} call={call} />
                    ))}
                  </DayGroup>
                ))
              )}
            </TabPanel>
            <TabPanel className={styles.tabPanel}>
              {completedGroups.length === 0 ? (
                <p className={styles.none}>
                  {query ? 'No completed calls match your search.' : 'No completed calls yet.'}
                </p>
              ) : (
                completedGroups.map(([label, group]) => (
                  <DayGroup key={label} label={label}>
                    {group.map((call) => (
                      <CompletedRow key={call.id} call={call} />
                    ))}
                  </DayGroup>
                ))
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>
    </div>
  );
}

function DayGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className={styles.day} aria-label={label}>
      <h2 className={styles.dayTitle}>{label}</h2>
      <ul className={styles.rows}>{children}</ul>
    </section>
  );
}

function title(call: CallRecord): string {
  return `${call.expert.name} × ${call.client.detail}`;
}

/** The call happening now: who, how long in, how far through the questions, and Join. */
function LiveCard({ call, now }: { call: CallRecord; now: Date }) {
  const minutesIn = Math.max(
    1,
    Math.round((now.getTime() - new Date(call.startsAt).getTime()) / 60_000),
  );
  return (
    <article
      className={`${styles.live} ${styles[call.colour]}`}
      aria-label={`Live now: ${title(call)}`}
    >
      <div className={styles.liveFaces} aria-hidden="true">
        <Avatar name={call.client.name} photoUrl={call.client.photoUrl} size={48} />
        <Avatar name={call.expert.name} photoUrl={call.expert.photoUrl} size={48} />
      </div>
      <div className={styles.liveText}>
        <p className={styles.liveBadge}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live now · {minutesIn} min in
        </p>
        <h2 className={styles.liveTitle}>{title(call)}</h2>
        <p className={styles.meta}>
          {call.projectName} · {call.questionsCovered} of {call.questionCount} questions covered so
          far
        </p>
      </div>
      <div className={styles.liveActions}>
        <Button as={Link} size="md" href={routes.admin.callRoom(call.id)} renderIcon={Video}>
          Join call
        </Button>
        <Button
          as={Link}
          href={routes.admin.callReview(call.id)}
          kind="tertiary"
          size="md"
          className={styles.evenButton}
        >
          Follow live notes
        </Button>
      </div>
    </article>
  );
}

function UpcomingRow({ call }: { call: CallRecord }) {
  return (
    <li className={styles.row}>
      <div className={styles.when}>
        <span className={styles.whenTime}>{timeOf(call.startsAt)}</span>
        <span className={styles.whenLength}>{minutesBetween(call.startsAt, call.endsAt)} min</span>
      </div>
      <span className={`${styles.stripe} ${styles[call.colour]}`} aria-hidden="true" />
      <div className={styles.faces} aria-hidden="true">
        <Avatar name={call.client.name} photoUrl={call.client.photoUrl} />
        <Avatar name={call.expert.name} photoUrl={call.expert.photoUrl} />
      </div>
      <Link href={routes.admin.callReview(call.id)} className={styles.rowMain}>
        <span className={styles.rowTitle}>{title(call)}</span>
        <span className={styles.meta}>
          {call.client.name} · {call.projectName}
        </span>
      </Link>
      <div className={styles.rowEnd}>
        {call.briefingSent ? (
          <Tag type="green" size="sm">
            Briefing sent
          </Tag>
        ) : (
          <Tag type="gray" size="sm">
            Briefing 24h before
          </Tag>
        )}
        <Button
          as={Link}
          kind="ghost"
          size="sm"
          href={routes.admin.callRoom(call.id)}
          renderIcon={Video}
          aria-label={`Join ${title(call)}`}
        >
          Join
        </Button>
      </div>
    </li>
  );
}

function CompletedRow({ call }: { call: CallRecord }) {
  const minutes = minutesBetween(call.startsAt, call.endsAt);
  return (
    <li className={styles.row}>
      {/* The recording's tile, as in Fathom: a frame from the call, with its length. */}
      <Link
        href={routes.admin.callReview(call.id)}
        className={`${styles.thumb} ${styles[call.colour]}`}
        aria-label={`Open the recording of ${title(call)}`}
        tabIndex={-1}
      >
        {call.expert.videoUrl ? (
          <Image
            src={call.expert.videoUrl.replace(/\.mp4$/, '.jpg')}
            alt=""
            fill
            sizes="104px"
            className={styles.thumbFrame}
          />
        ) : (
          <>
            <Avatar name={call.client.name} photoUrl={call.client.photoUrl} />
            <Avatar name={call.expert.name} photoUrl={call.expert.photoUrl} />
          </>
        )}
        <span className={styles.thumbLength}>{minutes}:00</span>
      </Link>
      <Link href={routes.admin.callReview(call.id)} className={styles.rowMain}>
        <span className={styles.rowTitle}>{title(call)}</span>
        <span className={styles.meta}>
          {timeOf(call.startsAt)} · {minutes} min · {call.projectName}
        </span>
      </Link>
      <div className={styles.rowEnd}>
        <Tag type="gray" size="sm">
          {call.questionsCovered} of {call.questionCount} questions
        </Tag>
        {call.followUpsOpen > 0 ? (
          <Tag type="red" size="sm">
            Report to send
          </Tag>
        ) : (
          <Tag type="green" size="sm">
            Report sent
          </Tag>
        )}
        <ArrowRight className={styles.rowArrow} aria-hidden={true} />
      </div>
    </li>
  );
}
