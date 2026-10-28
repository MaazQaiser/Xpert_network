'use client';

import { Button, TextArea } from '@carbon/react';
import { useResetToAi, useUpdateProject } from '../../api/queries';
import { isEdited, projectPatchSchema, type Project } from '../../model/project.schema';
import type { ProjectNotice } from './ProjectFile';
import styles from './ProjectFile.module.scss';

type BriefCardProps = {
  project: Project;
  /** The brief being edited, or null. Editing starts from the page header's Edit button. */
  draft: string | null;
  onDraftChange: (draft: string | null) => void;
  onNotice: (notice: ProjectNotice) => void;
};

/**
 * The brief as plain text under the page title. It is edited from the header's Edit button;
 * once a person has edited it, "Revert to AI draft" brings the AI's version back.
 */
export function BriefCard({ project, draft, onDraftChange: setDraft, onNotice }: BriefCardProps) {
  const update = useUpdateProject(project.id);
  const reset = useResetToAi(project.id);
  const edited = isEdited(project).brief;
  const draftError =
    draft === null
      ? undefined
      : projectPatchSchema.shape.brief.safeParse(draft).error?.issues[0]?.message;

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
    <section className={styles.briefBlock} aria-labelledby="brief-title">
      <h2 id="brief-title" className="cds--visually-hidden">
        Project brief
      </h2>
      {draft === null ? (
        <p className={styles.briefText}>{project.brief}</p>
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
            autoFocus
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
      {draft === null && edited ? (
        <div>
          <Button
            kind="ghost"
            size="sm"
            onClick={() =>
              reset.mutate(
                { part: 'brief' },
                {
                  onSuccess: () =>
                    onNotice({ kind: 'success', message: 'Brief reset to the AI draft.' }),
                },
              )
            }
          >
            Revert to AI draft
          </Button>
        </div>
      ) : null}
    </section>
  );
}
