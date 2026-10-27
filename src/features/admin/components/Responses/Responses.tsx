'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ActionableNotification,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  InlineNotification,
  ProgressBar,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ArrowRight, Email } from '@carbon/icons-react';
import { Envelope as EmailPictogram } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, NotFoundState, StatusTag } from '@/shared/ui';
import { useNudgeExperts, useProject, useResponses } from '../../api/queries';
import type { Project } from '../../model/project.schema';
import {
  ANSWER_QUALITY_LABELS,
  RESPONSE_STATUS_LABELS,
  type ExpertResponse,
  type ResponsesResult as ResponsesData,
} from '../../model/responses.schema';
import styles from './Responses.module.scss';

const PREVIEW_ANSWERS = 4;

/** PRD screen 08: who answered the screening questions, how well, and who moves forward. */
export function Responses({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const responses = useResponses(projectId);
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
      loading={<ResponsesSkeleton />}
    >
      {(data) => (
        <AsyncBoundary
          query={responses}
          errorTitle="The screening answers didn’t load"
          loading={<ResponsesSkeleton />}
        >
          {(result) => <ResponsesView project={data} data={result} />}
        </AsyncBoundary>
      )}
    </AsyncBoundary>
  );
}

function ResponsesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the screening answers" className={styles.root}>
      <SkeletonText heading width="40%" />
      <SkeletonText paragraph lineCount={8} />
    </div>
  );
}

