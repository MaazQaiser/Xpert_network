'use client';

import { useState, type FormEvent } from 'react';
import { Button, ContainedList, ContainedListItem, IconButton, TextInput } from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';
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

  const remove = (requirement: Requirement) =>
    saveRequirements(
      project.requirements.filter((r) => r.id !== requirement.id),
      `Removed “${requirement.text}”.`,
      project.requirements,
    );

  // A Carbon ContainedList: one row per requirement with its remove action, the add form as the
  // last row, and "Add requirement" in the list header. The AI label explains where it came from.
  return (
    <section className={styles.card} aria-labelledby="profile-title">
      <div className={styles.cardHeader}>
        <AIExplainLabel
          mark="mascot"
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
        <h2 id="profile-title" className={styles.cardTitleInline}>
          Expert profile needed
        </h2>
        <span className={styles.cardMeta}>
          The AI matches experts against these {project.requirements.length} requirements on the
          next step.
        </span>
      </div>

      <ContainedList
        label={`Requirements (${project.requirements.length})`}
        kind="on-page"
        size="md"
        className={styles.requirements}
        action={
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Add}
            disabled={adding}
            onClick={() => setAdding(true)}
          >
            Add requirement
          </Button>
        }
      >
        {project.requirements.map((requirement, index) => (
          <ContainedListItem
            key={requirement.id}
            action={
              <IconButton
                kind="ghost"
                size="sm"
                label={`Delete “${requirement.text}”`}
                align="left"
                disabled={update.isPending}
                onClick={() => remove(requirement)}
              >
                <TrashCan />
              </IconButton>
            }
          >
            <span className={styles.requirement}>
              <span className={styles.requirementNumber} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              {requirement.text}
            </span>
          </ContainedListItem>
        ))}
        {project.requirements.length === 0 && !adding ? (
          <ContainedListItem>
            <span className={styles.cardMeta}>
              No requirements yet. Add at least one so the AI can match experts.
            </span>
          </ContainedListItem>
        ) : null}
      </ContainedList>

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
      ) : null}
    </section>
  );
}
