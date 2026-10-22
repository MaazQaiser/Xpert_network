'use client';

import { useState, type FormEvent, type MouseEvent } from 'react';
import { Button, DismissibleTag, TextInput } from '@carbon/react';
import { Add } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { createId } from '@/shared/lib/id';
import { useResetToAi, useUpdateProject } from '../../api/queries';
import {
  isEdited,
  requirementTextSchema,
  type Project,
  type Requirement,
} from '../../model/project.schema';
import type { ProjectNotice } from './ProjectFile';
import styles from './ProjectFile.module.scss';

type ExpertProfileCardProps = {
  project: Project;
  onNotice: (notice: ProjectNotice) => void;
};

export function ExpertProfileCard({ project, onNotice }: ExpertProfileCardProps) {
  const update = useUpdateProject(project.id);
  const reset = useResetToAi(project.id);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const error = requirementTextSchema.safeParse(text).error?.issues[0]?.message;

  const saveRequirements = (requirements: Requirement[], message: string, undo?: Requirement[]) =>
    update.mutate(
      { requirements },
      {
        onSuccess: () =>
          onNotice({
            kind: 'success',
            message,
            ...(undo ? { undo: () => update.mutate({ requirements: undo }) } : {}),
          }),
        onError: (err) => onNotice({ kind: 'error', error: err }),
      },
    );

  const add = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (error) return;
    saveRequirements(
      [...project.requirements, { id: createId('r'), text: text.trim() }],
      `Added “${text.trim()}” to the expert profile.`,
    );
    setText('');
    setTouched(false);
    setAdding(false);
  };

  return (
    <section className={styles.card} aria-labelledby="profile-title">
      <div className={styles.cardHeader}>
        <AIExplainLabel
          summary="The profile the AI will match experts against on the next step."
          basis="Section 4 of the client’s document and the questions they asked"
          isEdited={isEdited(project).requirements}
          onRevert={() =>
            reset.mutate(
              { part: 'requirements' },
              {
                onSuccess: () =>
                  onNotice({ kind: 'success', message: 'Expert profile reset to the AI draft.' }),
              },
            )
          }
          aria-label="Expert profile needed"
        />
        <h2 id="profile-title" className={styles.cardTitle}>
          Expert profile needed
        </h2>
        <span className={styles.cardMeta}>Used to match experts on the next step</span>
      </div>
      <div className={styles.tags} role="group" aria-label="Requirements">
        {project.requirements.map((requirement) => (
          <DismissibleTag
            key={requirement.id}
            type="outline"
            text={requirement.text}
            title={`Remove “${requirement.text}”`}
            dismissTooltipLabel={`Remove “${requirement.text}”`}
            onClose={(event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              saveRequirements(
                project.requirements.filter((r) => r.id !== requirement.id),
                `Removed “${requirement.text}”.`,
                project.requirements,
              );
            }}
          />
        ))}
        {project.requirements.length === 0 ? (
          <p className={styles.cardMeta}>
            No requirements yet. Add at least one so the AI can match experts.
          </p>
        ) : null}
      </div>
      {adding ? (
        <form className={styles.inlineForm} onSubmit={add} noValidate>
          <TextInput
            id="new-requirement"
            labelText="New requirement"
            placeholder="e.g. Ran a black mass sourcing team"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => setTouched(true)}
            invalid={touched && Boolean(error)}
            invalidText={error}
            autoFocus
          />
          <Button kind="secondary" size="md" onClick={() => setAdding(false)}>
            Cancel
          </Button>
          <Button type="submit" size="md" disabled={update.isPending}>
            Add
          </Button>
        </form>
      ) : (
        <div>
          <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setAdding(true)}>
            Add requirement
          </Button>
        </div>
      )}
    </section>
  );
}
