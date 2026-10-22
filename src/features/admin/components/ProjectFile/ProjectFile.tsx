'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ActionableNotification,
  Button,
  InlineNotification,
  Modal,
  SkeletonText,
  Tag,
} from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatRelative, formatTime } from '@/shared/lib/dates';
import { AsyncBoundary, NotFoundState, PageHeader, StatusTag } from '@/shared/ui';
import { useApproveProject, useConfirmFact, useProject } from '../../api/queries';
import { openConfirmations, PROJECT_STATUS_LABELS, type Project } from '../../model/project.schema';
import { ProjectSteps } from '../ProjectSteps/ProjectSteps';
import { SourceDocument } from '../SourceDocument/SourceDocument';
import { BriefCard } from './BriefCard';
import { ClarificationModal } from './ClarificationModal';
import { ExpertProfileCard } from './ExpertProfileCard';
import { QuestionsCard } from './QuestionsCard';
import styles from './ProjectFile.module.scss';

export type ProjectNotice =
  { kind: 'success'; message: string; undo?: () => void } | { kind: 'error'; error: unknown };

/** PRD screen 03: the AI-drafted project file the PM reviews before matching. */
export function ProjectFile({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  return (
    <AsyncBoundary
      query={project}
      errorTitle="This project file didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that project"
          message="It may have been deleted, or the link is incomplete."
          backHref={routes.admin.inbox}
          backLabel="Back to the inbox"
        />
      }
      loading={
        <div aria-busy="true" aria-label="Loading the project file" className={styles.root}>
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={10} />
        </div>
      }
    >
      {(data) => <ProjectFileView project={data} />}
    </AsyncBoundary>
  );
}

