'use client';

import { Tag } from '@carbon/react';
import { formatDate } from '@/shared/lib/dates';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import { DEPTH_LABELS, GOAL_TYPE_LABELS, type ResearchBrief } from '../../model/brief.schema';
import styles from './LiveBriefPanel.module.scss';

const NOT_SET = 'Not set yet';

/** Wide screens: the brief fills in live as the chat progresses (PRODUCT_PLAN F2 layout). */
export function LiveBriefPanel({ brief }: { brief: ResearchBrief }) {
  const { constraints } = brief;
  return (
    <aside className={styles.root} aria-labelledby="live-brief-heading">
      <h2 id="live-brief-heading" className={styles.heading}>
        Research brief
      </h2>
      <p className={styles.hint}>Fills in as you answer. Saved automatically.</p>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Goal</dt>
          <dd>{brief.goalType ? GOAL_TYPE_LABELS[brief.goalType] : NOT_SET}</dd>
        </div>
        <div className={styles.row}>
          <dt>Objective</dt>
          <dd>{brief.objective ?? NOT_SET}</dd>
        </div>
        <div className={styles.row}>
          <dt>Subjects</dt>
          <dd>
            {brief.subjects.length ? (
              <span className={styles.tags}>
                {brief.subjects.map((subject) => (
                  <Tag key={subject.id} size="sm" type="gray">
                    {subject.label}
                  </Tag>
                ))}
              </span>
            ) : (
              NOT_SET
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Questions</dt>
          <dd>
            {brief.questions.length ? (
              <ol className={styles.questions}>
                {brief.questions.map((question) => (
                  <li key={question.id}>{question.text}</li>
                ))}
              </ol>
            ) : (
              NOT_SET
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Deadline</dt>
          <dd>{constraints.deadline ? formatDate(constraints.deadline) : NOT_SET}</dd>
        </div>
        <div className={styles.row}>
          <dt>Budget</dt>
          <dd>
            {constraints.budgetCredits !== null
              ? `Up to ${formatCreditsWithCurrency(constraints.budgetCredits)}`
              : NOT_SET}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Depth</dt>
          <dd>{constraints.depth ? DEPTH_LABELS[constraints.depth].label : NOT_SET}</dd>
        </div>
      </dl>
    </aside>
  );
}
