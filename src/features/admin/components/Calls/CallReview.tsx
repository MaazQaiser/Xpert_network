'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Checkbox,
  Search,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react';
import {
  ArrowLeft,
  Checkmark,
  Copy,
  CheckmarkFilled,
  CircleDash,
  Video,
} from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, NotFoundState } from '@/shared/ui';
import { useCallRecord } from '../../api/queries';
import type { CallDetail, CallSpeaker } from '../../model/calls.schema';
import { CallReport } from './CallReport';
import { RecordingPlayer, TalkTime } from './RecordingPlayer';
import { Avatar, clock, longDateOf, minutesBetween, timeOf } from './callParts';
import styles from './Calls.module.scss';

/**
 * One call's review, after Fathom: the recording and its key moments on the left; on the
 * right, the AI's summary, the transcript (click a line to jump there) and the follow-ups the
 * call produced, with the client email ready to send.
 */
export function CallReview({ callId }: { callId: string }) {
  const call = useCallRecord(callId);
  return (
    <div className={styles.root}>
      <AsyncBoundary
        query={call}
        errorTitle="This call didn’t load"
        notFound={
          <NotFoundState
            title="Call not found"
            message="It may have been removed. Your other calls are still on the Calls page."
            backHref={routes.admin.calls}
            backLabel="Back to Calls"
          />
        }
        loading={
          <div aria-busy="true" aria-label="Loading the call">
            <SkeletonText heading width="40%" />
            <SkeletonText paragraph lineCount={10} />
          </div>
        }
      >
        {(data) => <Review call={data} />}
      </AsyncBoundary>
    </div>
  );
}

