'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, Button, SkeletonText } from '@carbon/react';
import { Envelope as EmailPictogram } from '@carbon/pictograms-react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState, NotFoundState } from '@/shared/ui';
import { useBooking, useProject } from '../../api/queries';
import type { Booking } from '../../model/booking.schema';
import type { Project } from '../../model/project.schema';
import styles from './Booking.module.scss';

const UTC = { timeZone: 'UTC' } as const;

/** "Thu 29 Oct" (GMT). */
export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...UTC,
  });
}

/** "15:00" (GMT). */
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...UTC });
}

/** "Thu 29 Oct · 15:00". */
export function slotLabel(iso: string): string {
  return `${dayLabel(iso)} · ${timeLabel(iso)}`;
}

/** "Lukas Brandt" → "LB", for when there is no portrait. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** Circular portrait, as in the header, inbox and screen 10; initials when there is no photo. */
export function Avatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl: string | null;
  size?: 'sm' | 'md';
}) {
  const px = size === 'sm' ? 32 : 40;
  return (
    <span className={size === 'sm' ? styles.avatarSmall : styles.avatar} aria-hidden="true">
      {photoUrl ? (
        <Image src={photoUrl} alt="" width={px} height={px} className={styles.photo} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

const STEP_LABELS = {
  pick: 'Client’s picks',
  sync: 'Sync with experts',
  booking: 'Booking',
} as const;

export function BookingCrumbs({
  project,
  current,
}: {
  project: Project;
  current: keyof typeof STEP_LABELS;
}) {
  return (
    <Breadcrumb noTrailingSlash>
      <BreadcrumbItem>
        <Link href={routes.admin.projects}>Projects</Link>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <Link href={routes.admin.projectStep(project.id, 'brief')}>{project.id}</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>{STEP_LABELS[current]}</BreadcrumbItem>
    </Breadcrumb>
  );
}

function BookingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the booking" className={styles.root}>
      <SkeletonText heading width="40%" />
      <SkeletonText paragraph lineCount={10} />
    </div>
  );
}

/** Loads the project and the client's booking; until the client replies there is nothing here. */
export function BookingBoundary({
  projectId,
  current,
  children,
}: {
  projectId: string;
  current: keyof typeof STEP_LABELS;
  children: (project: Project, booking: Booking) => ReactNode;
}) {
  const project = useProject(projectId);
  const booking = useBooking(projectId);
  return (
    <AsyncBoundary
      query={project}
      errorTitle="This project didn’t load"
      loading={<BookingSkeleton />}
      notFound={
        <NotFoundState
          title="We couldn’t find that project"
          message="It may have been deleted, or the link is incomplete."
          backHref={routes.admin.projects}
          backLabel="Back to projects"
        />
      }
    >
      {(data) => (
        <AsyncBoundary
          query={booking}
          errorTitle="The booking didn’t load"
          loading={<BookingSkeleton />}
          notFound={
            <div className={styles.root}>
              <BookingCrumbs project={data} current={current} />
              <EmptyState
                pictogram={<EmailPictogram aria-hidden="true" />}
                title={`${data.contact.name.split(' ')[0]} hasn’t replied yet`}
                description="Send the experts to the client first. Their reply with the picks lands in your Inbox."
                action={
                  <Button as={Link} href={routes.admin.projectStep(data.id, 'client')}>
                    Go to send to client
                  </Button>
                }
              />
            </div>
          }
        >
          {(result) => children(data, result)}
        </AsyncBoundary>
      )}
    </AsyncBoundary>
  );
}

/** A step that needs an earlier one done first (e.g. booking before the sync). */
export function NotYet({
  project,
  current,
  title,
  description,
  href,
  label,
}: {
  project: Project;
  current: keyof typeof STEP_LABELS;
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <div className={styles.root}>
      <BookingCrumbs project={project} current={current} />
      <EmptyState
        pictogram={<EmailPictogram aria-hidden="true" />}
        title={title}
        description={description}
        action={
          <Button as={Link} href={href}>
            {label}
          </Button>
        }
      />
    </div>
  );
}
