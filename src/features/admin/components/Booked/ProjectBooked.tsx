'use client';

import { useRouter } from 'next/navigation';
import {
  Button,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { CheckmarkFilled, CircleDash } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import { formatDateTime } from '@/shared/lib/dates';
import { AsyncBoundary } from '@/shared/ui';
import { useBooked } from '../../api/queries';
import type { BookedProject } from '../../model/journey.schema';
import type { Project } from '../../model/project.schema';
import { ProjectGate, StepHeader, StepLoading, shortProjectName } from '../ProjectSteps/StepFrame';
import styles from './ProjectBooked.module.scss';

/** PRD screen 15: the project is locked. Sync checklist, locked scope, briefing pack, calls. */
export function ProjectBooked({ projectId }: { projectId: string }) {
  return (
    <ProjectGate projectId={projectId} label="Loading the booked project">
      {(project) => <BookedScreen project={project} />}
    </ProjectGate>
  );
}

function BookedScreen({ project }: { project: Project }) {
  const booked = useBooked(project.id);
  const router = useRouter();
  return (
    <AsyncBoundary
      query={booked}
      errorTitle="The booked project didn’t load"
      loading={<StepLoading label="Loading the booked project" />}
      notFound={
        <div className={styles.root}>
          <StepHeader project={project} step="booked" title="Project not locked yet" />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="This project isn’t locked."
            subtitle="Send the experts to the client and lock the project after they choose."
          />
          <div>
            <Button
              kind="tertiary"
              onClick={() => router.push(routes.admin.projectStep(project.id, 'client'))}
            >
              Back to the client step
            </Button>
          </div>
        </div>
      }
    >
      {(data) => <BookedView project={project} booked={data} />}
    </AsyncBoundary>
  );
}

function BookedView({ project, booked }: { project: Project; booked: BookedProject }) {
  const router = useRouter();
  const firstCall = `call_${project.id}_1`;
  return (
    <div className={styles.root}>
      <StepHeader
        project={project}
        step="booked"
        title={`${shortProjectName(project.name)} is locked`}
        subtitle={`Scope ${booked.version} locked ${formatDateTime(booked.lockedAt)}`}
        actions={
          <Button
            disabled={booked.bookings.length === 0}
            onClick={() => router.push(routes.admin.projectCall(project.id, firstCall))}
          >
            Open call workspace
          </Button>
        }
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="calls-title">
            <h2 id="calls-title" className={styles.cardTitle}>
              Calls · {booked.bookings.length}
            </h2>
            <div className={styles.tableWrap}>
              <Table aria-label="Booked calls" size="md">
                <TableHead>
                  <TableRow>
                    <TableHeader>Expert</TableHeader>
                    <TableHeader>Time</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>
                      <span className="cds--visually-hidden">Workspace</span>
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {booked.bookings.map((b, index) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <span className={styles.expert}>
                          Expert {b.letter}
                          <span className={styles.role}>{b.role}</span>
                        </span>
                      </TableCell>
                      <TableCell>{b.slot.label}</TableCell>
                      <TableCell>
                        <Tag type={b.status === 'confirmed' ? 'green' : 'gray'} size="sm">
                          {b.status === 'confirmed' ? 'Confirmed' : b.status}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              routes.admin.projectCall(
                                project.id,
                                `call_${project.id}_${index + 1}`,
                              ),
                            )
                          }
                        >
                          Open
                          <span className="cds--visually-hidden">
                            {' '}
                            workspace for Expert {b.letter}
                          </span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="pack-title">
            <h2 id="pack-title" className={styles.cardTitle}>
              Briefing pack
            </h2>
            <p className={styles.hint}>{booked.briefingPack}</p>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="sync-title">
            <h2 id="sync-title" className={styles.cardTitle}>
              Sync checklist
            </h2>
            <ul className={styles.checklist} aria-label="Sync checklist">
              {booked.checklist.map((item) => (
                <li key={item.id} className={styles.check}>
                  {item.done ? (
                    <CheckmarkFilled className={styles.checkDone} aria-hidden="true" />
                  ) : (
                    <CircleDash aria-hidden="true" />
                  )}
                  <span>
                    {item.label}
                    <span className="cds--visually-hidden">
                      {item.done ? ' (done)' : ' (to do)'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="scope-title">
            <h2 id="scope-title" className={styles.cardTitle}>
              Locked scope {booked.version}
            </h2>
            <p className={styles.hint}>
              {project.questions.length} client questions and {project.requirements.length} expert
              requirements are frozen. Editing now saves a new version.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
