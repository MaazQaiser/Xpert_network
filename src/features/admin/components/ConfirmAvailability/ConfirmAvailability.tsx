'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ActionableNotification,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  IconButton,
  InlineNotification,
  Modal,
  SelectableTag,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  Tile,
} from '@carbon/react';
import { ArrowRight, Chat, CheckmarkFilled, DocumentExport } from '@carbon/icons-react';
import { Calendar as CalendarPictogram } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, NotFoundState, StatusTag } from '@/shared/ui';
import { useAvailability, useAvailabilityAction, useBooking, useProject } from '../../api/queries';
import {
  AVAILABILITY_STATUS_LABELS,
  type Availability,
  type ExpertAvailability,
  type TimeSlot,
} from '../../model/availability.schema';
import type { Project } from '../../model/project.schema';
import styles from './ConfirmAvailability.module.scss';

type Notice = { kind: 'success'; message: string } | { kind: 'error'; error: unknown } | null;

/** "Tue 27 · 14:00" in the client's timezone (GMT). */
function slotLabel(slot: TimeSlot): string {
  const date = new Date(slot.startsAt);
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const dayOfMonth = date.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} ${dayOfMonth} · ${time}`;
}

/** PRD screen 09: confirm the chosen experts' times, then send them to the client. */
export function ConfirmAvailability({
  projectId,
  expertIds,
}: {
  projectId: string;
  expertIds: string[];
}) {
  const project = useProject(projectId);
  const availability = useAvailability(projectId, expertIds);
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
      loading={<AvailabilitySkeleton />}
    >
      {(data) => (
        <AsyncBoundary
          query={availability}
          errorTitle="The experts’ times didn’t load"
          loading={<AvailabilitySkeleton />}
        >
          {(result) => <AvailabilityView project={data} data={result} />}
        </AsyncBoundary>
      )}
    </AsyncBoundary>
  );
}

function AvailabilitySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the experts’ times" className={styles.root}>
      <SkeletonText heading width="35%" />
      <SkeletonText paragraph lineCount={8} />
    </div>
  );
}

function AvailabilityView({ project, data }: { project: Project; data: Availability }) {
  const router = useRouter();
  const action = useAvailabilityAction(project.id);
  // Every offered slot starts as a client option; clicking a slot takes it out or back in.
  const [chosen, setChosen] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(data.experts.map((e) => [e.expertId, e.slots.map((s) => s.id)])),
  );
  const [holdSlots, setHoldSlots] = useState(true);
  const sentAt = data.sentToClientAt;
  // Once sent, the panel leads on to wherever the booking is now (screens 10–13).
  const booking = useBooking(project.id, { enabled: sentAt !== null });
  const stage = sentAt ? booking.data?.stage : undefined;
  const next = !stage
    ? { step: 'client' as const, label: 'View the client email' }
    : stage === 'picked'
      ? { step: 'pick' as const, label: `Open ${data.clientName.split(' ')[0]}’s picks` }
      : stage === 'synced'
        ? { step: 'sync' as const, label: 'Continue to the message' }
        : { step: 'booking' as const, label: 'View booking' };
  const [messageTo, setMessageTo] = useState<ExpertAvailability | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const count = (status: ExpertAvailability['status']) =>
    data.experts.filter((e) => e.status === status).length;
  const signed = data.experts.filter((e) => e.complianceSigned).length;
  const ready = data.experts.filter(
    (e) => e.status === 'confirmed' && (chosen[e.expertId]?.length ?? 0) > 0,
  );

  const toggleSlot = (expertId: string, slotId: string, isOn: boolean) =>
    setChosen((current) => {
      const list = current[expertId] ?? [];
      return {
        ...current,
        [expertId]: isOn ? [...list, slotId] : list.filter((id) => id !== slotId),
      };
    });

  const fail = (error: unknown) => setNotice({ kind: 'error', error });

  if (data.experts.length === 0) {
    return (
      <div className={styles.root}>
        <Crumbs project={project} />
        <EmptyState
          pictogram={<CalendarPictogram aria-hidden="true" />}
          title="No experts chosen yet"
          description="Pick the experts to move forward on the screening answers screen, then confirm their times here."
          action={
            <Button as={Link} href={routes.admin.projectStep(project.id, 'responses')}>
              Go to screening answers
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Crumbs project={project} />

      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Confirm availability</h1>
          <p className={styles.subtitle}>
            The AI asked the {data.experts.length} experts who answered best for their times at{' '}
            {formatTime(data.askedAt)}. Times are shown in the client’s timezone ({data.timeZone}
            ).
          </p>
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
            title="That didn’t send."
            subtitle={toUserMessage(notice.error)}
            onClose={() => setNotice(null)}
          />
        )
      ) : null}

      <dl className={styles.stats}>
        <Stat label="Confirmed" value={String(count('confirmed'))} />
        <Stat label="Waiting" value={String(count('waiting'))} />
        <Stat label="Declined" value={String(count('declined'))} />
        <Stat label="Compliance signed" value={`${signed} / ${data.experts.length}`} />
      </dl>

      <div className={styles.layout}>
        <section aria-label="Experts and their offered times" className={styles.tablePane}>
          <p className={styles.tableHint}>
            Selected times go to the client. Select a time again to leave it out.
          </p>
          <TableContainer className={styles.tableScroll}>
            <Table size="lg" aria-label="Offered times">
              <TableHead>
                <TableRow>
                  <TableHeader>Expert</TableHeader>
                  <TableHeader>Offered slots</TableHeader>
                  <TableHeader>
                    <span className="cds--visually-hidden">Actions</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.experts.map((expert) => (
                  <TableRow key={expert.expertId} className={styles.row}>
                    <TableCell>
                      <div className={styles.expert}>
                        <span className={styles.expertTop}>
                          <span className={styles.expertName}>{expert.label}</span>
                          <StatusTag
                            tone={
                              expert.status === 'confirmed'
                                ? 'success'
                                : expert.status === 'waiting'
                                  ? 'progress'
                                  : 'error'
                            }
                            label={AVAILABILITY_STATUS_LABELS[expert.status]}
                            size="sm"
                          />
                        </span>
                        <span className={styles.expertRole}>{expert.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={styles.slots}
                        role="group"
                        aria-label={`${expert.label}’s times`}
                      >
                        {expert.slots.map((slot) => (
                          <SelectableTag
                            key={slot.id}
                            id={slot.id}
                            text={slotLabel(slot)}
                            size="md"
                            selected={chosen[expert.expertId]?.includes(slot.id) ?? false}
                            disabled={sentAt !== null}
                            onChange={(isOn: boolean) => toggleSlot(expert.expertId, slot.id, isOn)}
                          />
                        ))}
                      </div>
                      {!expert.complianceSigned ? (
                        <p className={styles.warning}>Compliance form not signed</p>
                      ) : null}
                    </TableCell>
                    <TableCell className={styles.actionCell}>
                      {/* Carbon row actions: icon buttons named by their tooltips. */}
                      {expert.complianceSigned ? (
                        <IconButton
                          kind="ghost"
                          size="sm"
                          align="top-end"
                          label="Message"
                          onClick={() => setMessageTo(expert)}
                        >
                          <Chat />
                        </IconButton>
                      ) : (
                        <IconButton
                          kind="ghost"
                          size="sm"
                          align="top-end"
                          label="Resend compliance form"
                          disabled={action.isPending}
                          onClick={() =>
                            action.mutate(
                              { action: 'resend_compliance', expertId: expert.expertId },
                              {
                                onSuccess: () =>
                                  setNotice({
                                    kind: 'success',
                                    message: `Compliance form sent again to ${expert.label}.`,
                                  }),
                                onError: fail,
                              },
                            )
                          }
                        >
                          <DocumentExport />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </section>

        <aside className={styles.panel} aria-labelledby="client-ready-title">
          <div className={styles.panelHeader}>
            <Image
              src="/images/assistant-mascot.png"
              alt=""
              width={20}
              height={24}
              className={styles.mascot}
            />
            <h2 id="client-ready-title" className={styles.panelTitle}>
              {sentAt ? 'Sent to the client' : 'Ready for the client'}
            </h2>
          </div>
          <p className={styles.panelText}>
            {sentAt
              ? `Sent to ${data.clientName} at ${formatTime(sentAt)}. ${stage ? `${data.clientName.split(' ')[0]} replied with the picks; it’s in your Inbox.` : 'Their reply with the picks lands in your Inbox.'}`
              : `${ready.length} ${ready.length === 1 ? 'expert has' : 'experts have'} times to offer. Next, send them to ${data.clientName} with their answers and free slots. They pick one or two.`}
          </p>
          <ul className={styles.clientList}>
            {data.experts.map((expert) => {
              const slots = chosen[expert.expertId]?.length ?? 0;
              return (
                <li key={expert.expertId} className={slots === 0 ? styles.clientOff : undefined}>
                  <span>{expert.clientLabel}</span>
                  <span className={styles.slotCount}>
                    {slots} {slots === 1 ? 'slot' : 'slots'}
                  </span>
                </li>
              );
            })}
          </ul>
          <Checkbox
            id="hold-slots"
            labelText="Hold these slots with the experts for 48 hours"
            checked={holdSlots}
            disabled={sentAt !== null}
            onChange={(_, { checked }) => setHoldSlots(checked)}
          />
          {sentAt ? (
            <>
              <p className={styles.sent}>
                <CheckmarkFilled aria-hidden={true} /> {ready.length} experts sent
              </p>
              <Button
                as={Link}
                href={routes.admin.projectStep(project.id, next.step)}
                renderIcon={ArrowRight}
                className={styles.send}
              >
                {next.label}
              </Button>
            </>
          ) : (
            <Button
              renderIcon={ArrowRight}
              className={styles.send}
              disabled={ready.length === 0 || action.isPending}
              onClick={() =>
                action.mutate(
                  {
                    action: 'prepare_client',
                    holdSlots,
                    experts: ready.map((e) => ({
                      expertId: e.expertId,
                      slotIds: chosen[e.expertId] ?? [],
                    })),
                  },
                  {
                    // The AI drafts the client email on the next screen; nothing is sent yet.
                    onSuccess: () => router.push(routes.admin.projectStep(project.id, 'client')),
                    onError: fail,
                  },
                )
              }
            >
              Send {ready.length} {ready.length === 1 ? 'expert' : 'experts'} to the client
            </Button>
          )}
        </aside>
      </div>

      {messageTo ? (
        <MessageModal
          expert={messageTo}
          isSending={action.isPending}
          onClose={() => setMessageTo(null)}
          onSend={(text) =>
            action.mutate(
              { action: 'message', expertId: messageTo.expertId, text },
              {
                onSuccess: () => {
                  setNotice({ kind: 'success', message: `Message sent to ${messageTo.label}.` });
                  setMessageTo(null);
                },
                onError: fail,
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Tile className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
    </Tile>
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
        <Link href={routes.admin.projectStep(project.id, 'responses')}>Screening answers</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>Confirm availability</BreadcrumbItem>
    </Breadcrumb>
  );
}

function MessageModal({
  expert,
  isSending,
  onClose,
  onSend,
}: {
  expert: ExpertAvailability;
  isSending: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const error = text.trim().length < 2 ? 'Write a short message.' : undefined;
  const [touched, setTouched] = useState(false);
  return createPortal(
    <Modal
      open
      modalHeading={`Message ${expert.label}`}
      primaryButtonText={isSending ? 'Sending…' : 'Send message'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isSending}
      onRequestClose={onClose}
      onRequestSubmit={() => {
        setTouched(true);
        if (!error) onSend(text.trim());
      }}
    >
      <TextArea
        id="expert-message"
        labelText="Message"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => setTouched(true)}
        invalid={touched && Boolean(error)}
        invalidText={error}
        maxCount={1000}
        enableCounter
      />
    </Modal>,
    document.body,
  );
}
