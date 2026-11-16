'use client';

import { useId, useState } from 'react';
import {
  Button,
  IconButton,
  InlineLoading,
  InlineNotification,
  SkeletonText,
  Tag,
  TextArea,
} from '@carbon/react';
import { Add, Close, Edit, Quotes, TrashCan } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { ErrorState } from '@/shared/ui';
import {
  useAcceptRequirements,
  useBriefRequirements,
  useRevertRequirements,
  useSaveRequirements,
} from '../../api/queries';
import type {
  BriefRequirements,
  RequirementItem,
  RequirementSectionKey,
  RequirementsEdits,
} from '../../model/requirements.schema';
import styles from './RequirementsPanel.module.scss';
import { ScreeningQuestions } from './ScreeningQuestions';

type Section = BriefRequirements['sections'][number];

/** The requirements as they're saved: every section's bullets, with one change applied. */
function editsWith(
  sections: Section[],
  key: RequirementSectionKey,
  change: (items: RequirementItem[]) => { id?: string; text: string; source?: string | null }[],
): RequirementsEdits {
  return {
    sections: sections.map((section) => ({
      key: section.key,
      items: (section.key === key ? change(section.items) : section.items).map((item) => ({
        ...(item.id ? { id: item.id } : {}),
        text: item.text,
        source: item.source ?? null,
      })),
    })),
  };
}

/** Where a bullet came from: the email's words, a warning if they aren't there, or nothing. */
function Source({ item }: { item: RequirementItem }) {
  if (!item.source) return <p className={styles.source}>Not in the email.</p>;
  if (!item.sourceFound) {
    return (
      <p className={`${styles.source} ${styles.sourceMissing}`}>
        These words aren’t in the email, so check this one: “{item.source}”
      </p>
    );
  }
  return (
    <blockquote className={styles.source}>
      <span className={styles.sourceLabel}>From the email</span>“{item.source}”
    </blockquote>
  );
}