function ResponsesView({ project, data }: { project: Project; data: ResponsesData }) {
  const router = useRouter();
  const nudge = useNudgeExperts(project.id);
  const picks = data.responses.filter((r) => r.aiPick).map((r) => r.expertId);
  const [selected, setSelected] = useState<string[]>(picks);
  const [openId, setOpenId] = useState<string | null>(
    data.responses.find((r) => r.status === 'answered')?.expertId ?? null,
  );
  const [notice, setNotice] = useState<
    { kind: 'success'; message: string } | { kind: 'error'; error: unknown } | null
  >(null);

  const count = (status: ExpertResponse['status']) =>
    data.responses.filter((r) => r.status === status).length;
  const answered = count('answered');
  const waiting = count('in_progress') + count('not_opened');
  const open = data.responses.find((r) => r.expertId === openId) ?? null;
  const isPicksChanged =
    selected.length !== picks.length || selected.some((id) => !picks.includes(id));

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((x) => x !== id)));

  const runNudge = () =>
    nudge.mutate(undefined, {
      onSuccess: ({ nudged }) =>
        setNotice({
          kind: 'success',
          message: `Reminder sent to ${nudged} ${nudged === 1 ? 'expert' : 'experts'}.`,
        }),
      onError: (error) => setNotice({ kind: 'error', error }),
    });

  if (data.responses.length === 0) {
    return (
      <div className={styles.root}>
        <ProjectCrumbs project={project} />
        <EmptyState
          pictogram={<EmailPictogram aria-hidden="true" />}
          title="No screening questions sent yet"
          description="Send the screening questions to experts from the project file’s Experts tab. Their answers will appear here."
          action={
            <Button as={Link} href={routes.admin.projectStep(project.id, 'brief')}>
              Go to the Experts tab
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <ProjectCrumbs project={project} />

      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.meta}>
            {data.sentAt ? (
              <Tag type="high-contrast" size="sm">
                Screening sent · {formatTime(data.sentAt)}
              </Tag>
            ) : null}
            {data.closesAt ? (
              <span className={styles.metaText}>
                Answers close{' '}
                {new Date(data.closesAt).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                , {formatTime(data.closesAt)}
              </span>
            ) : null}
          </div>
          <h1 className={styles.title}>
            {answered} of {data.responses.length} experts answered
          </h1>
          <ul className={styles.counts} aria-label="Response counts">
            <li>
              <strong>{answered}</strong> answered
            </li>
            <li>
              <strong>{count('in_progress')}</strong> in progress
            </li>
            <li>
              <strong>{count('not_opened')}</strong> not opened
            </li>
            <li>
              <strong>{count('declined')}</strong> declined
            </li>
          </ul>
        </div>
        <div className={styles.actions}>
          {waiting > 0 ? (
            <Button
              kind="tertiary"
              renderIcon={Email}
              disabled={nudge.isPending}
              onClick={runNudge}
            >
              Nudge {waiting} {waiting === 1 ? 'expert' : 'experts'}
            </Button>
          ) : null}
          <Button
            renderIcon={ArrowRight}
            disabled={selected.length === 0}
            onClick={() =>
              router.push(
                `${routes.admin.projectStep(project.id, 'availability')}?experts=${selected.join(',')}`,
              )
            }
          >
            Confirm availability for {selected.length}
          </Button>
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

      {data.aiNote ? (
        <div className={styles.aiNote}>
          <Image
            src="/images/assistant-mascot.png"
            alt=""
            width={20}
            height={24}
            className={styles.mascot}
          />
          <p>{data.aiNote}</p>
        </div>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.tablePane} aria-label="Experts and their answers">
          <TableContainer className={styles.tableScroll}>
            <Table size="lg" aria-label="Screening responses">
              <TableHead>
                <TableRow>
                  <TableHeader>
                    <span className="cds--visually-hidden">Move forward</span>
                  </TableHeader>
                  <TableHeader>Expert</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Answered</TableHeader>
                  <TableHeader>Answer quality</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.responses.map((response) => {
                  const isSelected = selected.includes(response.expertId);
                  const isOpen = response.expertId === openId;
                  return (
                    <TableRow
                      key={response.expertId}
                      className={`${styles.row} ${isOpen ? styles.rowOpen : ''}`}
                    >
                      <TableCell className={styles.checkCell}>
                        <Checkbox
                          id={`pick-${response.expertId}`}
                          labelText={`Move ${response.label} forward`}
                          hideLabel
                          checked={isSelected}
                          disabled={response.status !== 'answered'}
                          onChange={(_, { checked }) => toggle(response.expertId, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className={styles.expertButton}
                          aria-pressed={isOpen}
                          aria-label={`Read ${response.label}’s answers`}
                          onClick={() => setOpenId(response.expertId)}
                        >
                          <span className={styles.expertName}>{response.label}</span>
                          <span className={styles.expertRole}>{response.role}</span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <StatusTag
                          tone={
                            response.status === 'answered'
                              ? 'success'
                              : response.status === 'in_progress'
                                ? 'progress'
                                : response.status === 'declined'
                                  ? 'error'
                                  : 'neutral'
                          }
                          label={RESPONSE_STATUS_LABELS[response.status]}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className={styles.numeric}>
                        {response.answeredCount} / {data.questionCount}
                      </TableCell>
                      <TableCell>
                        {response.quality && response.qualityScore !== null ? (
                          <span className={styles.quality}>
                            <span className={styles.qualityLabel}>
                              {ANSWER_QUALITY_LABELS[response.quality]}
                            </span>
                            <ProgressBar
                              label={`Answer quality for ${response.label}`}
                              hideLabel
                              size="small"
                              value={response.qualityScore}
                              className={styles.meter}
                            />
                          </span>
                        ) : (
                          <span className={styles.muted}>Not yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <div className={styles.tableFooter}>
            <span className={styles.muted}>
              {selected.length} selected to move forward · select an expert to read their answers
            </span>
            <Button
              kind="ghost"
              size="sm"
              disabled={!isPicksChanged}
              onClick={() => setSelected(picks)}
            >
              Reset to AI picks
            </Button>
          </div>
        </section>

        <aside className={styles.answersPane} aria-label="Selected expert’s answers">
          {open ? <AnswersPanel response={open} /> : null}
        </aside>
      </div>
    </div>
  );
}

function ProjectCrumbs({ project }: { project: Project }) {
  return (
    <Breadcrumb noTrailingSlash>
      <BreadcrumbItem>
        <Link href={routes.admin.projects}>Projects</Link>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <Link href={routes.admin.projectStep(project.id, 'brief')}>{project.id}</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>Screening answers</BreadcrumbItem>
    </Breadcrumb>
  );
}

function AnswersPanel({ response }: { response: ExpertResponse }) {
  const [showAll, setShowAll] = useState(false);
  const given = response.answers.filter((a) => a.answer !== null);
  const shown = showAll ? given : given.slice(0, PREVIEW_ANSWERS);
  return (
    <section className={styles.panel} aria-labelledby="answers-title">
      <div className={styles.panelHeader}>
        <div>
          <h2 id="answers-title" className={styles.panelTitle}>
            {response.label}’s answers
          </h2>
          <p className={styles.muted}>
            {response.role}
            {response.submittedAt ? ` · submitted ${formatTime(response.submittedAt)}` : ''}
          </p>
        </div>
        {response.quality ? (
          <span className={styles.panelTag}>
            <Tag type="gray" size="sm">
              {ANSWER_QUALITY_LABELS[response.quality]} answers
            </Tag>
          </span>
        ) : null}
      </div>

      {response.summary ? (
        <div className={styles.summary}>
          <p className={styles.summaryLabel}>AI summary</p>
          <p>{response.summary}</p>
        </div>
      ) : null}

      {given.length === 0 ? (
        <p className={styles.muted}>
          {response.status === 'not_opened'
            ? 'They haven’t opened the screening questions yet.'
            : 'No answers yet.'}
        </p>
      ) : (
        <ol className={styles.answers}>
          {shown.map((answer) => {
            const index = response.answers.indexOf(answer);
            return (
              <li key={answer.questionId} className={styles.answer}>
                <p className={styles.question}>
                  Q{index + 1} · {answer.question}
                </p>
                <p>{answer.answer}</p>
              </li>
            );
          })}
        </ol>
      )}

      {given.length > PREVIEW_ANSWERS ? (
        <Button kind="tertiary" size="sm" onClick={() => setShowAll((all) => !all)}>
          {showAll ? 'Show fewer' : `Read all ${given.length} answers`}
        </Button>
      ) : null}
    </section>
  );
}
