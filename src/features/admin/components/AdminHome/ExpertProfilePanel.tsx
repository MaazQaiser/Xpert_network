'use client';

import Image from 'next/image';
import { Button } from '@carbon/react';
import { Api, Checkmark, CheckmarkFilled, LogoLinkedin } from '@carbon/icons-react';
import { formatDate } from '@/shared/lib/dates';
import { CountryFlag, countryName, XpertLogo } from '@/shared/ui';
import { EXPERT_ORIGIN_LABELS, type MatchedExpert, type WorkRole } from '../../model/match.schema';
import type { Project } from '../../model/project.schema';
import { AIHint } from './AIHint';
import { ExpertPanel } from './ExpertPanel';
import styles from './ReportPanel.module.scss';

/** "5 yrs", or "1 yr", from a role's start to its end (or now). */
function yearsBetween(job: WorkRole, thisYear: number): string {
  const span = Math.max(1, (job.endYear ?? thisYear) - job.startYear);
  return `${span} ${span === 1 ? 'yr' : 'yrs'}`;
}

/** A round portrait for the experts table; initials when there is no photo. */
export function ExpertAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md';
}) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  const px = size === 'sm' ? 24 : 32;
  return (
    <span
      className={size === 'sm' ? `${styles.rowAvatar} ${styles.rowAvatarSm}` : styles.rowAvatar}
      aria-hidden="true"
    >
      {photoUrl ? (
        <Image src={photoUrl} alt="" width={px} height={px} className={styles.photo} />
      ) : (
        initials
      )}
    </span>
  );
}

/**
 * Home chat: one ranked expert's profile, in the side panel, laid out like a profile card: the
 * portrait beside the name, the numbers the PM weighs side by side, then label-and-value rows
 * (last call, screening questions) after their LinkedIn-style experience; the AI's reasons
 * for picking them open from the mascot beside the name. The PM can pick them for the screening questions from the last row.
 */
export function ExpertProfilePanel({
  project,
  expert,
  rank,
  total,
  isSent,
  isSelected,
  onToggle,
  onStep,
  onClose,
}: {
  project: Project;
  expert: MatchedExpert;
  /** 1-based place in the ranked list. */
  rank: number;
  total: number;
  isSent: boolean;
  isSelected: boolean;
  onToggle: (on: boolean) => void;
  onStep: (step: -1 | 1) => void;
  onClose: () => void;
}) {
  const name = expert.name ?? expert.label;
  const thisYear = new Date().getUTCFullYear();
  const source = expert.source ?? 'network';

  return (
    <ExpertPanel
      variant="profile"
      person={{
        id: expert.id,
        name,
        photoUrl: expert.photoUrl,
        role: expert.role,
        facts: [],
      }}
      label={`${name}’s profile`}
      tag={
        <>
          {/* The AI's reasons stay out of the way: hover or focus the mascot to read them. */}
          <AIHint
            hint="Why them?"
            label={`Why the AI picked ${name}`}
            title="Why the AI picked them"
            lines={expert.whyPicked}
          />
        </>
      }
      action={
        expert.linkedinUrl ? (
          <Button
            kind="tertiary"
            size="sm"
            href={expert.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.inlineButton}
          >
            {/* The logo sits beside the words, not pushed to the far edge. */}
            <LogoLinkedin size={16} aria-hidden={true} />
            View LinkedIn profile
            <span className="cds--visually-hidden"> (opens in a new tab)</span>
          </Button>
        ) : undefined
      }
      position={rank - 1}
      total={total}
      onStep={onStep}
      onClose={onClose}
    >
      {/* The numbers the PM weighs first, side by side. */}
      <dl className={styles.stats}>
        <div>
          <dt>Match</dt>
          <dd className={styles.statAccent}>{expert.matchPercent}%</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>
            {expert.years} {expert.years === 1 ? 'year' : 'years'}
          </dd>
        </div>
        <div>
          <dt>Found on</dt>
          <dd className={styles.statSource}>
            {source === 'linkedin' ? (
              <LogoLinkedin size={16} aria-hidden={true} className={styles.linkedinMark} />
            ) : source === 'api' ? (
              <Api size={16} aria-hidden={true} />
            ) : (
              <XpertLogo size={16} />
            )}
            {source === 'network' ? 'Xpert' : EXPERT_ORIGIN_LABELS[source]}
          </dd>
        </div>
        <div>
          <dt>Country</dt>
          <dd>
            <CountryFlag code={expert.country} short />
          </dd>
        </div>
      </dl>

      {/* Their career, newest first, as on LinkedIn. */}
      {expert.history && expert.history.length > 0 ? (
        <section aria-labelledby={`history-${expert.id}`}>
          <h3 id={`history-${expert.id}`} className={styles.answersTitle}>
            Experience
          </h3>
          <ol className={styles.history}>
            {expert.history.map((job) => (
              <li key={`${job.org}-${job.startYear}`} className={styles.job}>
                {/* The timeline: a dot per role, joined by a line to the next. */}
                <span className={styles.jobRail} aria-hidden="true">
                  <span className={styles.jobDot} />
                  <span className={styles.jobLine} />
                </span>
                <div className={styles.jobText}>
                  <p className={styles.jobTitle}>{job.title}</p>
                  <p className={styles.jobOrg}>{job.org}</p>
                  <p className={styles.jobMeta}>
                    {job.startYear} – {job.endYear ?? 'Present'} · {yearsBetween(job, thisYear)}
                    {' · '}
                    {countryName(job.location)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Label and note on the left, the value on the right, like a settings row. */}
      <div className={styles.rows}>
        <div className={styles.settingRow}>
          <div className={styles.rowLabel}>
            <h3 className={styles.rowTitle}>Last call with us</h3>
            <p className={styles.rowNote}>
              {expert.rateHint ? (
                <>
                  Rate <strong className={styles.rate}>{expert.rateHint} an hour</strong>.
                </>
              ) : (
                'No rate set yet.'
              )}
            </p>
          </div>
          <div className={styles.rowValue}>
            {expert.lastEngagedAt ? formatDate(expert.lastEngagedAt) : 'Never'}
          </div>
        </div>

        {/* The one thing to do here: pick them for the screening questions. */}
        <div className={styles.settingRow}>
          <div className={styles.rowLabel}>
            <h3 className={styles.rowTitle} id={`pick-${expert.id}`}>
              Screening questions
            </h3>
            <p className={styles.rowNote}>
              {isSent
                ? 'Sent. Their answers will show in the chat.'
                : `Select them to receive the project’s ${project.questions.length} questions.`}
            </p>
          </div>
          {isSent ? (
            <p className={styles.sentLine}>
              <CheckmarkFilled aria-hidden={true} />
              Sent
            </p>
          ) : (
            <Button
              kind={isSelected ? 'tertiary' : 'primary'}
              size="sm"
              className={styles.inlineButton}
              aria-pressed={isSelected}
              aria-describedby={`pick-${expert.id}`}
              onClick={() => onToggle(!isSelected)}
            >
              {isSelected ? <Checkmark size={16} aria-hidden={true} /> : null}
              {isSelected ? 'Selected' : 'Select for screening'}
            </Button>
          )}
        </div>
      </div>
    </ExpertPanel>
  );
}
