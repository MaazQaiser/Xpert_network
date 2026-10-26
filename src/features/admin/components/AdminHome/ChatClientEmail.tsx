'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ActionableNotification,
  Button,
  IconButton,
  InlineLoading,
  InlineNotification,
  Tag,
  TextArea,
  TextInput,
} from '@carbon/react';
import {
  ArrowRight,
  CheckmarkFilled,
  CircleDash,
  Edit,
  Email,
  Launch,
  Send,
  TrashCan,
} from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useClientDraft, useSaveClientDraft } from '../../api/queries';
import type { TimeSlot } from '../../model/availability.schema';
import {
  clientDraftInputSchema,
  type ClientDraft,
  type ClientExpert,
} from '../../model/clientDraft.schema';
import type { Project } from '../../model/project.schema';
import { StreamedAnswer } from './StreamedAnswer';
import chat from './ChatBlocks.module.scss';
import search from './ExpertSearch.module.scss';
import styles from './ChatClientEmail.module.scss';

/** How long each step shows before its check mark. */
const STEP_MS = 1600;

/** "Wed 28 Oct · 15:00" in the client's timezone (GMT). */
function slotLabel(slot: TimeSlot): string {
  const date = new Date(slot.startsAt);
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} · ${time}`;
}

/** "Jake Morrison" → "JM", for when an expert has no portrait. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Home chat, after the experts are handed to the client: the AI drafts the client email in the
 * open, then shows it in short (who it goes to, each expert's profile, quote and free times,
 * and which of the client's questions they cover). Send to the client sends it as drafted;
 * the full editor stays one link away.
 */
export function ChatClientEmail({ project }: { project: Project }) {
  const draft = useClientDraft(project.id);
  const [step, setStep] = useState(0);
  const outcome = useRef<HTMLDivElement>(null);
  const clientFirst = draft.data?.to.name.split(' ')[0] ?? 'the client';
  const steps = [`Drafting the email to ${clientFirst}`, 'Summarising their answers'];

  // Tick the steps off; the last one waits for the draft.
  useEffect(() => {
    if (draft.isError) return;
    if (step < steps.length - 1 || (step === steps.length - 1 && draft.data)) {
      const timer = window.setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [step, steps.length, draft.data, draft.isError]);

  const isDone = step >= steps.length && draft.data !== undefined;

  useEffect(() => {
    if (!isDone) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    outcome.current?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [isDone]);

  return (
    <section className={search.round} aria-label={`Email to ${clientFirst}`}>
      <ol className={search.steps} aria-live="polite">
        {steps.map((label, index) => (
          <li key={index}>
            {index < step ? (
              <InlineLoading status="finished" description={label} />
            ) : index === step && !draft.isError ? (
              <InlineLoading status="active" description={`${label}…`} />
            ) : (
              <span className={search.stepPending}>
                <CircleDash aria-hidden={true} />
                {label}
              </span>
            )}
          </li>
        ))}
      </ol>

      {draft.isError ? (
        <ActionableNotification
          inline
          kind="error"
          lowContrast
          hideCloseButton
          hasFocus={false}
          title="The client email didn’t load."
          subtitle={toUserMessage(draft.error)}
          actionButtonLabel="Try again"
          onActionButtonClick={() => void draft.refetch()}
        />
      ) : null}

      <div ref={outcome} className={search.outcome}>
        {isDone ? <EmailSummary project={project} draft={draft.data} /> : null}
      </div>
    </section>
  );
}

function EmailSummary({ project, draft }: { project: Project; draft: ClientDraft }) {
  const save = useSaveClientDraft(project.id);
  const [error, setError] = useState<unknown>(null);
  const sentNote = useRef<HTMLParagraphElement>(null);
  const first = draft.to.name.split(' ')[0] ?? draft.to.name;
  const count = draft.experts.length;
  const isSent = draft.sentAt !== null;
  const { settings } = draft;
  // Editing happens on the card itself, like the brief canvas: subject, message, who's in it.
  const [edit, setEdit] = useState<{
    subject: string;
    intro: string;
    expertIds: string[];
  } | null>(null);
  const isEditing = edit !== null;
  const shown = edit
    ? draft.experts.filter((e) => edit.expertIds.includes(e.expertId))
    : draft.experts;
  const check = edit
    ? clientDraftInputSchema.safeParse({ action: 'save', ...edit, settings })
    : null;
  const fieldError = (field: 'subject' | 'intro') =>
    check && !check.success
      ? check.error.issues.find((i) => i.path[0] === field)?.message
      : undefined;

  const coverage = draft.questionTopics.map((topic, index) => ({
    topic,
    letters: shown.filter((e) => e.covers.includes(index)).map((e) => e.letter),
  }));
  const uncovered = coverage.filter((c) => c.letters.length === 0).length;

  // Once sent, the confirmation comes into view.
  useEffect(() => {
    if (!isSent) return;
    sentNote.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [isSent]);

  const startEditing = () =>
    setEdit({
      subject: draft.subject,
      intro: draft.intro,
      expertIds: draft.experts.map((e) => e.expertId),
    });
  const saveEdits = () => {
    if (!edit || !check?.success) return;
    save.mutate({ action: 'save', ...edit, settings }, { onSuccess: () => setEdit(null) });
  };

  const send = () => {
    setError(null);
    save.mutate(
      {
        action: 'send',
        subject: draft.subject,
        intro: draft.intro,
        expertIds: draft.experts.map((e) => e.expertId),
        settings,
      },
      { onError: setError },
    );
  };

  return (
    <div className={search.result}>
      <h4 className={search.resultTitle}>
        {isSent ? `Sent ${count} experts to ${first}` : `Send ${count} experts to ${first}`}
      </h4>
      <StreamedAnswer
        className={search.resultIntro}
        pauseMs={500}
        text={`${first} gets one email with all **${count} profiles**, a short summary of their answers and their free times. They pick ${settings.pickUpToTwo ? '1 or 2 experts' : 'an expert'} on a private page.`}
      >
        <div className={styles.stack}>
          <article className={styles.email} aria-label={`Email to ${draft.to.name}`}>
            {/* Like the brief canvas: what it is, then Edit here or open the full email. */}
            <header className={chat.canvasBar}>
              <span className={chat.canvasLabel}>
                <Email aria-hidden={true} />
                Email to client · {draft.to.name}
              </span>
              <AIExplainLabel size="xs" aria-label="Drafted email" />
              {isSent ? null : (
                <span className={chat.canvasActions}>
                  {isEditing ? (
                    <>
                      <Button kind="ghost" size="sm" onClick={() => setEdit(null)}>
                        Cancel
                      </Button>
                      <Button
                        kind="primary"
                        size="sm"
                        disabled={!check?.success || save.isPending}
                        onClick={saveEdits}
                      >
                        {save.isPending ? 'Saving…' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <IconButton
                        kind="ghost"
                        size="sm"
                        label="Edit email"
                        align="bottom"
                        onClick={startEditing}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        kind="ghost"
                        size="sm"
                        label="Open full email"
                        align="bottom-right"
                        href={routes.admin.projectStep(project.id, 'client')}
                      >
                        <Launch />
                      </IconButton>
                    </>
                  )}
                </span>
              )}
            </header>

            <div className={styles.emailBody}>
              {/* The envelope: who, and what it says. */}
              <dl className={styles.envelope}>
                <div>
                  <dt>To</dt>
                  <dd>
                    {draft.to.name} · {draft.to.email}
                  </dd>
                </div>
                {edit ? null : (
                  <div>
                    <dt>Subject</dt>
                    <dd className={styles.subject}>{draft.subject}</dd>
                  </div>
                )}
              </dl>
              {edit ? (
                <>
                  <TextInput
                    id={`email-subject-${project.id}`}
                    labelText="Subject"
                    value={edit.subject}
                    onChange={(event) => setEdit({ ...edit, subject: event.target.value })}
                    invalid={Boolean(fieldError('subject'))}
                    invalidText={fieldError('subject')}
                  />
                  <TextArea
                    id={`email-intro-${project.id}`}
                    labelText="Message"
                    rows={4}
                    maxCount={1200}
                    enableCounter
                    value={edit.intro}
                    onChange={(event) => setEdit({ ...edit, intro: event.target.value })}
                    invalid={Boolean(fieldError('intro'))}
                    invalidText={fieldError('intro')}
                  />
                </>
              ) : (
                <p className={styles.intro}>{draft.intro}</p>
              )}

              <ul className={styles.experts} aria-label="Experts in the email">
                {shown.map((expert) => (
                  <ExpertRow
                    key={expert.expertId}
                    expert={expert}
                    withQuote={settings.includeSummary}
                    onRemove={
                      edit && edit.expertIds.length > 1
                        ? () =>
                            setEdit({
                              ...edit,
                              expertIds: edit.expertIds.filter((id) => id !== expert.expertId),
                            })
                        : undefined
                    }
                  />
                ))}
              </ul>

              {/* Which of the client's questions the experts cover. */}
              <dl className={styles.facts}>
                <div>
                  <dt>Coverage</dt>
                  <dd>
                    <strong>
                      {uncovered === 0
                        ? `All ${coverage.length} of ${first}’s questions covered`
                        : `${coverage.length - uncovered} of ${coverage.length} questions covered`}
                    </strong>
                    {/* Each question as a chip, with the expert letters that cover it. */}
                    <ul className={styles.coverage} aria-label="Questions covered">
                      {coverage.map((c, index) => (
                        <li key={c.topic}>
                          <Tag type={c.letters.length > 0 ? 'cool-gray' : 'red'} size="md">
                            Q{index + 1} · {c.topic} ·{' '}
                            <strong>{c.letters.join(', ') || 'not covered'}</strong>
                          </Tag>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          </article>

          {error ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="That didn’t send."
              subtitle={toUserMessage(error)}
              onClose={() => setError(null)}
            />
          ) : null}

          {isSent ? (
            <div className={styles.sent}>
              <p ref={sentNote} className={styles.sentNote} role="status">
                <CheckmarkFilled aria-hidden={true} />
                <span>
                  Sent to <strong>{draft.to.name}</strong>. {first}’s reply with the picks is in
                  your Inbox.
                </span>
              </p>
              <Button
                as={Link}
                href={routes.admin.inboxRequest(`req_reply_${project.id}`)}
                kind="tertiary"
                size="md"
                renderIcon={ArrowRight}
              >
                View {first}’s reply
              </Button>
            </div>
          ) : (
            <div className={styles.foot}>
              <Button renderIcon={Send} disabled={isEditing || save.isPending} onClick={send}>
                {save.isPending ? 'Sending…' : `Send to ${first}`}
              </Button>
            </div>
          )}
        </div>
      </StreamedAnswer>
    </div>
  );
}

/** One expert as the email shows them, in short: who, their quote, best for and free times. */
function ExpertRow({
  expert,
  withQuote,
  onRemove,
}: {
  expert: ClientExpert;
  withQuote: boolean;
  /** While editing: take this expert out of the email. */
  onRemove?: () => void;
}) {
  return (
    <li className={styles.expert}>
      <span className={styles.avatar}>
        {expert.photoUrl ? (
          <Image src={expert.photoUrl} alt="" width={32} height={32} className={styles.photo} />
        ) : (
          initials(expert.name)
        )}
      </span>
      <div className={styles.expertBody}>
        <p className={styles.expertTitle}>
          <strong>{expert.name}</strong>
          <span className={styles.muted}>
            Expert {expert.letter} · {expert.years} yrs · {expert.country}
          </span>
        </p>
        <p className={styles.role}>{expert.role}</p>
        {withQuote ? <p className={styles.quote}>“{expert.quote}”</p> : null}
        <p className={styles.line}>
          <span className={styles.muted}>Best for</span>
          <span>{expert.bestFor.join(', ')}</span>
        </p>
        <p className={styles.line}>
          <span className={styles.muted}>Free</span>
          <span>{expert.slots.map(slotLabel).join(' · ')}</span>
        </p>
      </div>
      {onRemove ? (
        <span className={styles.remove}>
          <IconButton
            kind="ghost"
            size="sm"
            align="left"
            label={`Remove ${expert.name} from the email`}
            onClick={onRemove}
          >
            <TrashCan />
          </IconButton>
        </span>
      ) : null}
    </li>
  );
}