function Bullet({
  item,
  isSaving,
  onSave,
  onDelete,
}: {
  item: RequirementItem;
  isSaving: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(item.id === '');
  const [text, setText] = useState(item.text);
  const [showsSource, setShowsSource] = useState(false);
  const fieldId = useId();

  if (isEditing) {
    return (
      <li className={styles.bullet}>
        <TextArea
          id={fieldId}
          labelText={item.id ? 'Edit requirement' : 'New requirement'}
          hideLabel
          rows={2}
          value={text}
          maxLength={500}
          autoFocus
          onChange={(event) => setText(event.target.value)}
        />
        <div className={styles.editActions}>
          <Button
            size="sm"
            kind="primary"
            disabled={!text.trim() || isSaving}
            onClick={() => {
              onSave(text.trim());
              setIsEditing(false);
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            kind="ghost"
            onClick={() => {
              setText(item.text);
              setIsEditing(false);
              if (!item.id) onDelete();
            }}
          >
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.bullet}>
      <div className={styles.bulletRow}>
        <p className={styles.bulletText}>
          {item.text}
          {item.source && !item.sourceFound ? (
            <Tag size="sm" type="warm-gray" className={styles.checkTag}>
              Check source
            </Tag>
          ) : null}
        </p>
        <div className={styles.bulletActions}>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom"
            label={showsSource ? 'Hide where this came from' : 'Show where this came from'}
            aria-expanded={showsSource}
            onClick={() => setShowsSource((shown) => !shown)}
          >
            <Quotes />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom"
            label={`Edit: ${item.text}`}
            disabled={isSaving}
            onClick={() => setIsEditing(true)}
          >
            <Edit />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label={`Delete: ${item.text}`}
            disabled={isSaving}
            onClick={onDelete}
          >
            <TrashCan />
          </IconButton>
        </div>
      </div>
      {showsSource ? <Source item={item} /> : null}
    </li>
  );
}

function RequirementSection({
  section,
  isSaving,
  onChange,
}: {
  section: Section;
  isSaving: boolean;
  onChange: (change: Parameters<typeof editsWith>[2]) => void;
}) {
  // A bullet being added: shown in edit mode until it's saved or cancelled.
  const [isAdding, setIsAdding] = useState(false);
  const headingId = useId();
  const items = isAdding
    ? [...section.items, { id: '', text: '', source: null, sourceFound: false }]
    : section.items;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {section.title}
        <span className={styles.count}>{section.items.length}</span>
      </h3>
      {items.length > 0 ? (
        <ul className={styles.bullets}>
          {items.map((item) => (
            <Bullet
              key={item.id || 'new'}
              item={item}
              isSaving={isSaving}
              onSave={(text) => {
                if (item.id) {
                  onChange((list) => list.map((i) => (i.id === item.id ? { ...i, text } : i)));
                } else {
                  setIsAdding(false);
                  onChange((list) => [...list, { text, source: null }]);
                }
              }}
              onDelete={() => {
                if (item.id) onChange((list) => list.filter((i) => i.id !== item.id));
                else setIsAdding(false);
              }}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>None in the email.</p>
      )}
      {isAdding ? null : (
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Add}
          className={styles.add}
          disabled={isSaving}
          onClick={() => setIsAdding(true)}
        >
          Add to {section.title.toLowerCase()}
        </Button>
      )}
    </section>
  );
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * A brief's requirements beside the chat: the AI's bullets grouped by heading, then the screening
 * questions, each with the email's words it came from, for the project manager to edit, add to and
 * accept.
 */
export function RequirementsPanel({ briefId, onClose }: { briefId: string; onClose: () => void }) {
  const requirements = useBriefRequirements(briefId);
  const save = useSaveRequirements(briefId);
  const accept = useAcceptRequirements(briefId);
  const revert = useRevertRequirements(briefId);
  const titleId = useId();
  const data = requirements.data;
  const isSaving = save.isPending || accept.isPending || revert.isPending;
  const failed = save.error ?? accept.error ?? revert.error;

  return (
    <aside className={styles.panel} aria-labelledby={titleId}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Requirements</p>
          <h2 id={titleId} className={styles.title}>
            {data ? `${data.company}: ${data.subject}` : 'Requirements'}
          </h2>
        </div>
        <IconButton kind="ghost" size="sm" align="bottom-end" label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </header>

      {requirements.isPending ? (
        <div className={styles.body} aria-busy="true">
          <SkeletonText paragraph lineCount={8} />
        </div>
      ) : !data ? (
        <div className={styles.body}>
          <ErrorState
            title="The requirements didn’t load"
            message={toUserMessage(requirements.error)}
            onRetry={() => void requirements.refetch()}
          />
        </div>
      ) : (
        <>
          <div className={styles.body}>
            <div className={styles.status}>
              {data.status === 'accepted' ? (
                <Tag type="green" size="sm">
                  Accepted
                </Tag>
              ) : (
                <Tag type="blue" size="sm">
                  Draft
                </Tag>
              )}
              {data.edited ? (
                <Tag type="warm-gray" size="sm">
                  Edited
                </Tag>
              ) : null}
            </div>
            <div className={styles.summary}>
              <AIExplainLabel aria-label="AI extracted" />
              <p>{data.summary}</p>
            </div>
            {data.sections.map((section) => (
              <RequirementSection
                key={section.key}
                section={section}
                isSaving={isSaving}
                onChange={(change) => save.mutate(editsWith(data.sections, section.key, change))}
              />
            ))}
            <ScreeningQuestions
              questions={data.questions}
              attachment={data.attachment}
              isSaving={isSaving}
              // The bullets go along unchanged: a save always carries every section.
              onChange={(questions) =>
                save.mutate({ ...editsWith(data.sections, 'who', (items) => items), questions })
              }
            />
          </div>
          <footer className={styles.footer}>
            {failed ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn’t save that."
                subtitle={toUserMessage(failed)}
              />
            ) : null}
            {isSaving ? <InlineLoading status="active" description="Saving…" /> : null}
            {data.status === 'accepted' && data.acceptedAt ? (
              <p className={styles.accepted}>Accepted {formatTime(data.acceptedAt)}.</p>
            ) : null}
            <div className={styles.footerActions}>
              {data.edited ? (
                <Button kind="ghost" size="md" disabled={isSaving} onClick={() => revert.mutate()}>
                  Revert to AI draft
                </Button>
              ) : null}
              <Button
                kind="primary"
                size="md"
                disabled={isSaving || data.status === 'accepted'}
                onClick={() => accept.mutate()}
              >
                {data.status === 'accepted' ? 'Accepted' : 'Accept requirements'}
              </Button>
            </div>
          </footer>
        </>
      )}
    </aside>
  );
}
