'use client';

import { useId, useState } from 'react';
import { Button, InlineLoading, usePrefix } from '@carbon/react';
import { ChevronDown, ChevronUp, CircleDash } from '@carbon/icons-react';
import type { AIPlanItem } from '@/shared/ai';
import styles from './AdminHome.module.scss';

/** A step Scio took (a tool it ran), by id: running until it reports done. */
export type ScioStep = { id: string; label: string; status: 'running' | 'done' };

type Row = { key: string; label: string; status: AIPlanItem['status'] };

/**
 * What Scio is doing while it answers: its plan when it made one (each item done, current or not
 * started), otherwise each step it takes. Shown until the answer is complete; it can be folded
 * down to the current step.
 */
export function ScioSteps({
  steps,
  plan,
  isWriting,
}: {
  steps: ScioStep[];
  plan: AIPlanItem[] | null;
  /** The answer's text has started arriving. */
  isWriting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const listId = useId();
  const hidden = `${usePrefix()}--visually-hidden`;

  const rows: Row[] = plan
    ? plan.map((item, index) => ({ key: `plan-${index}`, ...item }))
    : steps.map((step) => ({ key: step.id, label: step.label, status: step.status }));
  // Between steps (the model thinking or writing), a row says so.
  if (!rows.some((row) => row.status === 'running')) {
    rows.push({
      key: 'now',
      label: isWriting ? 'Writing the answer…' : 'Thinking…',
      status: 'running',
    });
  }
  const done = rows.filter((row) => row.status === 'done').length;
  const current = rows.find((row) => row.status === 'running');
  const shown = isOpen ? rows : rows.filter((row) => row.status === 'running');

  return (
    <section className={styles.steps} aria-label="What Scio is doing">
      {/* One polite announcement of the current step, instead of every row speaking up. */}
      <p className={hidden} aria-live="polite">
        {current?.label}
      </p>
      <ul id={listId} className={styles.stepList}>
        {shown.map((row) => (
          <li key={row.key} data-status={row.status}>
            {row.status === 'pending' ? (
              <span className={styles.stepPending}>
                <CircleDash size={16} aria-hidden="true" />
                <span>{row.label}</span>
                <span className={hidden}>: not started</span>
              </span>
            ) : (
              <InlineLoading
                status={row.status === 'done' ? 'finished' : 'active'}
                description={row.label}
                iconDescription={row.status === 'done' ? 'Done' : 'In progress'}
                aria-live="off"
              />
            )}
          </li>
        ))}
      </ul>
      {rows.length > 1 ? (
        <Button
          kind="ghost"
          size="sm"
          className={styles.stepsToggle}
          renderIcon={isOpen ? ChevronUp : ChevronDown}
          aria-expanded={isOpen}
          aria-controls={listId}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? 'Hide steps' : `Show all steps (${done} of ${rows.length} done)`}
        </Button>
      ) : null}
    </section>
  );
}
