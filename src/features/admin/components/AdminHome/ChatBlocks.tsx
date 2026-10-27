'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Button,
  IconButton,
  InlineLoading,
  InlineNotification,
  SkeletonText,
  Tag,
  TextArea,
} from '@carbon/react';
import {
  ArrowRight,
  Document,
  Edit,
  Launch,
  Search,
  UserMultiple,
  WarningAltFilled,
} from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useApproveProject, useProject, useUpdateProject } from '../../api/queries';
import {
  CARD_PROMPTS,
  type ChatBlock,
  type ChatChip,
  type ChatEmail,
} from '../../model/home.schema';
import { projectPatchSchema, PROJECT_STATUS_LABELS } from '../../model/project.schema';
import { initials, receivedLabel, senderPhoto } from '../inboxDisplay';
import { ExpertSearch } from './ExpertSearch';
import { ScreeningAnswers } from './ScreeningAnswers';
import styles from './ChatBlocks.module.scss';

type AskFn = (prompt: string) => void;

/** The rich parts of one assistant answer, in order. */
export function ChatBlocks({
  blocks,
  onAsk,
  isBusy,
  onWorking,
}: {
  blocks: ChatBlock[];
  onAsk: AskFn;
  isBusy: boolean;
  /** A block the AI is still working on (the expert search) reports it here. */
  onWorking?: (working: boolean) => void;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        switch (block.kind) {
          case 'emails':
            return <EmailPicks key={key} items={block.items} onAsk={onAsk} isBusy={isBusy} />;
          case 'brief':
            return <BriefCanvas key={key} projectId={block.projectId} />;
          case 'expertSearch':
            return (
              <ExpertSearch
                key={key}
                projectId={block.projectId}
                onWorking={onWorking}
                onAsk={onAsk}
              />
            );
          case 'screeningAnswers':
            return (
              <ScreeningAnswers
                key={key}
                projectId={block.projectId}
                expertId={block.expertId}
                expertName={block.expertName}
                onWorking={onWorking}
              />
            );
          case 'createProject':
            return (
              <CreateProjectAsk
                key={key}
                projectId={block.projectId}
                onAsk={onAsk}
                isBusy={isBusy}
              />
            );
          case 'requirements':
            return (
              <RequirementsReview
                key={key}
                projectId={block.projectId}
                onAsk={onAsk}
                isBusy={isBusy}
              />
            );
          case 'action':
            return (
              <div key={key} className={styles.nextStep}>
                <Button
                  size="md"
                  renderIcon={Search}
                  disabled={isBusy}
                  onClick={() => onAsk(block.prompt)}
                >
                  {block.label}
                </Button>
              </div>
            );
          case 'emailSummary':
            return (
              <EmailSummary
                key={key}
                email={block.email}
                points={block.points}
                missing={block.missing}
              />
            );
          case 'draftReply':
            return <DraftReply key={key} to={block.to} subject={block.subject} body={block.body} />;
          case 'experts':
            return <ExpertsList key={key} items={block.items} />;
        }
      })}
    </>
  );
}