function ProjectFileView({ project }: { project: Project }) {
  const router = useRouter();
  const approve = useApproveProject(project.id);
  const confirm = useConfirmFact(project.id);
  const [notice, setNotice] = useState<ProjectNotice | null>(null);
  const [source, setSource] = useState<{ page: number; highlightFor: string | null }>({
    page: project.questions[0]?.page ?? 1,
    highlightFor: null,
  });
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const open = openConfirmations(project);
  const isDraft = project.status === 'draft' || project.status === 'needs_client_info';

  const showSource = (page: number, highlightFor: string) => setSource({ page, highlightFor });
  const labelFor = (id: string) => {
    const index = project.questions.findIndex((q) => q.id === id);
    if (index >= 0) return `question ${index + 1}`;
    return project.facts.find((f) => f.id === id)?.label.toLowerCase() ?? 'this item';
  };

  const runApprove = () => {
    setIsApproveOpen(false);
    approve.mutate(undefined, {
      onSuccess: () => router.push(routes.admin.projectStep(project.id, 'match')),
      onError: (error) => setNotice({ kind: 'error', error }),
    });
  };

  return (
    <div className={styles.root}>
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: routes.admin.projects },
          { label: project.id, href: routes.admin.project(project.id) },
        ]}
        title={project.name}
        eyebrow={
          <div className={styles.meta}>
            <Tag type="outline" size="sm">
              {project.id}
            </Tag>
            <StatusTag
              tone={isDraft ? 'neutral' : 'progress'}
              label={isDraft ? 'Draft · AI generated' : PROJECT_STATUS_LABELS[project.status]}
              size="sm"
            />
            <span className={styles.metaText}>
              Created from email · {formatRelative(project.createdAt)}
            </span>
          </div>
        }
        subtitle={
          <>
            Client: {project.client.name} · Contact: {project.contact.name}
            {project.source.fileName ? ` · Source: ${project.source.fileName}` : ''}
          </>
        }
        actions={
          isDraft ? (
            <>
              <Button kind="tertiary" onClick={() => setIsEmailOpen(true)}>
                Draft clarification email
              </Button>
              <Button
                renderIcon={ArrowRight}
                disabled={approve.isPending}
                onClick={() => (open.length > 0 ? setIsApproveOpen(true) : runApprove())}
              >
                {approve.isPending ? 'Approving…' : 'Approve & find experts'}
              </Button>
            </>
          ) : (
            <Button
              renderIcon={ArrowRight}
              onClick={() => router.push(routes.admin.projectStep(project.id, 'match'))}
            >
              Go to matched experts
            </Button>
          )
        }
      />

      <ProjectSteps projectId={project.id} status={project.status} />

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
            {...(notice.undo
              ? {
                  actionButtonLabel: 'Undo',
                  onActionButtonClick: () => {
                    notice.undo?.();
                    setNotice(null);
                  },
                }
              : {})}
          />
        ) : (
          <InlineNotification
            kind="error"
            lowContrast
            title="That didn’t save."
            subtitle={toUserMessage(notice.error)}
            onClose={() => setNotice(null)}
          />
        )
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <BriefCard project={project} onShowSource={showSource} onNotice={setNotice} />
          <ExpertProfileCard project={project} onNotice={setNotice} />
          <QuestionsCard project={project} onShowSource={showSource} onNotice={setNotice} />
        </div>
        <aside className={styles.side} aria-label="Source and checks">
          <SourceDocument
            title="Source document"
            fileName={project.source.fileName}
            pages={project.document.pages}
            pageCount={project.document.pageCount}
            page={source.page}
            onPageChange={(page) => setSource({ page, highlightFor: null })}
            highlightFor={source.highlightFor}
            labelFor={labelFor}
            hint="Select a page number in the brief to jump to its source"
          />

          {project.confirmations.length > 0 ? (
            <section className={styles.card} aria-labelledby="confirm-title">
              <div className={styles.cardHeader}>
                <AIExplainLabel
                  summary="Facts the AI couldn’t settle from the document."
                  basis="Missing or ambiguous budget and deadline wording"
                  aria-label="Needs confirming"
                />
                <h2 id="confirm-title" className={styles.cardTitle}>
                  Needs confirming ({open.length})
                </h2>
              </div>
              <ul className={styles.confirmations}>
                {project.confirmations.map((item) => (
                  <li key={item.id} className={styles.confirmation}>
                    <span>{item.text}</span>
                    {item.state === 'confirmed' ? (
                      <StatusTag tone="success" label="Confirmed" size="sm" />
                    ) : item.state === 'asked' ? (
                      <StatusTag
                        tone="info"
                        label={`Asked ${project.contact.name.split(' ')[0]}`}
                        size="sm"
                      />
                    ) : item.proposal ? (
                      <Button
                        kind="tertiary"
                        size="sm"
                        disabled={confirm.isPending}
                        onClick={() =>
                          confirm.mutate(
                            { confirmationId: item.id },
                            {
                              onSuccess: () =>
                                setNotice({
                                  kind: 'success',
                                  message: `Confirmed: ${item.proposal}.`,
                                }),
                              onError: (error) => setNotice({ kind: 'error', error }),
                            },
                          )
                        }
                      >
                        Confirm {item.proposal}
                      </Button>
                    ) : (
                      <Button kind="tertiary" size="sm" onClick={() => setIsEmailOpen(true)}>
                        Ask client
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={styles.card} aria-labelledby="activity-title">
            <h2 id="activity-title" className={styles.cardTitle}>
              Activity
            </h2>
            <ol className={styles.activity}>
              {project.activity.map((entry) => (
                <li key={entry.id}>
                  <time dateTime={entry.at}>{formatTime(entry.at)}</time> · {entry.text}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {isEmailOpen ? (
        <ClarificationModal
          project={project}
          onClose={() => setIsEmailOpen(false)}
          onSent={() => {
            setIsEmailOpen(false);
            setNotice({
              kind: 'success',
              message: `Email sent to ${project.contact.name}. The reply will file itself to ${project.id}.`,
            });
          }}
        />
      ) : null}

      {isApproveOpen
        ? createPortal(
            <Modal
              open
              modalHeading={`${open.length === 1 ? '1 thing still needs' : `${open.length} things still need`} confirming`}
              modalLabel={project.id}
              primaryButtonText="Approve anyway"
              secondaryButtonText="Go back"
              onRequestClose={() => setIsApproveOpen(false)}
              onRequestSubmit={runApprove}
            >
              <p className={styles.modalText}>
                The AI can start matching now and you can confirm these later. Experts are matched
                on the brief, profile and questions as they are.
              </p>
              <ul className={styles.modalList}>
                {open.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            </Modal>,
            document.body,
          )
        : null}
    </div>
  );
}
