'use client';

import Link from 'next/link';
import { Button, SkeletonText, Tag } from '@carbon/react';
import { ArrowLeft, ArrowRight, LogoLinkedin } from '@carbon/icons-react';
import { formatDate } from '@/shared/lib/dates';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, CountryFlag, NotFoundState, countryName } from '@/shared/ui';
import { useNetworkExpert } from '../../api/queries';
import { NETWORK_SECTOR_LABELS, type NetworkExpert } from '../../model/network.schema';
import { AIHint } from '../AdminHome/AIHint';
import { Avatar } from '../Calls/callParts';
import styles from './Experts.module.scss';

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "5 yrs", or "1 yr", from a role's start to its end (or now). */
function span(start: number, end: number | null, thisYear: number): string {
  const years = Math.max(1, (end ?? thisYear) - start);
  return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
}

/**
 * One expert's full record in the Xpert Network database: who they are and what they cost up
 * top, with the AI's reasons for picking them behind the mascot; then their career on the
 * left, and on the right their work with us: the projects they're matched to and their calls.
 */
export function ExpertDetail({ expertId }: { expertId: string }) {
  const expert = useNetworkExpert(expertId);
  return (
    <div className={styles.root}>
      <Link href={routes.admin.experts} className={styles.back}>
        <ArrowLeft aria-hidden={true} />
        Experts
      </Link>
      <AsyncBoundary
        query={expert}
        errorTitle="This expert didn’t load"
        notFound={
          <NotFoundState
            title="Expert not found"
            message="They may have left the network. Everyone else is still in the database."
            backHref={routes.admin.experts}
            backLabel="Back to Experts"
          />
        }
        loading={
          <div className={styles.panel} aria-busy="true" aria-label="Loading the expert">
            <SkeletonText heading width="35%" />
            <SkeletonText paragraph lineCount={8} />
          </div>
        }
      >
        {(data) => <Profile expert={data} />}
      </AsyncBoundary>
    </div>
  );
}

