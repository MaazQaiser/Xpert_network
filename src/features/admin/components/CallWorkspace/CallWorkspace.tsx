'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  InlineNotification,
  Modal,
  SkeletonText,
  Tag,
  TextInput,
  Theme,
  Toggle,
} from '@carbon/react';
import { CheckmarkFilled, CircleDash, ViewOff } from '@carbon/icons-react';
import { Headset as HeadsetPictogram } from '@carbon/pictograms-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, NotFoundState } from '@/shared/ui';
import { useCallAction, useCallSession, useProject } from '../../api/queries';
import type { CallRequest, CallSession, TranscriptLine } from '../../model/call.schema';
import type { Project } from '../../model/project.schema';
import { CallEnded } from './CallEnded';
import styles from './CallWorkspace.module.scss';

/** How often the next scripted line arrives in the prototype. */
const LINE_MS = 2600;

/** 1932 → "00:32:12". */
function clockLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

const KIND_LABELS: Record<CallRequest['kind'], string> = {
  document: 'Document request',
  remove_requirement: 'Remove requirement',
  new_requirement: 'New requirement',
};

/** PRD screen 14: the live call, with the AI listening for what the client asks for. */
export function CallWorkspace({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const session = useCallSession(projectId);
  return (
    <AsyncBoundary
      query={project}
      errorTitle="This project didn’t load"
      loading={<CallSkeleton />}
      notFound={
        <NotFoundState
          title="We couldn’t find that project"
          message="It may have been deleted, or the link is incomplete."
          backHref={routes.admin.projects}
          backLabel="Back to projects"
        />
      }
    >
      {(data) => (
        <AsyncBoundary
          query={session}
          errorTitle="The call didn’t load"
          loading={<CallSkeleton />}
          notFound={
            <div className={styles.root}>
              <Crumbs project={data} />
              <EmptyState
                pictogram={<HeadsetPictogram aria-hidden="true" />}
                title="No call is booked yet"
                description="Lock the project and book the client’s calls first. The call workspace opens from the booking."
                action={
                  <Button as={Link} href={routes.admin.projectStep(data.id, 'booking')}>
                    Go to booking
                  </Button>
                }
              />
            </div>
          }
        >
          {(result) => <LiveCall project={data} session={result} />}
        </AsyncBoundary>
      )}
    </AsyncBoundary>
  );
}

function CallSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the call" className={styles.root}>
      <SkeletonText heading width="40%" />
      <SkeletonText paragraph lineCount={10} />
    </div>
  );
}

function Crumbs({ project }: { project: Project }) {
  return (
    <Breadcrumb noTrailingSlash>
      <BreadcrumbItem>
        <Link href={routes.admin.projects}>Projects</Link>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <Link href={routes.admin.projectStep(project.id, 'brief')}>{project.id}</Link>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <Link href={routes.admin.projectStep(project.id, 'booking')}>Booking</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>Live call</BreadcrumbItem>
    </Breadcrumb>
  );
}

