'use client';

import { useState } from 'react';
import { Button, ComboBox, DismissibleTag, InlineNotification } from '@carbon/react';
import { createId } from '@/shared/lib/id';
import { useSubjects } from '../../api/queries';
import type { ResearchBrief, Subject } from '../../model/brief.schema';
import styles from './widgets.module.scss';

const KIND_LABEL: Record<Subject['kind'], string> = {
  company: 'Company',
  region: 'Region',
  industry: 'Industry',
  timeframe: 'Time frame',
  custom: 'Custom',
};

type SubjectPickerProps = {
  brief: ResearchBrief;
  suggestions: Subject[];
  candidates: Subject[];
  unresolved: string | null;
  isDisabled: boolean;
  onAdd: (subject: Subject) => void;
  onRemove: (subject: Subject) => void;
  onDone: () => void;
};

/** F2 step 2: autocomplete, "Did you mean…", suggestions and the chosen subjects. */
export function SubjectPicker({
  brief,
  suggestions,
  candidates,
  unresolved,
  isDisabled,
  onAdd,
  onRemove,
  onDone,
}: SubjectPickerProps) {
  const subjects = useSubjects();
  const [showError, setShowError] = useState(false);
  const chosenIds = new Set(brief.subjects.map((s) => s.id));
  const available = (subjects.data ?? []).filter((s) => !chosenIds.has(s.id));

  return (
    <div className={styles.stack}>
      {candidates.length > 0 || unresolved ? (
        <div
          role="group"
          aria-label={`Matches for ${unresolved ?? 'your entry'}`}
          className={styles.candidates}
        >
          {candidates.map((candidate) => (
            <Button
              key={candidate.id}
              kind="tertiary"
              size="sm"
              disabled={isDisabled}
              onClick={() => onAdd(candidate)}
            >
              {candidate.label} · {candidate.detail}
            </Button>
          ))}
          {unresolved ? (
            <Button
              kind="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={() =>
                onAdd({
                  id: createId('custom'),
                  kind: 'custom',
                  label: unresolved,
                  detail: 'Custom subject',
                })
              }
            >
              Keep “{unresolved}” as a custom subject
            </Button>
          ) : null}
        </div>
      ) : null}

      <ComboBox
        id="subject-search"
        titleText="Search companies, regions, industries"
        helperText="Or type in the reply box below."
        placeholder="e.g. Qahwa House, Riyadh"
        items={available}
        itemToString={(item: Subject | null) => (item ? item.label : '')}
        itemToElement={(item: Subject) => (
          <span>
            {item.label}{' '}
            <span className={styles.muted}>
              · {KIND_LABEL[item.kind]} · {item.detail}
            </span>
          </span>
        )}
        selectedItem={null}
        disabled={isDisabled || subjects.isPending}
        onChange={({ selectedItem }: { selectedItem: Subject | null | undefined }) => {
          if (selectedItem) onAdd(selectedItem);
        }}
        size="md"
      />

      {suggestions.length > 0 ? (
        <div role="group" aria-label="Suggested subjects" className={styles.chips}>
          {suggestions.map((subject) => (
            <Button
              key={subject.id}
              kind="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={() => onAdd(subject)}
            >
              {subject.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div>
        <p className={styles.label} id="chosen-subjects">
          In your brief
        </p>
        {brief.subjects.length ? (
          <div className={styles.tags} aria-labelledby="chosen-subjects" role="list">
            {brief.subjects.map((subject) => (
              <span role="listitem" key={subject.id}>
                <DismissibleTag
                  text={subject.label}
                  type={subject.kind === 'custom' ? 'warm-gray' : 'blue'}
                  title={`Remove ${subject.label}`}
                  dismissTooltipLabel={`Remove ${subject.label}`}
                  disabled={isDisabled}
                  onClose={() => onRemove(subject)}
                />
              </span>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>Nothing yet. Add at least one.</p>
        )}
      </div>

      {showError && brief.subjects.length === 0 ? (
        <InlineNotification
          kind="error"
          title="Add a subject"
          subtitle="Choose at least one company, industry or region so experts know what to focus on."
          lowContrast
          hideCloseButton
        />
      ) : null}

      <div>
        <Button
          size="md"
          disabled={isDisabled}
          onClick={() => {
            if (brief.subjects.length === 0) {
              setShowError(true);
              return;
            }
            onDone();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