function Review({ call }: { call: CallDetail }) {
  const length = minutesBetween(call.startsAt, call.endsAt) * 60;
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const seek = useCallback((seconds: number) => setPosition(seconds), []);
  const jump = (seconds: number) => {
    setPosition(seconds);
    setPlaying(call.status === 'completed');
  };
  const isLive = call.status === 'live';
  // Who is speaking: live, whoever spoke last; on the recording, the last line before the playhead.
  const current = isLive
    ? (call.transcript.at(-1) ?? null)
    : ([...call.transcript].reverse().find((line) => line.at <= position) ?? null);
  const title = `${call.expert.name} × ${call.client.detail}`;

  return (
    <>
      <header className={styles.reviewHead}>
        <Link href={routes.admin.calls} className={styles.back}>
          <ArrowLeft aria-hidden={true} />
          Calls
        </Link>
        <div className={styles.reviewTitleRow}>
          <div>
            <h1 className={styles.reviewTitle}>{title}</h1>
            <p className={styles.meta}>
              <span>
                {longDateOf(call.startsAt)} · {timeOf(call.startsAt)} ·{' '}
                {minutesBetween(call.startsAt, call.endsAt)} min
              </span>
              <span className={styles.metaProject}>
                <span className={`${styles.dot} ${styles[call.colour]}`} aria-hidden="true" />
                <Link href={routes.admin.project(call.projectId)} className={styles.metaLink}>
                  {call.projectName}
                </Link>
              </span>
            </p>
          </div>
          <div className={styles.reviewActions}>
            {call.status === 'live' ? (
              <Tag type="red" size="md">
                Live now
              </Tag>
            ) : call.status === 'upcoming' ? (
              <Tag type="blue" size="md">
                Upcoming
              </Tag>
            ) : null}
            {call.status !== 'completed' ? (
              <Button
                size="md"
                href={call.meetUrl}
                target="_blank"
                rel="noreferrer"
                renderIcon={Video}
              >
                Join with Google Meet
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {call.status === 'upcoming' ? (
        <UpcomingPanel call={call} />
      ) : (
        <div className={styles.reviewStack}>
          <RecordingPlayer
            call={call}
            length={length}
            position={position}
            playing={playing}
            speaker={current?.speaker ?? null}
            onSeek={seek}
            onPlaying={setPlaying}
          />
          {isLive ? null : <TalkTime call={call} length={length} />}
          <section className={styles.notes} aria-label="Call notes">
            {/* Live, the transcript leads: it's what is happening now. */}
            <Tabs defaultSelectedIndex={isLive ? 1 : 0}>
              <TabList aria-label="Call notes" className={styles.tabs}>
                <Tab>Summary</Tab>
                <Tab>Transcript</Tab>
                <Tab>Report</Tab>
              </TabList>
              <TabPanels>
                <TabPanel className={styles.notesPanel}>
                  <Summary call={call} position={position} onJump={jump} />
                </TabPanel>
                <TabPanel className={styles.notesPanel}>
                  <Transcript call={call} activeId={current?.id ?? null} onJump={jump} />
                </TabPanel>
                <TabPanel className={styles.notesPanel}>
                  <CallReport call={call} onJump={jump} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </section>
        </div>
      )}
    </>
  );
}

/** Before the call: who's on it, the briefing, and Join. */
function UpcomingPanel({ call }: { call: CallDetail }) {
  return (
    <section className={styles.upcoming} aria-label="Before the call">
      <h2 className={styles.sectionTitle}>Who’s on the call</h2>
      <ul className={styles.people}>
        {[
          { person: call.client, role: 'Client' },
          { person: call.expert, role: 'Expert' },
        ].map(({ person, role }) => (
          <li key={role} className={styles.person}>
            <Avatar name={person.name} photoUrl={person.photoUrl} size={48} />
            <span>
              <span className={styles.personName}>{person.name}</span>
              <span className={styles.meta}>
                {role} · {person.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.upcomingNote}>
        {call.briefingSent
          ? `The briefing pack went to ${call.expert.name.split(' ')[0]}. `
          : 'The briefing pack goes to the expert 24 hours before. '}
        Once the call starts, its live notes show here; afterwards, the summary, transcript and
        follow-ups.
      </p>
      <h2 className={styles.sectionTitle}>The client’s questions</h2>
      <ol className={styles.questionList}>
        {call.questions.map((q) => (
          <li key={q.text}>{q.text}</li>
        ))}
      </ol>
    </section>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>;
}

function TimeLink({ at, onJump }: { at: number; onJump: (at: number) => void }) {
  return (
    <button type="button" className={styles.timeLink} onClick={() => onJump(at)}>
      {clock(at)}
    </button>
  );
}

/** The AI's read of the call: purpose, takeaways, the client's questions, next steps. */
function Summary({
  call,
  position,
  onJump,
}: {
  call: CallDetail;
  position: number;
  onJump: (at: number) => void;
}) {
  const [done, setDone] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = [
      'Meeting purpose',
      call.purpose,
      '',
      'Key takeaways',
      ...call.takeaways.map((t) => `• ${t}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const covered = call.questions.filter((q) => q.covered).length;
  return (
    <div className={styles.summary}>
      <div className={styles.summaryBar}>
        <p className={styles.aiLine}>
          <AIExplainLabel size="xs" aria-label="AI summary" />
          {call.status === 'live'
            ? 'Writing as the call goes. The full summary is ready when it ends.'
            : 'Written by the AI from the transcript. Check it before you send it on.'}
        </p>
        {call.status === 'completed' ? (
          <Button
            kind="tertiary"
            size="sm"
            renderIcon={copied ? Checkmark : Copy}
            onClick={() => void copy()}
          >
            {copied ? 'Copied' : 'Copy summary'}
          </Button>
        ) : null}
      </div>

      <section>
        <h2 className={styles.summaryHeading}>Meeting purpose</h2>
        <p className={styles.body01}>{call.purpose}</p>
      </section>

      {call.takeaways.length > 0 ? (
        <section>
          <h2 className={styles.summaryHeading}>Key takeaways</h2>
          <ul className={styles.bullets}>
            {call.takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {call.moments.length > 0 ? (
        <section>
          <SectionHead>Key moments</SectionHead>
          <ol className={styles.moments}>
            {call.moments.map((moment, i) => {
              const next = call.moments[i + 1]?.at ?? Infinity;
              const isHere =
                call.status === 'completed' && position >= moment.at && position < next;
              return (
                <li key={moment.at}>
                  <button
                    type="button"
                    className={isHere ? `${styles.moment} ${styles.momentHere}` : styles.moment}
                    disabled={call.status !== 'completed'}
                    onClick={() => onJump(moment.at)}
                  >
                    <span className={styles.momentAt}>{clock(moment.at)}</span>
                    {moment.title}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section>
        <SectionHead>
          The client’s questions{' '}
          <span className={styles.count}>
            {covered} of {call.questions.length} covered
          </span>
        </SectionHead>
        <ul className={styles.checks}>
          {call.questions.map((q) => (
            <li key={q.text} className={q.covered ? styles.checkDone : styles.checkOpen}>
              {q.covered ? (
                <CheckmarkFilled aria-label="Covered" />
              ) : (
                <CircleDash aria-label="Not covered yet" />
              )}
              {q.text}
            </li>
          ))}
        </ul>
      </section>

      {call.nextSteps.length > 0 ? (
        <section>
          <SectionHead>Next steps</SectionHead>
          <ul className={styles.steps}>
            {call.nextSteps.map((step) => (
              <li key={step.id} className={styles.step}>
                <Checkbox
                  id={`step-${step.id}`}
                  labelText={step.text}
                  checked={done.includes(step.id)}
                  onChange={(_, { checked }) =>
                    setDone((d) => (checked ? [...d, step.id] : d.filter((x) => x !== step.id)))
                  }
                />
                <span className={styles.stepMeta}>
                  {step.owner} · <TimeLink at={step.at} onJump={onJump} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const SPEAKER: Record<CallSpeaker, (call: CallDetail) => { name: string; photo: string | null }> = {
  client: (c) => ({ name: c.client.name, photo: c.client.photoUrl }),
  expert: (c) => ({ name: c.expert.name, photo: c.expert.photoUrl }),
  pm: (c) => ({ name: c.moderator.name, photo: c.moderator.photoUrl }),
};

/**
 * Every line, with who said it and when; click the time to jump there. Searchable. While the
 * call is live, lines arrive as they're spoken: the newest fades in, the panel follows it
 * (unless you've scrolled up to read), and a listening row sits at the end.
 */
function Transcript({
  call,
  activeId,
  onJump,
}: {
  call: CallDetail;
  activeId: string | null;
  onJump: (at: number) => void;
}) {
  const [query, setQuery] = useState('');
  const isLive = call.status === 'live';
  const q = query.trim().toLowerCase();
  const lines = call.transcript.filter((line) => !q || line.text.toLowerCase().includes(q));
  const newestId = call.transcript.at(-1)?.id ?? null;
  const listRef = useRef<HTMLOListElement>(null);

  // Follow the conversation: when a line arrives, keep the end in view if the reader was
  // already near it. Someone scrolled up to reread stays where they are.
  useEffect(() => {
    if (!isLive || q) return;
    const panel = listRef.current;
    if (!panel) return;
    const fromEnd = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    if (fromEnd < 240) panel.scrollTop = panel.scrollHeight;
  }, [newestId, isLive, q]);

  return (
    <div className={styles.transcript}>
      {isLive ? (
        <p className={styles.liveTranscript}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live transcript
          <span className={styles.liveTranscriptNote}>Lines appear as they’re spoken</span>
        </p>
      ) : null}
      <Search
        size="sm"
        labelText="Search the transcript"
        placeholder="Search the transcript"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {lines.length === 0 ? (
        <p className={styles.none}>
          {q ? 'Nothing in the transcript matches.' : 'Nothing said yet.'}
        </p>
      ) : (
        <ol
          ref={listRef}
          className={styles.lines}
          aria-label="Transcript"
          {...(isLive
            ? { 'aria-live': 'polite' as const, 'aria-relevant': 'additions' as const }
            : {})}
        >
          {lines.map((line) => {
            const who = SPEAKER[line.speaker](call);
            const isNewest = isLive && line.id === newestId;
            return (
              <li
                key={line.id}
                className={[
                  styles.line,
                  line.id === activeId && !isLive ? styles.lineActive : null,
                  isNewest ? styles.lineNew : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Avatar name={who.name} photoUrl={who.photo} size={24} />
                <div>
                  <p className={styles.lineHead}>
                    <span className={styles.lineName}>{who.name}</span>
                    {/* Live, there's no recording to jump into yet: the time is just a time. */}
                    {isLive ? (
                      <span className={styles.lineTime}>{clock(line.at)}</span>
                    ) : (
                      <TimeLink at={line.at} onJump={onJump} />
                    )}
                    {isNewest ? <span className={styles.lineNow}>Just now</span> : null}
                  </p>
                  <p className={styles.body01}>{line.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {isLive && !q ? (
        <p className={styles.listening}>
          <span className={styles.bars} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Listening…
        </p>
      ) : null}
    </div>
  );
}
