'use client';

import { useState } from 'react';
import {
  Button,
  DatePicker,
  DatePickerInput,
  RadioButton,
  RadioButtonGroup,
  Slider,
} from '@carbon/react';
import { addDays } from '@/shared/lib/dates';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import {
  DEPTH_LABELS,
  type Constraints,
  type Depth,
  type ResearchBrief,
} from '../../model/brief.schema';
import styles from './widgets.module.scss';

const DEPTHS: Depth[] = ['quick', 'standard', 'deep'];

function toIso(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

type ConstraintsFormProps = {
  brief: ResearchBrief;
  isDisabled: boolean;
  onSubmit: (constraints: Constraints) => void;
  onSkip: () => void;
};

/** F2 step 4: inline date picker, credit slider and depth, inside the chat. */
export function ConstraintsForm({ brief, isDisabled, onSubmit, onSkip }: ConstraintsFormProps) {
  const minDate = addDays(new Date(), 3);
  const [deadline, setDeadline] = useState<string | null>(
    brief.constraints.deadline ?? toIso(addDays(new Date(), 21)),
  );
  const [budget, setBudget] = useState<number>(brief.constraints.budgetCredits ?? 400);
  const [depth, setDepth] = useState<Depth>(brief.constraints.depth ?? 'standard');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!deadline) {
      setError('Pick a deadline at least 3 days from today, or skip for now.');
      return;
    }
    setError(null);
    onSubmit({ deadline, budgetCredits: budget, depth });
  };

  return (
    <div className={styles.stack}>
      <DatePicker
        datePickerType="single"
        dateFormat="d/m/Y"
        minDate={minDate}
        value={deadline ? new Date(`${deadline}T00:00:00`) : undefined}
        onChange={(dates: Date[]) => {
          const [first] = dates;
          setDeadline(first ? toIso(first) : null);
        }}
      >
        <DatePickerInput
          id="brief-deadline"
          labelText="Answers needed by"
          placeholder="dd/mm/yyyy"
          helperText="At least 3 days from today."
          invalid={Boolean(error)}
          invalidText={error ?? undefined}
          disabled={isDisabled}
        />
      </DatePicker>

      <div>
        <Slider
          id="brief-budget"
          labelText="Budget"
          min={50}
          max={2000}
          step={50}
          value={budget}
          disabled={isDisabled}
          hideTextInput
          formatLabel={(value: number) => `${value}`}
          onChange={({ value }: { value: number }) => setBudget(value)}
        />
        <p className={styles.muted} aria-live="polite">
          Up to {formatCreditsWithCurrency(budget)}
        </p>
      </div>

      <RadioButtonGroup
        legendText="Depth"
        name="brief-depth"
        orientation="vertical"
        valueSelected={depth}
        disabled={isDisabled}
        onChange={(value) => setDepth(value as Depth)}
      >
        {DEPTHS.map((option) => (
          <RadioButton
            key={option}
            id={`depth-${option}`}
            value={option}
            labelText={`${DEPTH_LABELS[option].label}: ${DEPTH_LABELS[option].hint}`}
          />
        ))}
      </RadioButtonGroup>

      <div className={styles.buttonRow}>
        <Button size="md" disabled={isDisabled} onClick={submit}>
          Continue
        </Button>
        <Button kind="ghost" size="md" disabled={isDisabled} onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
