'use client';

import { Button } from '@carbon/react';
import styles from './widgets.module.scss';

type ChipGroupProps = {
  label: string;
  chips: { id: string; label: string }[];
  isDisabled: boolean;
  onPick: (chip: { id: string; label: string }) => void;
};

/** Quick replies: starter chips that reduce the articulation barrier (AI_NATIVE §5). */
export function ChipGroup({ label, chips, isDisabled, onPick }: ChipGroupProps) {
  return (
    <div role="group" aria-label={label} className={styles.chips}>
      {chips.map((chip) => (
        <Button
          key={chip.id}
          kind="tertiary"
          size="sm"
          disabled={isDisabled}
          onClick={() => onPick(chip)}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  );
}
