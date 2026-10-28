'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Checkbox,
  ContentSwitcher,
  InlineNotification,
  ProgressBar,
  SkeletonText,
  Switch,
  Tag,
} from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatRelative } from '@/shared/lib/dates';
import { AsyncBoundary, NotFoundState, PageHeader, SelectionBar, StatusTag } from '@/shared/ui';
import {
  useGenerateShortlist,
  usePatchShortlist,
  useProject,
  useShortlist,
} from '../../api/queries';
import type {
  Shortlist as ShortlistData,
  ShortlistSize,
  ShortlistedExpert,
} from '../../model/match.schema';
import { PROJECT_STATUS_LABELS, type Project } from '../../model/project.schema';
import { ProjectSteps } from '../ProjectSteps/ProjectSteps';
import styles from './AiShortlist.module.scss';

const WEIGHT_LABELS = [
  ['requirementFit', 'Requirement fit'],
  ['seniority', 'Seniority'],
  ['pastRatings', 'Past call ratings'],
  ['availability', 'Likely availability'],
] as const;

/** PRD screen 05: the AI's ranked shortlist with question coverage. */
export function AiShortlist({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
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
      loading={
        <div aria-busy="true" aria-label="Loading the shortlist" className={styles.root}>
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={8} />
        </div>
      }
    >
      {(data) => <ShortlistShell project={data} />}
    </AsyncBoundary>
  );
}

function ShortlistShell({ project }: { project: Project }) {
  const shortlist = useShortlist(project.id);
  const generate = useGenerateShortlist(project.id);
  const router = useRouter();

  if (shortlist.isError && !shortlist.data) {
    return (
      <div className={styles.root}>
        <PageHeader
          breadcrumbs={[
            { label: 'Projects', href: routes.admin.projects },
            { label: project.id, href: routes.admin.project(project.id) },
          ]}
          title={`Top experts for ${project.name}`}
        />
        <ProjectSteps projectId={project.id} status={project.status} />
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No shortlist yet."
          subtitle="Generate one from the matched experts."
        />
        <Button
          kind="tertiary"
          onClick={() => router.push(routes.admin.projectStep(project.id, 'match'))}
        >
          Back to matches
        </Button>
      </div>
    );
  }

  return (
    <AsyncBoundary
      query={shortlist}
      errorTitle="The shortlist didn’t load"
      loading={
        <div aria-busy="true" aria-label="Loading the shortlist" className={styles.root}>
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={8} />
        </div>
      }
    >
      {(data) => (
        <ShortlistView
          project={project}
          shortlist={data}
          regenerating={generate.isPending}
          onResize={(size) => {
            generate.mutate(
              { size },
              {
                onSuccess: () => undefined,
              },
            );
          }}
        />
      )}
    </AsyncBoundary>
  );
}

