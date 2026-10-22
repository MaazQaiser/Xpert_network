'use client';

import { SkeletonText } from '@carbon/react';
import { Construct } from '@carbon/pictograms-react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState, NotFoundState, PageHeader } from '@/shared/ui';
import { useProject } from '../../api/queries';
import { ProjectSteps } from './ProjectSteps';
import styles from './ProjectSteps.module.scss';

type ProjectStepPlaceholderProps = {
  projectId: string;
  title: string;
  /** e.g. "F13 · Matched experts → AI shortlist (screens 04–05)" */
  flow: string;
  phase: number;
  description: string;
};

/** A project step planned for a later phase, kept inside the project's breadcrumb and steps. */
export function ProjectStepPlaceholder({
  projectId,
  title,
  flow,
  phase,
  description,
}: ProjectStepPlaceholderProps) {
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
        <div aria-busy="true" aria-label="Loading the project">
          <SkeletonText heading width="40%" />
        </div>
      }
    >
      {(data) => (
        <div className={styles.page}>
          <PageHeader
            breadcrumbs={[
              { label: 'Projects', href: routes.admin.projects },
              { label: data.id, href: routes.admin.project(data.id) },
            ]}
            title={title}
            subtitle={`${data.name} · ${data.client.name}`}
          />
          <ProjectSteps projectId={data.id} status={data.status} />
          <EmptyState
            pictogram={<Construct aria-hidden="true" />}
            title={`Planned for phase ${phase}`}
            description={`${flow}: ${description}`}
          />
        </div>
      )}
    </AsyncBoundary>
  );
}
