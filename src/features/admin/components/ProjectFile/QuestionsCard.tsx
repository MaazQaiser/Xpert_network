'use client';

import { useState, type FormEvent } from 'react';
import { Button, IconButton, TextArea } from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { createId } from '@/shared/lib/id';
import { useResetToAi, useUpdateProject } from '../../api/queries';
import {
  isEdited,
  questionTextSchema,
  type ClientQuestion,
  type Project,
} from '../../model/project.schema';
import type { ProjectNotice } from './ProjectFile';
import styles from './ProjectFile.module.scss';

type QuestionsCardProps = {
  project: Project;
  onNotice: (notice: ProjectNotice) => void;
};

type Editing = { id: string | null; text: string; touched: boolean };

export function QuestionsCard({ project, onNotice }: QuestionsCardProps) {
  const update = useUpdateProject(project.id);
  const reset = useResetToAi(project.id);
  const [editing, setEditing] = useState<Editing | null>(null);
  const error = editing
    ? questionTextSchema.safeParse(editing.text).error?.issues[0]?.message
    : undefined;
  const count = project.questions.length;

  const saveQuestions = (questions: ClientQuestion[], message: string, undo?: ClientQuestion[]) =>
    update.mutate(
      { questions },
      {
        onSuccess: () =>
          onNotice({
            kind: 'success',
            message,
            ...(undo ? { undo: () => update.mutate({ questions: undo }) } : {}),
          }),
        onError: (err) => onNotice({ kind: 'error', error: err }),
      },
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (error) {
      setEditing({ ...editing, touched: true });
      return;
    }
    const text = editing.text.trim();
    if (editing.id === null) {
      saveQuestions(
        [...project.questions, { id: createId('q'), text, page: null }],
        `Added question ${count + 1}.`,
      );
    } else {
      saveQuestions(
        project.questions.map((q) => (q.id === editing.id ? { ...q, text } : q)),
        'Question saved.',
      );
    }
    setEditing(null);
  };

  const editor = (label: string) => (
    <form className={styles.editor} onSubmit={submit} noValidate>
      <TextArea
        id="question-editor"
        labelText={label}
        rows={2}
        value={editing?.text ?? ''}
        onChange={(event) => editing && setEditing({ ...editing, text: event.target.value })}
        onBlur={() => editing && setEditing({ ...editing, touched: true })}
        invalid={Boolean(editing?.touched && error)}
        invalidText={error}
        autoFocus
      />
      <div className={styles.editorActions}>
        <Button kind="secondary" size="sm" onClick={() => setEditing(null)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={update.isPending}>
          {editing?.id === null ? 'Add question' : 'Save question'}
        </Button>
      </div>
    </form>
  );

  return (
    <section className={styles.card} aria-labelledby="questions-title">
      <div className={styles.cardHeader}>
        <AIExplainLabel
          isEdited={isEdited(project).questions}
          onRevert={() =>
            reset.mutate(
              { part: 'questions' },
              {
                onSuccess: () =>
                  onNotice({
                    kind: 'success',
                    message: 'Screening questions reset to the AI draft.',
                  }),
              },
            )
          }
          aria-label="Screening questions"
        />
        <h2 id="questions-title" className={styles.cardTitle}>
          Screening questions · {count} found
        </h2>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Add}
          className={styles.headerAction}
          disabled={editing !== null}
          onClick={() => setEditing({ id: null, text: '', touched: false })}
        >
          Add question
        </Button>
      </div>

      {count === 0 && editing === null ? (
        <p className={styles.cardMeta}>
          No questions yet. Add the questions the client wants answered; experts answer them in the
          15-question form.
        </p>
      ) : null}

      <ol className={styles.questions}>
        {project.questions.map((question, index) => (
          <li key={question.id} className={styles.question}>
            <span className={styles.questionNumber} aria-hidden="true">
              {index + 1}
            </span>
            {editing?.id === question.id ? (
              editor(`Question ${index + 1}`)
            ) : (
              <>
                <p className={styles.questionText}>
                  <span className="cds--visually-hidden">Question {index + 1}: </span>
                  {question.text}
                </p>
                <div className={styles.questionActions}>
                  {/* Carbon ghost icon buttons with tooltips: the standard row-action pattern. */}
                  <IconButton
                    kind="ghost"
                    size="sm"
                    label={`Edit question ${index + 1}`}
                    align="top"
                    disabled={editing !== null}
                    onClick={() =>
                      setEditing({ id: question.id, text: question.text, touched: false })
                    }
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    kind="ghost"
                    size="sm"
                    label={`Delete question ${index + 1}`}
                    align="top-end"
                    disabled={editing !== null || update.isPending}
                    onClick={() =>
                      saveQuestions(
                        project.questions.filter((q) => q.id !== question.id),
                        `Deleted question ${index + 1}.`,
                        project.questions,
                      )
                    }
                  >
                    <TrashCan />
                  </IconButton>
                </div>
              </>
            )}
          </li>
        ))}
        {editing?.id === null ? (
          <li className={styles.question}>
            <span className={styles.questionNumber} aria-hidden="true">
              {count + 1}
            </span>
            {editor(`Question ${count + 1}`)}
          </li>
        ) : null}
      </ol>
    </section>
  );
}