function Profile({ expert }: { expert: NetworkExpert }) {
  const thisYear = new Date().getUTCFullYear();
  const completed = expert.calls.filter((c) => c.status === 'completed');
  return (
    <>
      {/* Who they are, and the numbers the PM weighs before booking them. */}
      <section className={`${styles.panel} ${styles.hero}`} aria-labelledby="expert-name">
        <div className={styles.identity}>
          <Avatar
            name={expert.name}
            photoUrl={expert.photoUrl}
            size={96}
            className={styles.heroAvatar}
          />
          <div className={styles.identityText}>
            <div className={styles.nameRow}>
              <h1 id="expert-name" className={styles.heroName}>
                {expert.name}
              </h1>
              {/* The AI's reasons stay out of the way: hover or focus the mascot to read them. */}
              {expert.knownFor.length > 0 ? (
                <AIHint
                  hint="Why them?"
                  label={`Why the AI picked ${expert.name}`}
                  title="Why the AI picked them"
                  lines={expert.knownFor}
                />
              ) : null}
              {expert.compliance === 'cleared' ? (
                <Tag type="green" size="md">
                  Compliance cleared
                </Tag>
              ) : (
                <Tag type="warm-gray" size="md">
                  Compliance pending
                </Tag>
              )}
            </div>
            <p className={styles.heroHeadline}>{expert.headline}</p>
            <p className={styles.heroMeta}>
              <CountryFlag code={expert.country} />
              <span aria-hidden="true">·</span>
              <span>{NETWORK_SECTOR_LABELS[expert.sector]}</span>
            </p>
            <p className={styles.joined}>In the network since {monthYear(expert.joinedAt)}</p>
          </div>
          {expert.linkedinUrl ? (
            <Button
              kind="tertiary"
              size="md"
              href={expert.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.linkedin}
            >
              <LogoLinkedin size={16} aria-hidden={true} />
              View LinkedIn profile
              <span className="cds--visually-hidden"> (opens in a new tab)</span>
            </Button>
          ) : null}
        </div>

        <dl className={styles.stats}>
          <div>
            <dt>Rate</dt>
            <dd className={styles.statStrong}>
              {expert.rateHint ? `${expert.rateHint} an hour` : 'Not set'}
            </dd>
          </div>
          <div>
            <dt>Experience</dt>
            <dd>{expert.years} years</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{expert.projects.length}</dd>
          </div>
          <div>
            <dt>Calls taken</dt>
            <dd>{completed.length}</dd>
          </div>
          <div>
            <dt>Last worked with us</dt>
            <dd>{expert.lastEngagedAt ? formatDate(expert.lastEngagedAt) : 'Not yet'}</dd>
          </div>
        </dl>
      </section>

      {/* Experience beside Projects, the same height; Calls under Experience. */}
      <div className={styles.columns}>
        {/* Their career, newest first, as on LinkedIn. */}
        <section className={styles.panel} aria-labelledby="experience">
          <h2 id="experience" className={styles.sectionTitle}>
            Experience
          </h2>
          <ol className={styles.history}>
            {expert.history.map((job) => (
              <li key={`${job.org}-${job.startYear}`} className={styles.job}>
                <span className={styles.jobRail} aria-hidden="true">
                  <span className={styles.jobDot} />
                  <span className={styles.jobLine} />
                </span>
                <div className={styles.jobText}>
                  <p className={styles.jobTitle}>{job.title}</p>
                  <p className={styles.jobOrg}>{job.org}</p>
                  <p className={styles.jobMeta}>
                    {job.startYear} – {job.endYear ?? 'Present'} ·{' '}
                    {span(job.startYear, job.endYear, thisYear)} · {countryName(job.location)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.panel} aria-labelledby="projects">
          <h2 id="projects" className={styles.sectionTitle}>
            Projects <span className={styles.count}>{expert.projects.length}</span>
          </h2>
          {expert.projects.length === 0 ? (
            <p className={styles.muted}>
              Not matched to a live project yet. The AI considers them for every new brief in their
              sector.
            </p>
          ) : (
            <ul className={styles.linkList}>
              {expert.projects.map((project) => (
                <li key={project.id}>
                  <Link href={routes.admin.project(project.id)} className={styles.linkRow}>
                    <span className={styles.linkMain}>
                      <span className={styles.linkTitle}>{project.name}</span>
                      <span className={styles.linkMeta}>
                        {project.client} · {project.id}
                      </span>
                    </span>
                    {project.matchPercent !== null ? (
                      <span className={styles.match}>{project.matchPercent}% match</span>
                    ) : null}
                    <ArrowRight aria-hidden={true} className={styles.arrow} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${styles.panel} ${styles.callsPanel}`} aria-labelledby="calls">
          <h2 id="calls" className={styles.sectionTitle}>
            Calls <span className={styles.count}>{expert.calls.length}</span>
          </h2>
          {expert.calls.length === 0 ? (
            <p className={styles.muted}>No calls booked with them yet.</p>
          ) : (
            <ul className={styles.linkList}>
              {expert.calls.map((call) => (
                <li key={call.id}>
                  <Link href={routes.admin.callReview(call.id)} className={styles.linkRow}>
                    <span className={styles.linkMain}>
                      <span className={styles.linkTitle}>{call.client}</span>
                      <span className={styles.linkMeta}>
                        {formatDate(call.startsAt)} · {call.minutes} min · {call.projectName}
                      </span>
                    </span>
                    {call.status === 'live' ? (
                      <Tag type="red" size="sm">
                        Live now
                      </Tag>
                    ) : call.status === 'upcoming' ? (
                      <Tag type="blue" size="sm">
                        Upcoming
                      </Tag>
                    ) : (
                      <Tag type="gray" size="sm">
                        Completed
                      </Tag>
                    )}
                    <ArrowRight aria-hidden={true} className={styles.arrow} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