/** Next steps the assistant suggests, as chips: ask it something, or go somewhere. */
export function ChatChips({
  chips,
  onAsk,
  isBusy,
}: {
  chips: ChatChip[];
  onAsk: AskFn;
  isBusy: boolean;
}) {
  if (chips.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label="Suggested next steps">
      {chips.map((chip) => (
        <li key={chip.label}>
          {chip.href ? (
            <Link href={chip.href} className={styles.chip}>
              {chip.label}
              <ArrowRight aria-hidden={true} />
            </Link>
          ) : (
            <button
              type="button"
              className={styles.chip}
              disabled={isBusy}
              onClick={() => chip.prompt && onAsk(chip.prompt)}
            >
              {chip.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function SenderAvatar({ name, email }: { name: string; email: string }) {
  const photo = senderPhoto(email);
  return (
    <span className={styles.avatar} aria-hidden="true">
      {photo ? (
        <Image src={photo} alt="" width={40} height={40} className={styles.avatarPhoto} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/**
 * Emails to pick from, as plain lines: who sent it, the subject under it, and one small action.
 */
function EmailPicks({
  items,
  onAsk,
  isBusy,
}: {
  items: ChatEmail[];
  onAsk: AskFn;
  isBusy: boolean;
}) {
  return (
    <ul className={styles.notes} aria-label="Emails">
      {items.map((email) => (
        <li key={email.requestId} className={styles.note}>
          <SenderAvatar name={email.from.name} email={email.from.email} />
          <div className={styles.noteBody}>
            <span className={styles.noteFrom}>{email.from.name}</span>
            <p className={styles.noteSubject}>{email.subject}</p>
          </div>
          <Button
            kind="tertiary"
            size="sm"
            className={styles.noteAction}
            disabled={isBusy}
            onClick={() => onAsk(email.prompt)}
            aria-label={`${email.action}: ${email.from.name}, ${email.subject}`}
          >
            {email.action}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The project brief as a document canvas in the chat. Read it and edit it in place (it saves to
 * the project file, the same one screen 03 shows); the assistant asks to create it just below.
 */
function BriefCanvas({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const update = useUpdateProject(projectId);
  const [draft, setDraft] = useState<{
    brief: string;
    requirements: string;
    questions: string;
  } | null>(null);

  if (project.isPending) {
    return (
      <div className={styles.canvas} aria-busy="true" aria-label="Loading the brief">
        <div className={styles.canvasPage}>
          <SkeletonText heading width="60%" />
          <SkeletonText paragraph lineCount={6} />
        </div>
      </div>
    );
  }
  if (!project.data) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The brief didn’t load."
        subtitle={toUserMessage(project.error)}
      />
    );
  }

  const p = project.data;
  const open = p.confirmations.filter((c) => c.state === 'open');
  const isEditing = draft !== null;
  const lines = (text: string) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  const patch = draft
    ? {
        brief: draft.brief,
        requirements: lines(draft.requirements).map((text, i) => ({
          id: p.requirements[i]?.id ?? `r_chat_${i}`,
          text,
        })),
        questions: lines(draft.questions).map((text, i) => ({
          id: p.questions[i]?.id ?? `q_chat_${i}`,
          text,
          page: p.questions[i]?.page ?? null,
        })),
      }
    : null;
  const check = patch ? projectPatchSchema.safeParse(patch) : null;
  const briefError =
    check && !check.success
      ? check.error.issues.find((i) => i.path[0] === 'brief')?.message
      : undefined;
  const listError =
    check && !check.success
      ? check.error.issues.find((i) => i.path[0] !== 'brief')?.message
      : undefined;

  const startEditing = () =>
    setDraft({
      brief: p.brief,
      requirements: p.requirements.map((r) => r.text).join('\n'),
      questions: p.questions.map((q) => q.text).join('\n'),
    });
  const save = () => {
    if (!patch || !check?.success) return;
    update.mutate(patch, { onSuccess: () => setDraft(null) });
  };

  return (
    <article className={styles.canvas} aria-labelledby={`canvas-${p.id}`}>
      <header className={styles.canvasBar}>
        <span className={styles.canvasLabel}>
          <Document aria-hidden={true} />
          Project brief · {p.version}
        </span>
        <AIExplainLabel size="xs" aria-label={`${p.id} brief`} />
        <span className={styles.canvasActions}>
          {isEditing ? (
            <>
              <Button kind="ghost" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button
                kind="primary"
                size="sm"
                disabled={!check?.success || update.isPending}
                onClick={save}
              >
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <IconButton
                kind="ghost"
                size="sm"
                label="Edit brief"
                align="bottom"
                onClick={startEditing}
              >
                <Edit />
              </IconButton>
              <IconButton
                kind="ghost"
                size="sm"
                label="Open project file"
                align="bottom-right"
                href={routes.admin.projectStep(p.id, 'brief')}
              >
                <Launch />
              </IconButton>
            </>
          )}
        </span>
      </header>

      <div className={styles.canvasPage}>
        <div className={styles.docHead}>
          <Tag type="gray" size="sm">
            {PROJECT_STATUS_LABELS[p.status]}
          </Tag>
          <h3 id={`canvas-${p.id}`} className={styles.docTitle}>
            {p.name}
          </h3>
          <p className={styles.docMeta}>
            {p.client.name} · Contact: {p.contact.name}
            {p.source.fileName ? ` · Source: ${p.source.fileName}` : ''}
          </p>
        </div>

        {update.isError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Your edits didn’t save."
            subtitle={toUserMessage(update.error)}
            onCloseButtonClick={() => update.reset()}
          />
        ) : null}

        <section className={styles.docSection}>
          <h4 className={styles.docHeading}>Brief</h4>
          {isEditing && draft ? (
            <TextArea
              id={`canvas-brief-${p.id}`}
              labelText="Brief"
              hideLabel
              rows={5}
              value={draft.brief}
              onChange={(event) => setDraft({ ...draft, brief: event.target.value })}
              invalid={Boolean(briefError)}
              invalidText={briefError}
            />
          ) : (
            <p className={styles.docText}>{p.brief}</p>
          )}
        </section>

        <section className={styles.docSection}>
          <h4 className={styles.docHeading}>Expert profile needed ({p.requirements.length})</h4>
          {isEditing && draft ? (
            <TextArea
              id={`canvas-reqs-${p.id}`}
              labelText="Expert profile"
              helperText="One requirement per line."
              rows={Math.max(4, p.requirements.length)}
              value={draft.requirements}
              onChange={(event) => setDraft({ ...draft, requirements: event.target.value })}
            />
          ) : (
            <ul className={styles.docList}>
              {p.requirements.map((r) => (
                <li key={r.id}>{r.text}</li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.docSection}>
          <h4 className={styles.docHeading}>Screening questions ({p.questions.length})</h4>
          {isEditing && draft ? (
            <TextArea
              id={`canvas-questions-${p.id}`}
              labelText="Screening questions"
              helperText="One question per line."
              rows={Math.max(5, p.questions.length + 1)}
              value={draft.questions}
              onChange={(event) => setDraft({ ...draft, questions: event.target.value })}
              invalid={Boolean(listError)}
              invalidText={listError}
            />
          ) : (
            <ol className={styles.docNumbered}>
              {p.questions.map((q) => (
                <li key={q.id}>{q.text}</li>
              ))}
            </ol>
          )}
        </section>

        {open.length > 0 ? (
          <section className={styles.docSection}>
            <h4 className={styles.docHeading}>Needs confirming ({open.length})</h4>
            <ul className={styles.confirmList}>
              {open.map((c) => (
                <li key={c.id}>
                  <WarningAltFilled aria-hidden={true} />
                  {c.text}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {p.facts.length > 0 ? (
          <section className={styles.docSection}>
            <h4 className={styles.docHeading}>Key facts</h4>
            <dl className={styles.facts}>
              {p.facts.map((f) => (
                <div key={f.id}>
                  <dt>{f.label}</dt>
                  <dd className={f.value ? undefined : styles.factMissing}>
                    {f.value ?? 'Not in the document'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Under the brief, the assistant asks before acting: has the PM reviewed it, and can it create the
 * project file? The button is the yes. Once created, it says so instead.
 */
function CreateProjectAsk({
  projectId,
  onAsk,
  isBusy,
}: {
  projectId: string;
  onAsk: AskFn;
  isBusy: boolean;
}) {
  const project = useProject(projectId);
  const approve = useApproveProject(projectId);
  if (!project.data) return null;
  const p = project.data;
  const isDraft = p.status === 'draft' || p.status === 'needs_client_info';
  // Once the file exists the ask has done its job; the reply below says it was created.
  if (!isDraft) return null;
  return (
    <div className={styles.createAsk}>
      <p>
        Should we proceed to create the project <strong>{p.name}</strong> from this brief, or look
        at another project brief?
      </p>
      {approve.isError ? (
        <p className={styles.footerError} role="alert">
          {toUserMessage(approve.error)}
        </p>
      ) : null}
      {/* The two answers to the question, side by side: go ahead, or look at another brief. */}
      <div className={styles.createActions}>
        <Button
          size="md"
          className={styles.createButton}
          disabled={isBusy || approve.isPending}
          onClick={() =>
            approve.mutate(undefined, {
              onSuccess: () => onAsk(`Yes, create the project file for ${p.name}`),
            })
          }
        >
          {approve.isPending ? 'Creating…' : 'Create project'}
        </Button>
        <Button
          kind="tertiary"
          size="md"
          className={styles.createButton}
          disabled={isBusy || approve.isPending}
          onClick={() => onAsk(CARD_PROMPTS.emails)}
        >
          Show other briefs
        </Button>
      </div>
    </div>
  );
}

/** How long each step of creating the project file shows before its check mark. */
const CREATE_STEP_MS = 1600;
const CREATE_STEPS = [
  'Creating the project file',
  'Pulling the expert requirements from the brief',
];

/** The brief's opening sentence, as a one-line description of the project. */
function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

/**
 * After Create project: the AI creates the file in the open, then hands over the project (its
 * name, a line on what it is, done) and the expert requirements it will search on, in a card the
 * PM can edit. Below the card, one question and the button that starts the search.
 */
function RequirementsReview({
  projectId,
  onAsk,
  isBusy,
}: {
  projectId: string;
  onAsk: AskFn;
  isBusy: boolean;
}) {
  const project = useProject(projectId);
  const update = useUpdateProject(projectId);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);

  // Tick the steps off (the last one waits for the project file); the answer then replaces them.
  useEffect(() => {
    if (step >= CREATE_STEPS.length) return undefined;
    if (step === CREATE_STEPS.length - 1 && !project.data) return undefined;
    const timer = window.setTimeout(() => setStep((s) => s + 1), CREATE_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [step, project.data]);

  const steps = (
    <ol className={styles.createSteps} aria-live="polite">
      {CREATE_STEPS.map((label, index) => (
        <li key={label}>
          <InlineLoading
            status={index < step ? 'finished' : index === step ? 'active' : 'inactive'}
            description={index < step ? label : `${label}…`}
          />
        </li>
      ))}
    </ol>
  );

  if (project.isError) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The project file didn’t load."
        subtitle={toUserMessage(project.error)}
      />
    );
  }
  if (step < CREATE_STEPS.length || !project.data) return steps;

  const p = project.data;
  const lines = draft
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const patch = lines
    ? {
        requirements: lines.map((text, i) => ({
          id: p.requirements[i]?.id ?? `r_chat_${i}`,
          text,
        })),
      }
    : null;
  const check = patch ? projectPatchSchema.safeParse(patch) : null;
  const draftError =
    lines && lines.length === 0
      ? 'Add at least one requirement.'
      : check && !check.success
        ? check.error.issues[0]?.message
        : undefined;
  const save = () => {
    if (!patch || draftError) return;
    update.mutate(patch, { onSuccess: () => setDraft(null) });
  };

  return (
    // The steps make way for the result once it's in.
    <div className={styles.createdFlow}>
      <p className={styles.createdLead}>
        Your project <strong>{p.name}</strong> has been created successfully. Now review the
        experts’ requirements below; if you need to change any, you can edit them.
      </p>

      {/* The requirements as a document card, like the brief: bar, then the page. */}
      <article className={styles.canvas} aria-label={`Requirements for ${p.id}`}>
        <header className={styles.canvasBar}>
          <span className={styles.canvasLabel}>
            <UserMultiple aria-hidden={true} />
            Expert requirements
          </span>
          <AIExplainLabel size="xs" aria-label={`${p.id} expert requirements`} />
          <span className={styles.canvasActions}>
            {draft !== null ? (
              <>
                <Button kind="ghost" size="sm" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button
                  kind="primary"
                  size="sm"
                  disabled={Boolean(draftError) || update.isPending}
                  onClick={save}
                >
                  {update.isPending ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <IconButton
                kind="ghost"
                size="sm"
                label="Edit requirements"
                align="bottom-right"
                onClick={() => setDraft(p.requirements.map((r) => r.text).join('\n'))}
              >
                <Edit />
              </IconButton>
            )}
          </span>
        </header>

        <div className={styles.canvasPage}>
          <div className={styles.docHead}>
            <Tag type="blue" size="sm">
              {p.requirements.length} expert{' '}
              {p.requirements.length === 1 ? 'requirement' : 'requirements'}
            </Tag>
            <h3 id={`created-${p.id}`} className={styles.docTitle}>
              {p.name}
            </h3>
            <p className={styles.docMeta}>{firstSentence(p.brief)}</p>
          </div>

          <section className={styles.docSection}>
            <h4 className={styles.docHeading}>Expert profile needed ({p.requirements.length})</h4>
            {draft !== null ? (
              <TextArea
                id={`requirements-${p.id}`}
                labelText="Expert requirements"
                helperText="One requirement per line."
                rows={Math.max(4, (lines?.length ?? 0) + 1)}
                value={draft}
                invalid={Boolean(draftError)}
                invalidText={draftError}
                onChange={(event) => setDraft(event.target.value)}
              />
            ) : (
              <ul className={styles.docList}>
                {p.requirements.map((r) => (
                  <li key={r.id}>{r.text}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </article>

      {/* The way on, outside the card: one question, one button. */}
      <div className={styles.reqFoot}>
        <div className={styles.footerText}>
          <p>
            <strong>Should I find experts who match them?</strong>
          </p>
          <p className={styles.reqHint}>
            Something missing? Edit the brief above and this list updates.
          </p>
        </div>
        <Button
          size="md"
          renderIcon={Search}
          disabled={isBusy || draft !== null}
          onClick={() => onAsk(`Yes, find experts for ${p.name}`)}
        >
          Find experts
        </Button>
      </div>
    </div>
  );
}

function EmailSummary({
  email,
  points,
  missing,
}: {
  email: ChatEmail;
  points: { label: string; value: string }[];
  missing: string[];
}) {
  return (
    <article className={styles.card} aria-label={`Summary of ${email.from.name}’s email`}>
      <header className={styles.cardHead}>
        <SenderAvatar name={email.from.name} email={email.from.email} />
        <div className={styles.pickBody}>
          <p className={styles.pickFrom}>
            {email.from.name}
            <span className={styles.pickCompany}> · {email.company}</span>
          </p>
          <p className={styles.pickSubject}>{email.subject}</p>
        </div>
        <time dateTime={email.receivedAt} className={styles.pickTime}>
          {receivedLabel(email.receivedAt)}
        </time>
      </header>
      <dl className={styles.points}>
        {points.map((point) => (
          <div key={point.label}>
            <dt>{point.label}</dt>
            <dd>{point.value}</dd>
          </div>
        ))}
      </dl>
      {missing.length > 0 ? (
        <ul className={styles.confirmList} aria-label="Needs confirming">
          {missing.map((item) => (
            <li key={item}>
              <WarningAltFilled aria-hidden={true} />
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function DraftReply({ to, subject, body }: { to: string; subject: string; body: string }) {
  return (
    <article className={styles.card} aria-label="Drafted reply">
      <header className={styles.draftHead}>
        <AIExplainLabel size="xs" aria-label="Drafted reply" />
        <span className={styles.canvasLabel}>Drafted reply</span>
      </header>
      <dl className={styles.points}>
        <div>
          <dt>To</dt>
          <dd>{to}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{subject}</dd>
        </div>
      </dl>
      <p className={styles.draftBody}>{body}</p>
    </article>
  );
}

function ExpertsList({
  items,
}: {
  items: { projectId: string; projectName: string; client: string; count: number; href: string }[];
}) {
  return (
    <ul className={styles.picks} aria-label="Projects with expert answers to review">
      {items.map((item) => (
        <li key={item.projectId} className={styles.pick}>
          <span className={styles.countBadge} aria-hidden="true">
            {String(item.count).padStart(2, '0')}
          </span>
          <div className={styles.pickBody}>
            <p className={styles.pickFrom}>
              {item.projectId} · {item.projectName}
            </p>
            <p className={styles.pickMeta}>
              {item.client} · {item.count} expert {item.count === 1 ? 'answer' : 'answers'} to
              review
            </p>
          </div>
          <Button
            as={Link}
            href={item.href}
            kind="tertiary"
            size="sm"
            className={styles.pickAction}
          >
            Review answers
          </Button>
        </li>
      ))}
    </ul>
  );
}
