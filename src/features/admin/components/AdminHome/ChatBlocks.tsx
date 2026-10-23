'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, InlineNotification, SkeletonText, Tag, TextArea } from '@carbon/react';
import { ArrowRight, Attachment, Document, Edit, WarningAltFilled } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useProject, useUpdateProject } from '../../api/queries';
import type { ChatBlock, ChatChip, ChatEmail } from '../../model/home.schema';
import { projectPatchSchema, PROJECT_STATUS_LABELS } from '../../model/project.schema';
import { initials, receivedLabel, senderPhoto } from '../inboxDisplay';
import styles from './ChatBlocks.module.scss';

type AskFn = (prompt: string) => void;

/** The rich parts of one assistant answer, in order. */
export function ChatBlocks({
  blocks,
  onAsk,
  isBusy,
}: {
  blocks: ChatBlock[];
  onAsk: AskFn;
  isBusy: boolean;
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

/** Emails to pick from: who, when, the subject, why the AI picked it, and one action. */
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
    <ul className={styles.picks} aria-label="Emails">
      {items.map((email) => (
        <li key={email.requestId} className={styles.pick}>
          <SenderAvatar name={email.from.name} email={email.from.email} />
          <div className={styles.pickBody}>
            <p className={styles.pickTop}>
              <span className={styles.pickFrom}>
                {email.from.name}
                <span className={styles.pickCompany}> · {email.company}</span>
              </span>
              <time dateTime={email.receivedAt} className={styles.pickTime}>
                {receivedLabel(email.receivedAt)}
              </time>
            </p>
            <p className={styles.pickSubject}>{email.subject}</p>
            <p className={styles.pickMeta}>
              <span className={styles.reason}>{email.reason}</span>
              {email.attachment ? (
                <span className={styles.file}>
                  <Attachment aria-hidden={true} /> {email.attachment}
                </span>
              ) : null}
            </p>
          </div>
          <Button
            kind="tertiary"
            size="sm"
            className={styles.pickAction}
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
 * The project brief as a document canvas in the chat. Read it, edit it in place (it saves to the
 * project file, the same one screen 03 shows), then open the full project file.
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
            <Button kind="tertiary" size="sm" renderIcon={Edit} onClick={startEditing}>
              Edit
            </Button>
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

      <footer className={styles.canvasFooter}>
        <p>Looks right? Open the project file to review it and start finding experts.</p>
        <Button
          as={Link}
          href={routes.admin.projectStep(p.id, 'brief')}
          size="md"
          renderIcon={ArrowRight}
        >
          Open project file
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
