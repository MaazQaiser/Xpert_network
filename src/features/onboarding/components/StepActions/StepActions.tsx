'use client';

import type { ReactNode } from 'react';
import { Button } from '@carbon/react';
import { ArrowLeft, ArrowRight } from '@carbon/icons-react';
import styles from './StepActions.module.scss';

type StepActionsProps = {
  onBack?: () => void;
  primaryLabel: string;
  isBusy: boolean;
  /** Extra actions after the primary one, e.g. "Go to my home page". */
  children?: ReactNode;
};

/** Back + primary (submit) for one stepper step. Primary is always the form's submit. */
export function StepActions({ onBack, primaryLabel, isBusy, children }: StepActionsProps) {
  return (
    <div className={styles.root}>
      {onBack ? (
        <Button kind="tertiary" renderIcon={ArrowLeft} onClick={onBack} disabled={isBusy}>
          Back
        </Button>
      ) : null}
      <Button type="submit" renderIcon={ArrowRight} disabled={isBusy}>
        {primaryLabel}
      </Button>
      {children}
    </div>
  );
}
