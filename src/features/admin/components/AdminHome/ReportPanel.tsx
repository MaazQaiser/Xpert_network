'use client';

import { SkeletonText, Tag } from '@carbon/react';
import { Time } from '@carbon/icons-react';
import { formatTime } from '@/shared/lib/dates';
import type { Availability, TimeSlot } from '../../model/availability.schema';
import { ANSWER_QUALITY_LABELS, type ExpertResponse } from '../../model/responses.schema';
import { AIHint } from './AIHint';
import { ExpertPanel } from './ExpertPanel';
import styles from './ReportPanel.module.scss';

/** "Tue 27" and "14:00" in the client's timezone (GMT). */
function slotParts(slot: TimeSlot): { day: string; time: string } {
  const date = new Date(slot.startsAt);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const dayOfMonth = date.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return { day: `${weekday} ${dayOfMonth}`, time };
}

/**
 * Home chat: one expert's screening answers, in the side panel. Free times lead, then the AI's
 * one-line read, then every answer.
 */
export function ReportPanel({
  response,
  questionCount,
  times,
  position,
  total,
  onStep,
  onClose,
}: {
  response: ExpertResponse;
  questionCount: number;
  /** Everyone's free times; this expert's lead the panel. */
  times: Availability | undefined;
  /** Where this expert sits among those who answered (0-based), for Previous and Next. */
  position: number;
  total: number;
  onStep: (step: -1 | 1) => void;
  onClose: () => void;
}) {
  const name = response.name ?? response.label;
  const given = response.answers.filter((a) => a.answer !== null);
  const titleId = `report-title-${response.expertId}`;
  const row = times?.experts.find((e) => e.expertId === response.expertId);
  const facts = [
    response.years !== undefined ? `${response.years} years` : null,
    response.submittedAt ? `Answered at ${formatTime(response.submittedAt)}` : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <ExpertPanel
      person={{
        id: response.expertId,
        name,
        photoUrl: response.photoUrl,
        role: response.role,
        country: response.country,
        facts,
      }}
      label={`${name}’s report`}
      tag={
        response.quality ? (
          <Tag type={response.quality === 'strong' ? 'green' : 'gray'} size="sm">
            {ANSWER_QUALITY_LABELS[response.quality]} answers
          </Tag>
        ) : undefined
      }
      position={position}
      total={total}
      onStep={onStep}
      onClose={onClose}
    >
      {/* When they can talk comes first: it decides who goes to the client. */}
      <section className={styles.times} aria-label={`${name}’s free times`}>
        <p className={styles.timesLabel}>
          <Time aria-hidden={true} />
          Free times for a call
          {times ? <span className={styles.zone}>{times.timeZone}</span> : null}
        </p>
        {!times ? (
          <SkeletonText lineCount={1} width="60%" />
        ) : row && row.slots.length > 0 ? (
          <ul className={styles.slots}>
            {row.slots.map((slot) => {
              const { day, time } = slotParts(slot);
              return (
                <li key={slot.id} className={styles.slot}>
                  <span className={styles.slotDay}>{day}</span>
                  <span className={styles.slotTime}>{time}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.muted}>No times yet</p>
        )}
        {row && !row.complianceSigned ? (
          <p className={styles.warning}>Compliance form not signed</p>
        ) : null}
      </section>

      <section aria-labelledby={`${titleId}-answers`}>
        {/* The heading, with the AI's one-line read of the answers on its right. */}
        <div className={styles.answersHead}>
          <h3 id={`${titleId}-answers`} className={styles.answersTitle}>
            Answers{' '}
            <span className={styles.zone}>
              {given.length} of {questionCount}
            </span>
          </h3>
          {response.summary ? (
            <AIHint
              hint="AI summary"
              label={`AI summary of ${name}’s answers`}
              title="AI summary"
              lines={[response.summary]}
              note="The AI’s reading of their answers, not a verified claim."
            />
          ) : null}
        </div>
        <ol className={styles.answers} aria-label={`${name}’s answers`}>
          {given.map((answer) => {
            const index = response.answers.indexOf(answer);
            return (
              <li key={answer.questionId} className={styles.answer}>
                <p className={styles.question}>
                  <span className={styles.qNumber}>Q{index + 1}</span>
                  {answer.question}
                </p>
                <p className={styles.reply}>{answer.answer}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </ExpertPanel>
  );
}
