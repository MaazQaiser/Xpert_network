'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import {
  ActionableNotification,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  IconButton,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  SkeletonText,
  Tag,
  TextArea,
  TextInput,
} from '@carbon/react';
import { CheckmarkFilled, Time, TrashCan } from '@carbon/icons-react';
import { Envelope as EmailPictogram } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, NotFoundState } from '@/shared/ui';
import { useClientDraft, useProject, useSaveClientDraft } from '../../api/queries';
import {
  clientDraftInputSchema,
  type ClientDraft,
  type ClientExpert,
  type ClientSettings,
} from '../../model/clientDraft.schema';
import type { TimeSlot } from '../../model/availability.schema';
import type { Project } from '../../model/project.schema';
import styles from './SendToClient.module.scss';

type Notice = { kind: 'success'; message: string } | { kind: 'error'; error: unknown } | null;

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

function replyByLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`;
}

/** PRD screen 10: the AI-drafted email that sends the chosen experts to the client. */
export function SendToClient({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const draft = useClientDraft(projectId);
  return (
    <AsyncBoundary
      query={project}
      errorTitle="This project didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that project"
          message="It may have been deleted, or the link is incomplete."
          backHref={routes.admin.projects}
          backLabel="Back to projects"
        />
      }
      loading={<DraftSkeleton />}
    >
      {(data) => (
        <AsyncBoundary
          query={draft}
          errorTitle="The client email didn’t load"
          loading={<DraftSkeleton />}
          notFound={
            <div className={styles.root}>
              <Crumbs project={data} />
              <EmptyState
                pictogram={<EmailPictogram aria-hidden="true" />}
                title="No experts are ready to send yet"
                description="Confirm the experts’ times first. Then the AI drafts the email to the client here."
                action={
                  <Button as={Link} href={routes.admin.projectStep(data.id, 'availability')}>
                    Go to confirm availability
                  </Button>
                }
              />
            </div>
          }
        >
          {(result) => <DraftView project={data} draft={result} />}
        </AsyncBoundary>
      )}
    </AsyncBoundary>
  );
}

function DraftSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the client email" className={styles.root}>
      <SkeletonText heading width="40%" />
      <SkeletonText paragraph lineCount={10} />
    </div>
  );
}

function DraftView({ project, draft }: { project: Project; draft: ClientDraft }) {
  const save = useSaveClientDraft(project.id);
  const [subject, setSubject] = useState(draft.subject);
  const [intro, setIntro] = useState(draft.intro);
  const [expertIds, setExpertIds] = useState(draft.experts.map((e) => e.expertId));
  const [settings, setSettings] = useState<ClientSettings>(draft.settings);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const isSent = draft.sentAt !== null;
  const experts = draft.experts.filter((e) => expertIds.includes(e.expertId));
  const first = draft.to.name.split(' ')[0] ?? draft.to.name;
  const input = { subject, intro, expertIds, settings };
  const check = clientDraftInputSchema.safeParse({ action: 'send', ...input });
  const fieldError = (field: 'subject' | 'intro') =>
    check.success ? undefined : check.error.issues.find((i) => i.path[0] === field)?.message;
  const uncovered = draft.questionTopics.filter(
    (_, index) => !experts.some((e) => e.covers.includes(index)),
  );

  const run = (action: 'save' | 'send') =>
    save.mutate(
      { action, ...input },
      {
        onSuccess: (next) =>
          setNotice({
            kind: 'success',
            message:
              action === 'save'
                ? `Draft saved at ${formatTime(next.savedAt ?? new Date().toISOString())}.`
                : `Sent to ${draft.to.name}. ${first}’s reply with the picks is in your Inbox.`,
          }),
        onError: (error) => setNotice({ kind: 'error', error }),
      },
    );

  return (
    <div className={styles.root}>
      <Crumbs project={project} />

      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.meta}>
            {/* The mascot alone marks the draft as AI-written; its alt text names it. */}
            <Image
              src="/images/assistant-mascot.png"
              alt="AI drafted"
              width={21}
              height={24}
              className={styles.aiMascot}
            />
            <span className={styles.metaText}>
              {draft.experts.length} experts confirmed times
              {draft.holdSlots ? ' · slots held for 48 h' : ''}
            </span>
          </div>
          <h1 className={styles.title}>
            {isSent
              ? `Sent ${experts.length} experts to ${first}`
              : `Send ${experts.length} experts to ${first}`}
          </h1>
          <p className={styles.subtitle}>
            {first} gets one email with all {experts.length} profiles, a short summary of their
            answers and their free times. They pick
            {settings.pickUpToTwo ? ' 1 or 2 experts' : ' an expert'} on a private page.
          </p>
        </div>
        <div className={styles.actions}>
          {isSent ? (
            <>
              <p className={styles.sent}>
                <CheckmarkFilled aria-hidden={true} /> Sent at {formatTime(draft.sentAt ?? '')}
              </p>
              {/* The client's reply lands in the projects inbox (screen 02 → screen 11). */}
              <Button
                as={Link}
                href={routes.admin.inboxRequest(`req_reply_${project.id}`)}
                kind="tertiary"
              >
                View {first}’s reply in Inbox
              </Button>
            </>
          ) : (
            <>
              <Button kind="tertiary" disabled={save.isPending} onClick={() => run('save')}>
                Save draft
              </Button>
              <Button kind="tertiary" onClick={() => setIsPreviewOpen(true)}>
                Preview client email
              </Button>
              <Button disabled={!check.success || save.isPending} onClick={() => run('send')}>
                Send to {first}
              </Button>
            </>
          )}
        </div>
      </header>

      {notice ? (
        notice.kind === 'success' ? (
          <ActionableNotification
            inline
            kind="success"
            role="status"
            lowContrast
            hasFocus={false}
            title={notice.message}
            onClose={() => setNotice(null)}
          />
        ) : (
          <InlineNotification
            kind="error"
            lowContrast
            title="That didn’t go through."
            subtitle={toUserMessage(notice.error)}
            onClose={() => setNotice(null)}
          />
        )
      ) : null}

      <div className={styles.layout}>
        <section className={styles.email} aria-labelledby="email-title">
          <h2 id="email-title" className={styles.cardTitle}>
            Email to client
          </h2>
          <div className={styles.recipient}>
            <span className={styles.fieldLabel}>To</span>
            <span className={styles.recipientValue}>
              {draft.to.name} · {draft.to.email}
            </span>
          </div>
          <TextInput
            id="client-subject"
            labelText="Subject"
            value={subject}
            disabled={isSent}
            onChange={(event) => setSubject(event.target.value)}
            invalid={Boolean(fieldError('subject'))}
            invalidText={fieldError('subject')}
          />
          <TextArea
            id="client-intro"
            labelText="Message"
            rows={3}
            value={intro}
            disabled={isSent}
            onChange={(event) => setIntro(event.target.value)}
            invalid={Boolean(fieldError('intro'))}
            invalidText={fieldError('intro')}
            maxCount={1200}
            enableCounter
          />

          <ol className={styles.experts} aria-label="Experts in the email">
            {experts.map((expert) => (
              <ExpertCard
                key={expert.expertId}
                expert={expert}
                settings={settings}
                canRemove={!isSent && experts.length > 1}
                onRemove={() => setExpertIds((ids) => ids.filter((id) => id !== expert.expertId))}
              />
            ))}
          </ol>
          {expertIds.length < draft.experts.length && !isSent ? (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setExpertIds(draft.experts.map((e) => e.expertId))}
            >
              Bring back removed experts
            </Button>
          ) : null}
        </section>

        <div className={styles.side}>
          <section className={styles.card} aria-labelledby="sees-title">
            <h2 id="sees-title" className={styles.cardTitle}>
              What {first} sees
            </h2>
            <div className={styles.checks}>
              <Checkbox
                id="hide-names"
                labelText="Hide expert names until booked"
                checked={settings.hideNames}
                disabled={isSent}
                onChange={(_, { checked }) => setSettings((s) => ({ ...s, hideNames: checked }))}
              />
              <Checkbox
                id="include-summary"
                labelText="Include a short summary of their answers"
                checked={settings.includeSummary}
                disabled={isSent}
                onChange={(_, { checked }) =>
                  setSettings((s) => ({ ...s, includeSummary: checked }))
                }
              />
              <Checkbox
                id="pick-two"
                labelText={`Let ${first} pick up to 2 experts`}
                checked={settings.pickUpToTwo}
                disabled={isSent}
                onChange={(_, { checked }) => setSettings((s) => ({ ...s, pickUpToTwo: checked }))}
              />
              <Checkbox
                id="show-rates"
                labelText="Show hourly rates"
                checked={settings.showRates}
                disabled={isSent}
                onChange={(_, { checked }) => setSettings((s) => ({ ...s, showRates: checked }))}
              />
            </div>
            <Select
              id="reply-by"
              labelText="Reply by"
              helperText={draft.holdSlots ? 'The experts’ slots are held until then.' : undefined}
              value={settings.replyBy}
              disabled={isSent}
              onChange={(event) => setSettings((s) => ({ ...s, replyBy: event.target.value }))}
            >
              {draft.replyByOptions.map((option) => (
                <SelectItem key={option} value={option} text={replyByLabel(option)} />
              ))}
            </Select>
          </section>

          <section className={styles.card} aria-labelledby="coverage-title">
            <h2 id="coverage-title" className={styles.cardTitle}>
              Question coverage
            </h2>
            <p className={styles.cardText}>
              {uncovered.length === 0
                ? `All ${draft.questionTopics.length} of ${first}’s questions are covered by at least one of these experts.`
                : `${uncovered.length} of ${first}’s questions are no longer covered. Bring an expert back or add one.`}
            </p>
            <ul className={styles.coverage}>
              {draft.questionTopics.map((topic, index) => {
                const letters = experts
                  .filter((e) => e.covers.includes(index))
                  .map((e) => e.letter);
                return (
                  <li key={topic}>
                    <span>
                      Q{index + 1} · {topic}
                    </span>
                    <span className={letters.length === 0 ? styles.notCovered : styles.letters}>
                      {letters.length > 0 ? letters.join(', ') : 'Not covered'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      {isPreviewOpen
        ? createPortal(
            <Modal
              open
              passiveModal
              selectorPrimaryFocus="[data-modal-primary-focus]"
              modalHeading={subject}
              modalLabel={`Preview · to ${draft.to.email}`}
              onRequestClose={() => setIsPreviewOpen(false)}
            >
              <div className={styles.preview} tabIndex={-1} data-modal-primary-focus>
                <p>{intro}</p>
                {experts.map((expert) => (
                  <div key={expert.expertId} className={styles.previewExpert}>
                    <p className={styles.previewName}>
                      {settings.hideNames ? `Expert ${expert.letter}` : expert.name} · {expert.role}
                    </p>
                    {settings.includeSummary ? <p>“{expert.quote}”</p> : null}
                    <p className={styles.previewMeta}>
                      Free: {expert.slots.map(slotLabel).join(', ')}
                      {settings.showRates && expert.rateHint ? ` · ${expert.rateHint}/h` : ''}
                    </p>
                  </div>
                ))}
                <p className={styles.previewMeta}>
                  Please reply by {replyByLabel(settings.replyBy)}.
                </p>
              </div>
            </Modal>,
            document.body,
          )
        : null}
    </div>
  );
}

function ExpertCard({
  expert,
  settings,
  canRemove,
  onRemove,
}: {
  expert: ClientExpert;
  settings: ClientSettings;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <li className={styles.expert}>
      <span className={styles.avatar}>
        {expert.photoUrl ? (
          <Image src={expert.photoUrl} alt="" width={40} height={40} className={styles.photo} />
        ) : (
          initials(expert.name)
        )}
      </span>
      <div className={styles.expertBody}>
        <div className={styles.expertHead}>
          <p className={styles.expertTitle}>
            <strong className={styles.expertName}>{expert.name}</strong>
            {/* The letter the client sees while names are hidden; coverage uses it too. */}
            <span className={styles.expertMeta}>
              Expert {expert.letter} · {expert.years} yrs · {expert.country}
              {settings.showRates && expert.rateHint ? ` · ${expert.rateHint}/h` : ''}
            </span>
          </p>
          <p className={styles.expertRole}>{expert.role}</p>
        </div>
        {settings.includeSummary ? <p className={styles.quote}>“{expert.quote}”</p> : null}
        <div className={styles.line}>
          <span className={styles.lineLabel}>Best for</span>
          <div className={styles.values}>
            {expert.bestFor.map((topic) => (
              <Tag key={topic} type="cool-gray" size="sm">
                {topic}
              </Tag>
            ))}
          </div>
        </div>
        <div className={styles.line}>
          <span className={styles.lineLabel}>Free</span>
          <div className={styles.times}>
            <Time aria-hidden={true} className={styles.slotIcon} />
            <ul className={styles.slots} aria-label={`${expert.name}’s free times`}>
              {expert.slots.map((slot) => (
                <li key={slot.id}>{slotLabel(slot)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {canRemove ? (
        <IconButton
          kind="ghost"
          size="sm"
          align="top-end"
          label={`Remove ${expert.name} from the email`}
          onClick={onRemove}
        >
          <TrashCan />
        </IconButton>
      ) : null}
    </li>
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
        <Link href={routes.admin.projectStep(project.id, 'availability')}>
          Confirm availability
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>Send to client</BreadcrumbItem>
    </Breadcrumb>
  );
}
