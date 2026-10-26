'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, IconButton, InlineNotification, SkeletonText, Tag, TextArea } from '@carbon/react';
import {
  ArrowRight,
  Checkmark,
  CheckmarkFilled,
  Document,
  Edit,
  Launch,
  Search,
  WarningAltFilled,
} from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useApproveProject, useProject, useUpdateProject } from '../../api/queries';
import type { ChatBlock, ChatChip, ChatEmail } from '../../model/home.schema';
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
            return <ScreeningAnswers key={key} projectId={block.projectId} onWorking={onWorking} />;
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
          Project brief · {p.id} · {p.version}
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
  const session = useSession();
  const firstName = session.data?.user?.name?.split(' ')[0];
  if (!project.data) return null;
  const p = project.data;
  const isDraft = p.status === 'draft' || p.status === 'needs_client_info';
  if (!isDraft) {
    return (
      <p className={styles.created}>
        <CheckmarkFilled aria-hidden={true} />
        Project file created.
      </p>
    );
  }
  const open = p.confirmations.filter((c) => c.state === 'open');
  return (
    <div className={styles.createAsk}>
      <p>
        <strong>{firstName ? `${firstName}, have you` : 'Have you'} reviewed the brief?</strong> If
        nothing needs editing, can I create the project file?
        {open.length > 0
          ? ` ${open.length === 1 ? '1 thing still needs' : `${open.length} things still need`} confirming; you can confirm ${open.length === 1 ? 'it' : 'them'} later.`
          : ''}
      </p>
      <p className={styles.reqHint}>Anything missing? Use the edit pencil on the brief first.</p>
      {approve.isError ? (
        <p className={styles.footerError} role="alert">
          {toUserMessage(approve.error)}
        </p>
      ) : null}
      <div>
        <Button
          size="md"
          renderIcon={Checkmark}
          disabled={isBusy || approve.isPending}
          onClick={() =>
            approve.mutate(undefined, {
              onSuccess: () => onAsk(`Yes, create the project file for ${p.id}`),
            })
          }
        >
          {approve.isPending ? 'Creating…' : 'Create project file'}
        </Button>
      </div>
    </div>
  );
}

/**
 * What the AI will search on, laid out for one last look: the expert profile it matches against
 * and how many screening questions go with it. It reads the live project file, so edits made in
 * the brief above show here. Then one button starts the search.
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
  if (project.isPending) return <SkeletonText paragraph lineCount={4} />;
  if (!project.data) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The requirements didn’t load."
        subtitle={toUserMessage(project.error)}
      />
    );
  }
  const p = project.data;
  return (
    <article className={styles.card} aria-label={`Requirements for ${p.id}`}>
      <header className={styles.reqHead}>
        <p className={styles.reqIntro}>We have these requirements for the experts:</p>
        <span className={styles.reqMeta}>
          {p.requirements.length} expert requirements · {p.questions.length} screening questions
        </span>
      </header>
      <ol className={styles.docNumbered}>
        {p.requirements.map((r) => (
          <li key={r.id}>{r.text}</li>
        ))}
      </ol>
      <footer className={styles.reqFoot}>
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
          disabled={isBusy}
          onClick={() => onAsk(`Yes, find experts for ${p.id}`)}
        >
          Find experts
        </Button>
      </footer>
    </article>
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