function ShortlistView({
  project,
  shortlist,
  regenerating,
  onResize,
}: {
  project: Project;
  shortlist: ShortlistData;
  regenerating: boolean;
  onResize: (size: ShortlistSize) => void;
}) {
  const patch = usePatchShortlist(project.id);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedCount = shortlist.experts.filter((e) => e.selected).length;

  const toggle = (expert: ShortlistedExpert, checked: boolean) => {
    const selectedIds = shortlist.experts
      .filter((e) => (e.id === expert.id ? checked : e.selected))
      .map((e) => e.id);
    patch.mutate(
      { selectedIds },
      {
        onError: (err) => setError(err),
      },
    );
  };

  const remove = (id: string) => {
    patch.mutate(
      { removeId: id },
      {
        onSuccess: () => setNotice('Removed from the shortlist.'),
        onError: (err) => setError(err),
      },
    );
  };

  const swap = (id: string) => {
    patch.mutate(
      { swapId: id },
      {
        onSuccess: () => setNotice('Swapped with the next-best match.'),
        onError: (err) => setError(err),
      },
    );
  };

  return (
    <div className={styles.root}>
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: routes.admin.projects },
          { label: project.id, href: routes.admin.project(project.id) },
        ]}
        title={`Top ${shortlist.size} experts for ${shortProjectName(project.name)}`}
        eyebrow={
          <div className={styles.eyebrow}>
            <StatusTag tone="progress" label={PROJECT_STATUS_LABELS[project.status]} size="sm" />
            <span>
              AI generated · {formatRelative(shortlist.generatedAt)} · from{' '}
              {shortlist.fromMatchCount.toLocaleString()} matches
            </span>
          </div>
        }
        actions={
          <ContentSwitcher
            size="md"
            selectedIndex={[10, 20, 30].indexOf(shortlist.size)}
            onChange={({ index }) => {
              const next = index === undefined ? undefined : ([10, 20, 30] as const)[index];
              if (next && next !== shortlist.size) onResize(next);
            }}
          >
            <Switch name="10" text="Top 10" />
            <Switch name="20" text="Top 20" />
            <Switch name="30" text="Top 30" />
          </ContentSwitcher>
        }
      />
      <ProjectSteps projectId={project.id} status={project.status} />

      <div className={styles.weights}>
        <AIExplainLabel aria-label="Shortlist ranking" />
        {WEIGHT_LABELS.map(([key, label]) => (
          <Tag key={key} type="gray" size="sm">
            {label} {shortlist.weights[key]}%
          </Tag>
        ))}
        <div className={styles.weightActions}>
          <Button
            kind="ghost"
            size="sm"
            disabled={regenerating}
            onClick={() => onResize(shortlist.size)}
          >
            {regenerating ? 'Re-ranking…' : 'Re-rank'}
          </Button>
        </div>
      </div>

      {notice ? (
        <InlineNotification
          kind="success"
          lowContrast
          title={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}
      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t work."
          subtitle={toUserMessage(error)}
          onClose={() => setError(null)}
        />
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <h2 className={styles.heading}>Shortlisted experts</h2>
          <div className={styles.cards}>
            {shortlist.experts.map((expert) => (
              <article key={expert.id} className={styles.card} aria-labelledby={`exp-${expert.id}`}>
                <div className={styles.cardHeader}>
                  <Checkbox
                    id={`select-${expert.id}`}
                    labelText={`Select ${expert.label}`}
                    hideLabel
                    checked={expert.selected}
                    onChange={(_, { checked }) => toggle(expert, checked)}
                  />
                  <div className={styles.cardMain}>
                    <h3 id={`exp-${expert.id}`} className={styles.cardTitle}>
                      #{expert.rank} {expert.label}
                    </h3>
                    <p className={styles.cardRole}>{expert.role}</p>
                  </div>
                  <p className={styles.matchScore}>
                    {expert.matchPercent}
                    <span className={styles.matchUnit}> match</span>
                  </p>
                </div>
                <div>
                  <p className={styles.whyTitle}>Why AI picked them</p>
                  <ul className={styles.why}>
                    {expert.whyPicked.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.tags}>
                  <Tag type="blue" size="sm">
                    Covers {expert.questionsCovered} of 8 questions
                  </Tag>
                  <Tag type={expert.compliance === 'cleared' ? 'green' : 'cool-gray'} size="sm">
                    Compliance: {expert.compliance}
                  </Tag>
                </div>
                <p className={styles.rate}>
                  Rate {expert.rateHint ? `${expert.rateHint}/hr` : '[RATE]/hr'}
                </p>
                <div className={styles.cardActions}>
                  <Button kind="ghost" size="sm" disabled>
                    View profile
                  </Button>
                  <Button kind="ghost" size="sm" onClick={() => remove(expert.id)}>
                    Remove
                  </Button>
                  <Button kind="ghost" size="sm" onClick={() => swap(expert.id)}>
                    Swap with next best
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.side} aria-labelledby="coverage-title">
          <h2 id="coverage-title" className={styles.sideTitle}>
            Client question coverage
          </h2>
          <AIExplainLabel aria-label="Question coverage" />
          <ul className={styles.coverageList}>
            {shortlist.coverage.map((item, index) => (
              <li key={item.questionId} className={styles.coverageItem}>
                <div className={styles.coverageLabel}>
                  <span>
                    Q{index + 1}: {item.label}
                  </span>
                  <span>
                    {item.coveredBy}/{item.of}
                  </span>
                </div>
                <ProgressBar
                  label={`Q${index + 1} coverage`}
                  hideLabel
                  value={(item.coveredBy / item.of) * 100}
                  size="small"
                />
              </li>
            ))}
          </ul>
          {shortlist.gap ? <p className={styles.gap}>{shortlist.gap}</p> : null}
          {shortlist.gap ? (
            <Button kind="tertiary" size="md" disabled>
              Start outreach for gap
            </Button>
          ) : null}
        </aside>
      </div>

      <SelectionBar
        summary={`${selectedCount} of ${shortlist.experts.length} selected.`}
        hint="Next: AI emails each expert the client’s questions as a 15-question form."
      >
        <Button kind="tertiary" size="md" disabled>
          Send shortlist to client first
        </Button>
        <Button size="md" disabled={selectedCount === 0}>
          Pitch {selectedCount} experts
        </Button>
      </SelectionBar>
    </div>
  );
}

function shortProjectName(name: string) {
  const dash = name.indexOf(', ');
  if (dash > 0) return name.slice(0, dash).trim();
  return name;
}
