'use client';

import type { ReactNode } from 'react';
import { SkeletonText } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, NotFoundState, PageHeader, StatusTag, type StatusTone } from '@/shared/ui';
import { useProject } from '../../api/queries';
import {
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectStatus,
} from '../../model/project.schema';
import { ProjectSteps, type ProjectStepKey } from './ProjectSteps';
import styles from './StepFrame.module.scss';

export const STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  draft: 'neutral',
  matching: 'progress',
  shortlisted: 'progress',
  pitching: 'progress',
  scheduling: 'progress',
  waiting_on_client: 'info',
  booked: 'success',
  completed: 'success',
  outreach: 'warning',
  needs_client_info: 'warning',
  archived: 'neutral',
};

/** "EV battery recycling — Europe market diligence" → "EV battery recycling". */
export function shortProjectName(name: string) {
  const dash = name.indexOf('—');
  return dash > 0 ? name.slice(0, dash).trim() : name;
}

/** Loads the project every journey screen hangs off, with a 404 that points back to Projects. */
export function ProjectGate({
  projectId,
  label,
  children,
}: {
  projectId: string;
  label: string;
  children: (project: Project) => ReactNode;
}) {
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
        <div aria-busy="true" aria-label={label} className={styles.loading}>
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={8} />
        </div>
      }
    >
      {children}
    </AsyncBoundary>
  );
}

type StepHeaderProps = {
  project: Project;
  step: ProjectStepKey;
  title: string;
  subtitle?: ReactNode;
  /** One primary action, top-right. */
  actions?: ReactNode;
  eyebrow?: ReactNode;
};

/** Breadcrumb, title, status and the steps trail shared by every project screen. */
export function StepHeader({ project, step, title, subtitle, actions, eyebrow }: StepHeaderProps) {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: routes.admin.projects },
          { label: project.id, href: routes.admin.project(project.id) },
        ]}
        title={title}
        eyebrow={
          eyebrow ?? (
            <span className={styles.meta}>
              <StatusTag
                tone={STATUS_TONE[project.status]}
                label={PROJECT_STATUS_LABELS[project.status]}
                size="sm"
              />
              <span>{project.client.name}</span>
            </span>
          )
        }
        subtitle={subtitle}
        actions={actions}
      />
      <ProjectSteps projectId={project.id} status={project.status} step={step} />
    </>
  );
}

/** Skeleton for a screen's second query while its header is already showing. */
export function StepLoading({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <SkeletonText heading width="40%" />
      <SkeletonText paragraph lineCount={6} />
    </div>
  );
}
