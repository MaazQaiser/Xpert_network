'use client';

import Link from 'next/link';
import { SkeletonText } from '@carbon/react';
import { Folder } from '@carbon/pictograms-react';
import { routes } from '@/shared/config/routes';
import { formatRelative } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, PageHeader, StatusTag, type StatusTone } from '@/shared/ui';
import { useProjects } from '../../api/queries';
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '../../model/project.schema';
import styles from './ProjectsList.module.scss';

const TONE: Record<ProjectStatus, StatusTone> = {
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

/** Interim projects list until the full table (PRD screen 24) is built. */
export function ProjectsList() {
  const projects = useProjects();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Projects"
        subtitle="Every client brief the AI turned into a project file, newest first."
      />
      <AsyncBoundary
        query={projects}
        errorTitle="Projects didn’t load"
        loading={
          <div aria-busy="true" aria-label="Loading projects">
            <SkeletonText paragraph lineCount={8} />
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            pictogram={<Folder aria-hidden="true" />}
            title="No projects yet"
            description="When a client emails a brief, the AI drafts a project file. Approve it from the inbox and it appears here."
          />
        }
      >
        {(data) => (
          <ul className={styles.list} aria-label="Projects">
            {data.map((project) => (
              <li key={project.id}>
                <Link href={routes.admin.project(project.id)} className={styles.row}>
                  <span className={styles.id}>{project.id}</span>
                  <span className={styles.name}>
                    {project.name}
                    <span className={styles.client}>
                      {project.client.name} · created {formatRelative(project.createdAt)}
                      {project.pendingExpertReviews > 0
                        ? ` · ${project.pendingExpertReviews} expert answers to review`
                        : ''}
                    </span>
                  </span>
                  <StatusTag
                    tone={TONE[project.status]}
                    label={PROJECT_STATUS_LABELS[project.status]}
                    size="sm"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>
    </div>
  );
}
