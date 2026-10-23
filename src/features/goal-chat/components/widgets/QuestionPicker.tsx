'use client';

import { useState, type FormEvent } from 'react';
import { Button, Checkbox, IconButton, InlineNotification, Tag, TextInput } from '@carbon/react';
import { Add, ArrowDown, ArrowRight, ArrowUp, TrashCan } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { createId } from '@/shared/lib/id';
import type { Question } from '../../model/brief.schema';
import styles from './widgets.module.scss';

const MIN = 3;
const MAX = 10;
const PRESELECTED = 5;

type Row = { question: Question; isSelected: boolean };

type QuestionPickerProps = {
  suggestions: Question[];
  /** Questions already in the brief (revisiting): all start selected. */
  current: Question[];
  isDisabled: boolean;
  onSubmit: (questions: Question[]) => void;
};

function initialRows(suggestions: Question[], current: Question[]): Row[] {
  if (current.length) {
    const extra = suggestions.filter((s) => !current.some((c) => c.id === s.id));
    return [
      ...current.map((question) => ({ question, isSelected: true })),
      ...extra.map((question) => ({ question, isSelected: false })),
    ];
  }
  return suggestions.map((question, index) => ({
    question,
    isSelected: index < PRESELECTED || question.source === 'user',
  }));
}

/**
 * F2 step 3: AI-suggested questions as checkable cards. Reorder with Move up / Move down
 * (keyboard-accessible alternative to drag), add your own, keep 3–10.
 */
export function QuestionPicker({
  suggestions,
  current,
  isDisabled,
  onSubmit,
}: QuestionPickerProps) {
  const [rows, setRows] = useState<Row[]>(() => initialRows(suggestions, current));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const selectedCount = rows.filter((r) => r.isSelected).length;

  const move = (index: number, delta: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });
  };

  const addOwn = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (text.length < 5) {
      setError('Write the question in a few words, e.g. “Who supplies oat milk in Riyadh?”');
      return;
    }
    setRows((prev) => [
      ...prev,
      { question: { id: createId('q'), text, topic: 'custom', source: 'user' }, isSelected: true },
    ]);
    setDraft('');
    setError(null);
  };

  const submit = () => {
    if (selectedCount < MIN || selectedCount > MAX) {
      setError(`Choose between ${MIN} and ${MAX} questions — you have ${selectedCount}.`);
      return;
    }
    setError(null);
    onSubmit(rows.filter((r) => r.isSelected).map((r) => r.question));
  };

  return (
    <div className={styles.stack}>
      <div className={styles.labelRow}>
        <p className={styles.label} id="question-list-label">
          Questions in priority order
        </p>
        <AIExplainLabel size="mini" aria-label="About the suggested questions" />
      </div>
      <ol className={styles.questionList} aria-labelledby="question-list-label">
        {rows.map((row, index) => (
          <li key={row.question.id} className={styles.questionRow} data-selected={row.isSelected}>
            <Checkbox
              id={`question-${row.question.id}`}
              labelText={row.question.text}
              checked={row.isSelected}
              disabled={isDisabled}
              onChange={(_event, { checked }) =>
                setRows((prev) =>
                  prev.map((r, i) => (i === index ? { ...r, isSelected: checked } : r)),
                )
              }
            />
            <div className={styles.questionActions}>
              {row.question.source === 'user' ? (
                <Tag size="sm" type="gray">
                  Yours
                </Tag>
              ) : null}
              <IconButton
                kind="ghost"
                size="sm"
                label={`Move up: ${row.question.text}`}
                disabled={isDisabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </IconButton>
              <IconButton
                kind="ghost"
                size="sm"
                label={`Move down: ${row.question.text}`}
                disabled={isDisabled || index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </IconButton>
              {row.question.source === 'user' ? (
                <IconButton
                  kind="ghost"
                  size="sm"
                  label={`Remove: ${row.question.text}`}
                  disabled={isDisabled}
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  <TrashCan />
                </IconButton>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <form className={styles.inlineForm} onSubmit={addOwn} aria-label="Add your own question">
        <TextInput
          id="own-question"
          labelText="Add your own question"
          placeholder="e.g. Which suppliers offer 30-day payment terms?"
          value={draft}
          disabled={isDisabled}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" kind="tertiary" size="md" renderIcon={Add} disabled={isDisabled}>
          Add
        </Button>
      </form>

      {error ? (
        <InlineNotification
          kind="error"
          title="Check your questions"
          subtitle={error}
          lowContrast
          hideCloseButton
        />
      ) : null}

      <div className={styles.footer}>
        <span className={styles.muted} aria-live="polite">
          {selectedCount} selected · choose {MIN}–{MAX}
        </span>
        <Button size="md" renderIcon={ArrowRight} disabled={isDisabled} onClick={submit}>
          Use {selectedCount} {selectedCount === 1 ? 'question' : 'questions'}
        </Button>
      </div>
    </div>
  );
}
