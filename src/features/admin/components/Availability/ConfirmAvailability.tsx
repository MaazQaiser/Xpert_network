'use client';

import { useState } from 'react';
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
  Toggle,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatRelative } from '@/shared/lib/dates';
import { AsyncBoundary, StatusTag, type StatusTone } from '@/shared/ui';
import { useAvailability, usePatchAvailability } from '../../api/queries';
import type { AvailabilityBundle, AvailabilityRow } from '../../model/journey.schema';
import type { Project } from '../../model/project.schema';
import { ProjectGate, StepHeader, StepLoading } from '../ProjectSteps/StepFrame';
import styles from './ConfirmAvailability.module.scss';

const STATUS: Record<AvailabilityRow['status'], { tone: StatusTone; label: string }> = {
  confirmed: { tone: 'success', label: 'Confirmed' },
  waiting: { tone: 'progress', label: 'Waiting' },
  declined: { tone: 'error', label: 'Declined' },
};

/** PRD screen 09: the chosen experts with confirmed slots, held for 48 hours. */
export function ConfirmAvailability({ projectId }: { projectId: string }) {
  return (
    <ProjectGate projectId={projectId} label="Loading availability">
      {(project) => <AvailabilityScreen project={project} />}
    </ProjectGate>
  );
}

function AvailabilityScreen({ project }: { project: Project }) {
  const availability = useAvailability(project.id);
  const router = useRouter();
  return (
    <AsyncBoundary
      query={availability}
      errorTitle="Availability didn’t load"
      loading={<StepLoading label="Loading availability" />}
      notFound={
        <div className={styles.root}>
          <StepHeader project={project} step="availability" title="Confirm availability" />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="No availability yet."
            subtitle="Choose experts on the responses screen first."
          />
          <div>
            <Button
              kind="tertiary"
              onClick={() => router.push(routes.admin.projectStep(project.id, 'responses'))}
            >
              Back to responses
            </Button>
          </div>
        </div>
      }
    >
      {(data) => <AvailabilityView project={project} availability={data} />}
    </AsyncBoundary>
  );
}

function AvailabilityView({
  project,
  availability,
}: {
  project: Project;
  availability: AvailabilityBundle;
}) {
  const router = useRouter();
  const patch = usePatchAvailability(project.id);
  const [error, setError] = useState<unknown>(null);
  const count = availability.experts.length;

  const stats = [
    ['Confirmed', availability.confirmed],
    ['Waiting', availability.waiting],
    ['Declined', availability.declined],
    ['Compliance signed', availability.complianceSigned],
  ] as const;

  return (
    <div className={styles.root}>
      <StepHeader
        project={project}
        step="availability"
        title={`${count} experts confirmed their times`}
        subtitle={`Asked ${formatRelative(availability.askedAt)} · times in ${availability.timezone}`}
        actions={
          <Button
            disabled={availability.confirmed === 0}
            onClick={() => router.push(routes.admin.projectStep(project.id, 'client'))}
          >
            Send {availability.confirmed} experts to the client
          </Button>
        }
      />

      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t save."
          subtitle={toUserMessage(error)}
          onClose={() => setError(null)}
        />
      ) : null}

      <ul className={styles.stats} aria-label="Availability summary">
        {stats.map(([label, value]) => (
          <li key={label} className={styles.stat}>
            <p className={styles.statValue}>{value}</p>
            <p className={styles.statLabel}>{label}</p>
          </li>
        ))}
      </ul>

      <section className={styles.hold} aria-label="Slot holds">
        <p className={styles.holdText}>
          Hold these slots for {availability.holdHours} hours so they’re still free when the client
          picks.
        </p>
        <Toggle
          id="hold-slots"
          labelText="Hold slots"
          labelA="Off"
          labelB="On"
          size="sm"
          toggled={availability.holdSlots}
          onToggle={(checked) => {
            setError(null);
            patch.mutate({ holdSlots: checked }, { onError: (err) => setError(err) });
          }}
        />
      </section>

      <div className={styles.tableWrap}>
        <Table aria-label="Expert availability" size="md">
          <TableHead>
            <TableRow>
              <TableHeader>Expert</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Free times</TableHeader>
              <TableHeader>Compliance</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {availability.experts.map((row) => {
              const status = STATUS[row.status];
              return (
                <TableRow key={row.expertId}>
                  <TableCell>
                    <span className={styles.expert}>
                      Expert {row.letter} · {row.displayId}
                      <span className={styles.role}>{row.role}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={status.tone} label={status.label} size="sm" />
                  </TableCell>
                  <TableCell>
                    <span className={styles.slots}>
                      {row.slots.map((slot) => (
                        <Tag key={slot.id} type="outline" size="sm">
                          {slot.label}
                        </Tag>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tag type={row.complianceSigned ? 'green' : 'warm-gray'} size="sm">
                      {row.complianceSigned ? 'Signed' : 'Not signed'}
                    </Tag>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