function LiveCall({ project, session }: { project: Project; session: CallSession }) {
  const action = useCallAction(project.id);
  const isEnded = session.endedAt !== null;
  // The prototype plays the scripted transcript: one line every few seconds, the clock following.
  const [shown, setShown] = useState(isEnded ? session.lines.length : 1);
  const [clock, setClock] = useState(session.duration ?? session.lines[0]?.at ?? session.startAt);
  const [isMuted, setIsMuted] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  // The "call ended" moment shows right after ending, not when an ended call is reopened.
  const [showEnded, setShowEnded] = useState(false);
  const afterRef = useRef<HTMLHeadingElement>(null);
  const [note, setNote] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  const visible = session.lines.slice(0, shown);
  const visibleIds = new Set(visible.map((l) => l.id));
  const requests = session.requests.filter((r) => visibleIds.has(r.lineId));
  const isLive = !isEnded;
  const isTalking = isLive && shown >= session.lines.length && session.speakingAfter !== null;

  useEffect(() => {
    if (!isLive) return;
    const lines = window.setInterval(() => {
      setShown((n) => {
        const next = Math.min(n + 1, session.lines.length);
        const line = session.lines[next - 1];
        if (line) setClock((c) => Math.max(c, line.at));
        return next;
      });
    }, LINE_MS);
    const seconds = window.setInterval(() => setClock((c) => c + 1), 1000);
    return () => {
      window.clearInterval(lines);
      window.clearInterval(seconds);
    };
  }, [isLive, session.lines]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [autoScroll, shown, session.notes.length]);

  // Questions answered so far; a dropped question no longer counts.
  const removed = new Set(
    session.requests
      .filter((r) => r.kind === 'remove_requirement' && r.status === 'accepted')
      .map((r) => r.questionIndex),
  );
  const covered = new Set([...session.coveredBefore, ...visible.flatMap((l) => l.covers)]);
  const active = session.questionTopics.map((_, i) => i).filter((i) => !removed.has(i));
  const coveredCount = active.filter((i) => covered.has(i)).length;
  const askNext = isLive ? active.find((i) => !covered.has(i)) : undefined;

  const first = session.client.name.split(' ')[0] ?? session.client.name;
  const expertFirst = session.expert.name.split(' ')[0] ?? session.expert.name;
  const docs = session.requests.find((r) => r.kind === 'document' && r.status === 'accepted');
  const deliverables = [
    'Call summary',
    'Full transcript',
    ...(docs ? docs.documents.filter((d) => d !== 'Call summary') : []),
    ...(session.version !== 'v1.0' ? [`Updated project file ${session.version}`] : []),
  ];

  const resolve = (requestId: string, status: 'accepted' | 'dismissed') =>
    action.mutate({ action: 'resolve', requestId, status });
  const addNote = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    action.mutate({ action: 'note', at: clock, text: note }, { onSuccess: () => setNote('') });
  };

  // Notes sit in the transcript at the moment they were written.
  const rows: (
    { kind: 'line'; line: TranscriptLine } | { kind: 'note'; id: string; at: number; text: string }
  )[] = [
    ...visible.map((line) => ({ kind: 'line' as const, line })),
    ...session.notes.map((n) => ({ kind: 'note' as const, ...n })),
  ].sort((a, b) => (a.kind === 'line' ? a.line.at : a.at) - (b.kind === 'line' ? b.line.at : b.at));

  const speakerName = (speaker: TranscriptLine['speaker']) =>
    speaker === 'client'
      ? first
      : speaker === 'expert'
        ? `${expertFirst} (${session.expert.letter})`
        : 'You';

  return (
    <div className={styles.root}>
      <Crumbs project={project} />

      {/* The call bar is a dark zone, like a video-call control strip. */}
      <Theme theme="g100" className={styles.bar}>
        <div className={styles.barInfo}>
          {isLive ? (
            <span className={styles.live}>
              <span className={styles.liveDot} aria-hidden="true" />
              Live
            </span>
          ) : (
            <Tag type="gray" size="sm">
              Ended
            </Tag>
          )}
          <span className={styles.clock} role="timer" aria-label="Call time">
            {clockLabel(clock)}
          </span>
          <span className={styles.participants}>
            {project.id} · {session.client.name} (client) · {session.expert.name} (Expert{' '}
            {session.expert.letter}) · You (moderator)
          </span>
        </div>
        <div className={styles.barActions}>
          {isLive ? (
            <>
              <Button
                kind="tertiary"
                size="md"
                aria-pressed={isMuted}
                onClick={() => setIsMuted((m) => !m)}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              <Button kind="danger" size="md" onClick={() => setIsEnding(true)}>
                End call
              </Button>
            </>
          ) : (
            <Button
              as={Link}
              href={routes.admin.projectStep(project.id, 'booking')}
              kind="tertiary"
              size="md"
            >
              Back to booking
            </Button>
          )}
        </div>
      </Theme>

      {action.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t go through."
          subtitle={toUserMessage(action.error)}
          onClose={() => action.reset()}
        />
      ) : null}

      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="transcript-title">
          <div className={styles.cardHeader}>
            <h2 id="transcript-title" className={styles.cardTitle}>
              {isLive ? 'Live transcript' : 'Transcript'}
            </h2>
            <Toggle
              id="auto-scroll"
              size="sm"
              labelText="Auto-scroll"
              hideLabel
              labelA="Auto-scroll off"
              labelB="Auto-scroll on"
              toggled={autoScroll}
              onToggle={setAutoScroll}
              className={styles.headerEnd}
            />
          </div>
          <div
            ref={scroller}
            className={styles.transcript}
            role="log"
            aria-live="polite"
            aria-label="Transcript"
            tabIndex={0}
          >
            {rows.map((row) =>
              row.kind === 'note' ? (
                <div key={row.id} className={styles.noteRow}>
                  <span className={styles.speaker}>
                    <ViewOff aria-label="Private note, only you see this" /> You
                  </span>
                  <p>{row.text}</p>
                </div>
              ) : (
                <div
                  key={row.line.id}
                  className={row.line.highlight ? styles.requestRow : styles.lineRow}
                >
                  <span className={styles.speaker}>{speakerName(row.line.speaker)}</span>
                  <p>
                    <LineText line={row.line} />
                  </p>
                </div>
              ),
            )}
            {isTalking && session.speakingAfter ? (
              <div className={styles.lineRow}>
                <span className={styles.speaker}>{speakerName(session.speakingAfter)}</span>
                <p className={styles.speaking}>
                  speaking
                  <span className={styles.dots} aria-hidden="true" />
                </p>
              </div>
            ) : null}
          </div>
          <form className={styles.noteForm} onSubmit={addNote}>
            <TextInput
              id="private-note"
              labelText="Private note"
              hideLabel
              placeholder="Add a private note (only you see this)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              type="submit"
              kind="tertiary"
              size="md"
              disabled={!note.trim() || action.isPending}
            >
              Add
            </Button>
          </form>
        </section>

        <div className={styles.column}>
          <section className={styles.card} aria-labelledby="requests-title">
            <div className={styles.cardHeader}>
              <AIExplainLabel aria-label="Client requests" />
              <h2 id="requests-title" className={styles.cardTitle}>
                Client requests detected · {requests.length}
              </h2>
            </div>
            {requests.length === 0 ? (
              <p className={styles.cardText}>
                Nothing yet. The AI listens for anything {first} asks for and lines it up here.
              </p>
            ) : (
              <ul className={styles.requests}>
                {[...requests].reverse().map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    session={session}
                    projectId={project.id}
                    isBusy={action.isPending}
                    onResolve={resolve}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby="questions-title">
            <div className={styles.cardHeader}>
              <AIExplainLabel aria-label="Questions covered" />
              <h2 id="questions-title" className={styles.cardTitle}>
                Questions covered
              </h2>
              <span className={styles.count}>
                {coveredCount} / {active.length}
              </span>
            </div>
            <ul className={styles.questions}>
              {session.questionTopics.map((topic, i) => {
                const isRemoved = removed.has(i);
                const isCovered = covered.has(i) && !isRemoved;
                return (
                  <li key={topic} className={isRemoved ? styles.removed : undefined}>
                    {isCovered ? (
                      <CheckmarkFilled aria-label="Covered" className={styles.covered} />
                    ) : (
                      <CircleDash aria-label={isRemoved ? 'Removed' : 'Not covered yet'} />
                    )}
                    <span className={isRemoved ? styles.struck : undefined}>
                      Q{i + 1} {topic}
                    </span>
                    {isRemoved ? <span className={styles.noteMeta}>removed by client</span> : null}
                    {askNext === i ? (
                      <Tag type="cool-gray" size="sm">
                        Suggest asking next
                      </Tag>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="after-title">
            <h2 id="after-title" ref={afterRef} tabIndex={-1} className={styles.cardTitle}>
              After the call
            </h2>
            <p className={styles.cardText}>
              {isLive
                ? 'Drafted from the transcript once you end the call.'
                : `Ready to send to ${first}.`}
            </p>
            <div className={styles.deliverables}>
              {deliverables.map((d) => (
                <Tag key={d} type="cool-gray" size="md">
                  {d}
                </Tag>
              ))}
            </div>
            <div className={styles.afterActions}>
              {session.sentToClientAt ? (
                <p className={styles.done}>
                  <CheckmarkFilled aria-hidden={true} /> Sent to {first} at{' '}
                  {formatTime(session.sentToClientAt)}
                </p>
              ) : (
                <Button
                  size="md"
                  disabled={isLive || action.isPending}
                  onClick={() => action.mutate({ action: 'send_all' })}
                >
                  Send all to client
                </Button>
              )}
              {session.expertPaidAt ? (
                <p className={styles.done}>
                  <CheckmarkFilled aria-hidden={true} /> {expertFirst} marked paid
                </p>
              ) : (
                <Button
                  kind="tertiary"
                  size="md"
                  disabled={isLive || action.isPending}
                  onClick={() => action.mutate({ action: 'mark_paid' })}
                >
                  Mark expert paid
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      {showEnded && session.endedAt ? (
        <CallEnded
          session={session}
          onReview={() => {
            setShowEnded(false);
            // Back on the call page, land on what to do next.
            window.requestAnimationFrame(() => {
              afterRef.current?.scrollIntoView({ block: 'center' });
              afterRef.current?.focus();
            });
          }}
        />
      ) : null}

      {isEnding
        ? createPortal(
            <Modal
              open
              danger
              modalHeading="End the call for everyone?"
              primaryButtonText="End call"
              secondaryButtonText="Keep talking"
              onRequestClose={() => setIsEnding(false)}
              onRequestSubmit={() =>
                action.mutate(
                  { action: 'end', duration: clock },
                  {
                    onSuccess: () => setShowEnded(true),
                    onSettled: () => setIsEnding(false),
                  },
                )
              }
            >
              <p className={styles.modalText}>
                {first} and {expertFirst} are disconnected. The transcript is saved, and the AI
                drafts the documents for {first}.
              </p>
            </Modal>,
            document.body,
          )
        : null}
    </div>
  );
}

/** The line with the client's request underlined. */
function LineText({ line }: { line: TranscriptLine }) {
  if (!line.highlight) return <>{line.text}</>;
  const at = line.text.indexOf(line.highlight);
  if (at < 0) return <>{line.text}</>;
  return (
    <>
      {line.text.slice(0, at)}
      <span className={styles.mark}>{line.highlight}</span>
      {line.text.slice(at + line.highlight.length)}
    </>
  );
}

function RequestCard({
  request,
  session,
  projectId,
  isBusy,
  onResolve,
}: {
  request: CallRequest;
  session: CallSession;
  projectId: string;
  isBusy: boolean;
  onResolve: (requestId: string, status: 'accepted' | 'dismissed') => void;
}) {
  const isOpen = request.status === 'open';
  const topic =
    request.questionIndex !== null ? session.questionTopics[request.questionIndex] : undefined;
  return (
    <li className={styles.request}>
      <div className={styles.requestHead}>
        <Tag type="cool-gray" size="sm">
          {KIND_LABELS[request.kind]}
        </Tag>
        <span className={styles.noteMeta}>at {clockLabel(request.at)}</span>
      </div>

      {request.kind === 'remove_requirement' ? (
        <>
          <p className={styles.requestText}>Client asked to drop:</p>
          <p className={styles.struck}>
            Q{(request.questionIndex ?? 0) + 1} · {topic}
          </p>
          <p className={styles.noteMeta}>Also updates the project file to v1.1.</p>
        </>
      ) : (
        <p className={styles.requestText}>“{request.quote}”</p>
      )}
      {request.kind === 'document' ? (
        <div className={styles.docs}>
          {request.documents.map((d) => (
            <Tag key={d} type="gray" size="sm">
              {d}
            </Tag>
          ))}
        </div>
      ) : null}
      {request.kind === 'new_requirement' ? (
        <p className={styles.noteMeta}>
          AI found {request.matches} matching experts. {request.matchNote}
        </p>
      ) : null}

      {isOpen ? (
        <div className={styles.requestActions}>
          {request.kind === 'remove_requirement' ? (
            <Button
              kind="danger--tertiary"
              size="sm"
              disabled={isBusy}
              onClick={() => onResolve(request.id, 'accepted')}
            >
              Confirm delete
            </Button>
          ) : (
            <Button size="sm" disabled={isBusy} onClick={() => onResolve(request.id, 'accepted')}>
              {request.kind === 'document' ? 'Generate after call' : 'Save matches'}
            </Button>
          )}
          <Button
            kind="ghost"
            size="sm"
            disabled={isBusy}
            onClick={() => onResolve(request.id, 'dismissed')}
          >
            {request.kind === 'remove_requirement'
              ? 'Keep it'
              : request.kind === 'document'
                ? 'Dismiss'
                : 'Later'}
          </Button>
        </div>
      ) : (
        <p className={styles.resolved}>
          {request.status === 'accepted' ? <CheckmarkFilled aria-hidden={true} /> : null}
          {resolvedLabel(request)}
          {request.kind === 'new_requirement' && request.status === 'accepted' ? (
            <Link href={routes.admin.projectStep(projectId, 'match')} className={styles.inlineLink}>
              Review matches
            </Link>
          ) : null}
        </p>
      )}
    </li>
  );
}

function resolvedLabel(request: CallRequest): string {
  if (request.kind === 'document') {
    return request.status === 'accepted' ? 'Will be drafted after the call' : 'Dismissed';
  }
  if (request.kind === 'remove_requirement') {
    return request.status === 'accepted' ? 'Removed · project file v1.1' : 'Kept in the project';
  }
  return request.status === 'accepted' ? 'Matches saved for after the call' : 'Left for later';
}
