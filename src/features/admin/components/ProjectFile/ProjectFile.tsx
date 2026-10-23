'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ActionableNotification,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  InlineNotification,
  Modal,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatRelative } from '@/shared/lib/dates';
import { AsyncBoundary, NotFoundState, StatusTag } from '@/shared/ui';
import { useApproveProject, useConfirmFact, useProject } from '../../api/queries';
import { openConfirmations, PROJECT_STATUS_LABELS, type Project } from '../../model/project.schema';
import { BriefCard } from './BriefCard';
import { ClarificationModal } from './ClarificationModal';
import { ExpertProfileCard } from './ExpertProfileCard';
import { ExpertsTab } from './ExpertsTab';
import { QuestionsCard } from './QuestionsCard';
import styles from './ProjectFile.module.scss';

// Order: profile, screening questions, checks, then experts last.
const TAB_LABELS = [
  'Expert profile needed',
  'Screening questions',
  'Needs confirming',
  'Experts',
] as const;

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
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  // The brief editor opens from the header's Edit button (wireframe 03).
  const [briefDraft, setBriefDraft] = useState<string | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const open = openConfirmations(project);
  const isDraft = project.status === 'draft' || project.status === 'needs_client_info';

  const [tab, setTab] = useState(0);
  const [expertsFound, setExpertsFound] = useState(0);
  const counts = [project.requirements.length, project.questions.length, open.length, expertsFound];

  const runApprove = () => {
    setIsApproveOpen(false);
    approve.mutate(undefined, {
      onSuccess: () => router.push(routes.admin.projectStep(project.id, 'match')),
      onError: (error) => setNotice({ kind: 'error', error }),
    });
  };

  return (
    <div className={styles.root}>
      {/* Wireframe 03: breadcrumb, then the ID, status and title on the left with the actions
          beside them at the top right. No steps trail on this screen (ADMIN_PLAN §5 note). */}
      <header className={styles.header}>
        <Breadcrumb noTrailingSlash>
          <BreadcrumbItem>
            <Link href={routes.admin.projects}>Projects</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>{project.id}</BreadcrumbItem>
        </Breadcrumb>
        <div className={styles.headerRow}>
          <div className={styles.heading}>
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
            <h1 className={styles.title}>{project.name}</h1>
            <p className={styles.subtitle}>
              Client: {project.client.name} · Contact: {project.contact.name}
              {project.source.fileName ? ` · Source: ${project.source.fileName}` : ''}
            </p>
          </div>
          {/* Actions only while the file is a draft. Once approved, the next step lives in the
              Experts tab (search, screening, then "View screening answers"). */}
          {isDraft ? (
            <div className={styles.actions}>
              <Button
                kind="tertiary"
                size="md"
                className={styles.compactButton}
                disabled={briefDraft !== null}
                onClick={() => setBriefDraft(project.brief)}
              >
                Edit
              </Button>
              <Button
                kind="tertiary"
                size="md"
                className={styles.compactButton}
                onClick={() => setIsEmailOpen(true)}
              >
                Draft clarification email
              </Button>
              <Button
                size="md"
                renderIcon={ArrowRight}
                disabled={approve.isPending}
                onClick={() => (open.length > 0 ? setIsApproveOpen(true) : runApprove())}
              >
                {approve.isPending ? 'Approving…' : 'Approve & find experts'}
              </Button>
            </div>
          ) : null}
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

      <BriefCard
        project={project}
        draft={briefDraft}
        onDraftChange={setBriefDraft}
        onNotice={setNotice}
      />

      {/* Everything else about the project in one tabbed area (segmented, with counts). */}
      <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex)}>
        <TabList aria-label="Project file sections" className={styles.segmented}>
          {TAB_LABELS.map((label, index) => (
            <Tab key={label} className={styles.segment}>
              {label}
              <span className={styles.count}>{counts[index]}</span>
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel className={styles.tabPanel}>
            <ExpertProfileCard project={project} onNotice={setNotice} />
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            <QuestionsCard project={project} onNotice={setNotice} />
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            {project.confirmations.length > 0 ? (
              <section className={styles.card} aria-labelledby="confirm-title">
                <div className={styles.cardHeader}>
                  <AIExplainLabel aria-label="Needs confirming" />
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
                          className={styles.compactButton}
                          aria-label={`Confirm ${item.proposal}`}
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
                          Confirm
                        </Button>
                      ) : (
                        <Button
                          kind="tertiary"
                          size="sm"
                          className={styles.compactButton}
                          onClick={() => setIsEmailOpen(true)}
                        >
                          Ask client
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </TabPanel>
          <TabPanel className={styles.tabPanel}>
            <ExpertsTab project={project} onFound={setExpertsFound} onNotice={setNotice} />
          </TabPanel>
        </TabPanels>
      </Tabs>

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
