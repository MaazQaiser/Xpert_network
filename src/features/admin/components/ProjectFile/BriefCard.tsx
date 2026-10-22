'use client';

import { useState } from 'react';
import { Button, Modal, TextArea } from '@carbon/react';
import { Edit, Renew } from '@carbon/icons-react';
import { createPortal } from 'react-dom';
import { AIExplainLabel } from '@/shared/ai';
import { StatusTag } from '@/shared/ui';
import { useRegenerateBrief, useResetToAi, useUpdateProject } from '../../api/queries';
import { isEdited, projectPatchSchema, type Project } from '../../model/project.schema';
import type { ProjectNotice } from './ProjectFile';
import styles from './ProjectFile.module.scss';

type BriefCardProps = {
  project: Project;
  onShowSource: (page: number, sourceFor: string) => void;
  onNotice: (notice: ProjectNotice) => void;
};

export function BriefCard({ project, onShowSource, onNotice }: BriefCardProps) {
  const update = useUpdateProject(project.id);
  const regenerate = useRegenerateBrief(project.id);
  const reset = useResetToAi(project.id);
  const [draft, setDraft] = useState<string | null>(null);
  const [pendingLength, setPendingLength] = useState<'standard' | 'shorter' | null>(null);
  const edited = isEdited(project).brief;
  const nextLength = project.briefLength === 'shorter' ? 'standard' : 'shorter';
  const draftError =
    draft === null
      ? undefined
      : projectPatchSchema.shape.brief.safeParse(draft).error?.issues[0]?.message;

  const runRegenerate = (length: 'standard' | 'shorter') => {
    setPendingLength(null);
    regenerate.mutate(
      { length },
      {
        onSuccess: () =>
          onNotice({
            kind: 'success',
            message:
              length === 'shorter' ? 'The AI wrote a shorter brief.' : 'The AI rewrote the brief.',
          }),
        onError: (error) => onNotice({ kind: 'error', error }),
      },
    );
  };

  const requestRegenerate = (length: 'standard' | 'shorter') => {
    if (edited) setPendingLength(length);
    else runRegenerate(length);
  };

  const save = () => {
    if (draft === null || draftError) return;
    update.mutate(
      { brief: draft.trim() },
      {
        onSuccess: () => {
          setDraft(null);
          onNotice({ kind: 'success', message: 'Brief saved.' });
        },
        onError: (error) => onNotice({ kind: 'error', error }),
      },
    );
  };

  return (
    <section className={styles.card} aria-labelledby="brief-title">
      <div className={styles.cardHeader}>
        <AIExplainLabel
          summary="Drafted from the client’s email and document."
          basis={project.source.fileName ?? 'The client’s email'}
          isEdited={edited}
          onRevert={() =>
            reset.mutate(
              { part: 'brief' },
              {
                onSuccess: () =>
                  onNotice({ kind: 'success', message: 'Brief reset to the AI draft.' }),
              },
            )
          }
          aria-label="Project brief"
        />
        <h2 id="brief-title" className={styles.cardTitle}>
          Project brief
        </h2>
        {draft === null ? (
          <div className={styles.cardActions}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Renew}
              disabled={regenerate.isPending}
              onClick={() => requestRegenerate(project.briefLength)}
            >
              Regenerate
            </Button>
            <Button
              kind="ghost"
              size="sm"
              disabled={regenerate.isPending}
              onClick={() => requestRegenerate(nextLength)}
            >
              {nextLength === 'shorter' ? 'Shorter' : 'Longer'}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              onClick={() => setDraft(project.brief)}
            >
              Edit
            </Button>
          </div>
        ) : null}
      </div>

      {draft === null ? (
        <p className={styles.briefText} aria-busy={regenerate.isPending}>
          {project.brief}
        </p>
      ) : (
        <div className={styles.editor}>
          <TextArea
            id="brief-editor"
            labelText="Project brief"
            rows={6}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            invalid={Boolean(draftError)}
            invalidText={draftError}
            maxCount={1500}
            enableCounter
          />
          <div className={styles.editorActions}>
            <Button kind="secondary" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={Boolean(draftError) || update.isPending}>
              Save brief
            </Button>
          </div>
        </div>
      )}

      <dl className={styles.facts}>
        {project.facts.map((fact) => (
          <div key={fact.id} className={styles.fact}>
            <dt className={styles.factLabel}>{fact.label}</dt>
            <dd className={styles.factValue}>
              {fact.value ?? 'Not in doc'}
              {fact.state === 'missing' ? (
                <StatusTag tone="warning" label="Missing" size="sm" />
              ) : null}
              {fact.state === 'confirm' ? (
                <StatusTag tone="warning" label="Confirm" size="sm" />
              ) : null}
            </dd>
            {fact.page ? (
              <dd className={styles.factSource}>
                <Button
                  kind="ghost"
                  size="sm"
                  className={styles.pageRef}
                  aria-label={`Show where ${fact.label.toLowerCase()} comes from, page ${fact.page}`}
                  onClick={() => onShowSource(fact.page ?? 1, fact.id)}
                >
                  p.{fact.page}
                </Button>
              </dd>
            ) : null}
          </div>
        ))}
      </dl>

      {pendingLength
        ? createPortal(
            <Modal
              open
              danger
              modalHeading="Replace your edits?"
              primaryButtonText="Replace with AI draft"
              secondaryButtonText="Keep my edits"
              onRequestClose={() => setPendingLength(null)}
              onRequestSubmit={() => runRegenerate(pendingLength)}
            >
              <p>
                You’ve edited this brief. A new AI draft will replace your wording. You can’t undo
                this.
              </p>
            </Modal>,
            document.body,
          )
        : null}
    </section>
  );
}
