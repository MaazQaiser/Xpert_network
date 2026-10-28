'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ActionableNotification,
  Button,
  IconButton,
  InlineLoading,
  InlineNotification,
  TextArea,
  TextInput,
} from '@carbon/react';
import { CheckmarkFilled, CircleDash, Edit, Email, Launch, TrashCan } from '@carbon/icons-react';
import { useSession, type User } from '@/features/auth';
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
import { senderPhoto } from '../inboxDisplay';
import { FlowToast } from './AnswerToast';
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
 * open, then shows it as an email: who it is from, who it goes to, each expert's profile,
 * and the sender's sign-off. Send to the client sends it as drafted;
 * the full editor stays one link away.
 */
export function ChatClientEmail({
  project,
  onHome,
}: {
  project: Project;
  /** Returns to the home summary once the email has gone. */
  onHome?: () => void;
}) {
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
      {/* The steps make way for the answer once it's in. */}
      {isDone ? null : (
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
      )}

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
        {isDone ? <EmailSummary project={project} draft={draft.data} onHome={onHome} /> : null}
      </div>
    </section>
  );
}

function EmailSummary({
  project,
  draft,
  onHome,
}: {
  project: Project;
  draft: ClientDraft;
  onHome?: () => void;
}) {
  const session = useSession();
  const sender = session.data?.user ?? null;
  const save = useSaveClientDraft(project.id);
  const [error, setError] = useState<unknown>(null);
  const [toast, setToast] = useState(false);
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
      {
        onSuccess: () => setToast(true),
        onError: setError,
      },
    );
  };

  return (
    <div className={search.result}>
      <h4 className={search.resultTitle}>
        {`${isSent ? 'Sent' : 'Send'} ${count} ${count === 1 ? 'expert' : 'experts'} to ${first}`}
      </h4>
      <StreamedAnswer
        className={search.resultIntro}
        pauseMs={500}
        text={
          count === 1
            ? `${first} gets one email with **the expert’s profile**, a short summary of their answers and their free times. They confirm the call on a private page.`
            : `${first} gets one email with all **${count} profiles**, a short summary of their answers and their free times. They pick ${settings.pickUpToTwo ? '1 or 2 experts' : 'an expert'} on a private page.`
        }
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
              {/* The envelope, as in a mail app: from, to, then the subject, each on its own line. */}
              <div className={styles.envelope}>
                {sender ? (
                  <div className={styles.mailRow}>
                    <span className={styles.mailLabel}>From</span>
                    <PersonChip name={sender.name} detail={sender.title} email={sender.email} />
                  </div>
                ) : null}
                <div className={styles.mailRow}>
                  <span className={styles.mailLabel}>To</span>
                  <PersonChip name={draft.to.name} detail={draft.to.email} email={draft.to.email} />
                </div>
                <div className={styles.mailRow}>
                  <span className={styles.mailLabel} id={`email-subject-label-${project.id}`}>
                    Subject
                  </span>
                  {edit ? (
                    <TextInput
                      id={`email-subject-${project.id}`}
                      labelText="Subject"
                      hideLabel
                      size="sm"
                      className={styles.subjectField}
                      value={edit.subject}
                      onChange={(event) => setEdit({ ...edit, subject: event.target.value })}
                      invalid={Boolean(fieldError('subject'))}
                      invalidText={fieldError('subject')}
                    />
                  ) : (
                    <span className={styles.subject}>{draft.subject}</span>
                  )}
                </div>
              </div>
              {edit ? (
                <>
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

              {sender ? <EmailSignature user={sender} /> : null}
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
                  Sent to <strong>{draft.to.name}</strong> for <strong>{project.name}</strong>. I’ll
                  watch for the reply.
                </span>
              </p>
              {onHome ? (
                <Button kind="tertiary" size="md" onClick={onHome}>
                  Review other tasks
                </Button>
              ) : null}
              {toast ? (
                <FlowToast
                  label={`Email sent to ${draft.to.name}`}
                  title={`Email sent to ${draft.to.name}`}
                  action="Review other tasks"
                  onAction={() => onHome?.()}
                  onClose={() => setToast(false)}
                />
              ) : null}
            </div>
          ) : (
            <div className={styles.foot}>
              <Button disabled={isEditing || save.isPending} onClick={send}>
                {save.isPending ? 'Sending…' : `Send to ${first}`}
              </Button>
            </div>
          )}
        </div>
      </StreamedAnswer>
    </div>
  );
}

/** A person on a mail line: portrait, name, then their address or title. */
function PersonChip({ name, detail, email }: { name: string; detail: string; email: string }) {
  const photo = senderPhoto(email);
  return (
    <span className={styles.recipient} title={email}>
      <span className={styles.recipientAvatar} aria-hidden="true">
        {photo ? (
          <Image src={photo} alt="" width={24} height={24} className={styles.photo} />
        ) : (
          initials(name)
        )}
      </span>
      <span className={styles.recipientName}>{name}</span>
      <span className={styles.recipientEmail}>{detail}</span>
    </span>
  );
}

/** The close of the email: sign-off, then the sender’s portrait, name and title. */
function EmailSignature({ user }: { user: User }) {
  const photo = senderPhoto(user.email);
  return (
    <footer className={styles.signature}>
      <p className={styles.signoff}>Best regards,</p>
      <div className={styles.signer}>
        <span className={styles.avatar} aria-hidden="true">
          {photo ? (
            <Image src={photo} alt="" width={32} height={32} className={styles.photo} />
          ) : (
            initials(user.name)
          )}
        </span>
        <div className={styles.signerText}>
          <p className={styles.signerName}>{user.name}</p>
          <p className={styles.signerTitle}>
            {user.title}, {user.organisation}
          </p>
        </div>
      </div>
    </footer>
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
