'use client';

import { useState } from 'react';
import {
  Button,
  IconButton,
  InlineNotification,
  Select,
  SelectItem,
  Tag,
  TextArea,
  TextInput,
  NumberInput,
  Tile,
} from '@carbon/react';
import { TrashCan } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import { useUpdateBrief } from '../../api/queries';
import {
  DEPTH_LABELS,
  GOAL_TYPE_LABELS,
  briefPatchSchema,
  type Depth,
  type Question,
  type ResearchBrief,
} from '../../model/brief.schema';
import styles from './widgets.module.scss';

type BriefSummaryCardProps = {
  brief: ResearchBrief;
  isInteractive: boolean;
  onConfirm: () => void;
};

/**
 * F2 step 5: the editable Research Brief, labelled as AI-assembled. Human edits switch the
 * AILabel to its revert state (AI_NATIVE §3) and sync back to every step.
 */
export function BriefSummaryCard({ brief, isInteractive, onConfirm }: BriefSummaryCardProps) {
  const update = useUpdateBrief(brief.id);
  const [isEditing, setIsEditing] = useState(false);
  const [objective, setObjective] = useState(brief.objective ?? '');
  const [questions, setQuestions] = useState<Question[]>(brief.questions);
  const [deadline, setDeadline] = useState(brief.constraints.deadline ?? '');
  const [budget, setBudget] = useState<number>(brief.constraints.budgetCredits ?? 400);
  const [depth, setDepth] = useState<Depth>(brief.constraints.depth ?? 'standard');
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setObjective(brief.objective ?? '');
    setQuestions(brief.questions);
    setDeadline(brief.constraints.deadline ?? '');
    setBudget(brief.constraints.budgetCredits ?? 400);
    setDepth(brief.constraints.depth ?? 'standard');
    setError(null);
    setIsEditing(true);
  };

  const save = () => {
    const patch = {
      objective,
      questions: questions.filter((q) => q.text.trim().length > 0),
      constraints: { deadline: deadline || null, budgetCredits: budget, depth },
    };
    const parsed = briefPatchSchema.safeParse(patch);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields.');
      return;
    }
    update.mutate(parsed.data, { onSuccess: () => setIsEditing(false) });
  };

  const { constraints } = brief;

  return (
    <Tile className={styles.summary} aria-labelledby={`summary-${brief.id}`}>
      <div className={styles.summaryHeader}>
        <h3 id={`summary-${brief.id}`} className={styles.summaryTitle}>
          Research brief
        </h3>
        <AIExplainLabel
          size="xs"
          aria-label="About this research brief"
          isEdited={brief.isEditedByUser}
          {...(brief.aiSnapshot ? { onRevert: () => update.mutate({ revertToAi: true }) } : {})}
        />
      </div>

      {update.isError ? (
        <InlineNotification
          kind="error"
          title="Changes not saved"
          subtitle={toUserMessage(update.error)}
          lowContrast
          hideCloseButton
        />
      ) : null}

      {isEditing ? (
        <div className={styles.stack}>
          <TextArea
            id="summary-objective"
            labelText="Objective"
            rows={3}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
          <fieldset className={styles.stack}>
            <legend className={styles.label}>Questions</legend>
            {questions.map((question, index) => (
              <div key={question.id} className={styles.inlineForm}>
                <TextInput
                  id={`summary-question-${question.id}`}
                  labelText={`Question ${index + 1}`}
                  value={question.text}
                  onChange={(event) =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.id === question.id
                          ? { ...q, text: event.target.value, source: 'user' }
                          : q,
                      ),
                    )
                  }
                />
                <IconButton
                  kind="ghost"
                  size="md"
                  label={`Remove question ${index + 1}`}
                  onClick={() => setQuestions((prev) => prev.filter((q) => q.id !== question.id))}
                >
                  <TrashCan />
                </IconButton>
              </div>
            ))}
          </fieldset>
          <TextInput
            id="summary-deadline"
            type="date"
            labelText="Deadline"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <NumberInput
            id="summary-budget"
            label="Budget (credits)"
            min={50}
            max={5000}
            step={50}
            value={budget}
            helperText={formatCreditsWithCurrency(budget)}
            onChange={(_event, { value }) => setBudget(Number(value))}
          />
          <Select
            id="summary-depth"
            labelText="Depth"
            value={depth}
            onChange={(event) => setDepth(event.target.value as Depth)}
          >
            {(Object.keys(DEPTH_LABELS) as Depth[]).map((option) => (
              <SelectItem key={option} value={option} text={DEPTH_LABELS[option].label} />
            ))}
          </Select>
          {error ? (
            <InlineNotification
              kind="error"
              title="Check the brief"
              subtitle={error}
              lowContrast
              hideCloseButton
            />
          ) : null}
          <div className={styles.buttonRow}>
            <Button size="md" onClick={save} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button kind="ghost" size="md" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <dl className={styles.definitions}>
          <div>
            <dt>Goal</dt>
            <dd>{brief.goalType ? GOAL_TYPE_LABELS[brief.goalType] : 'Not set'}</dd>
          </div>
          <div>
            <dt>Objective</dt>
            <dd>{brief.objective ?? 'Not set'}</dd>
          </div>
          <div>
            <dt>Subjects</dt>
            <dd className={styles.tags}>
              {brief.subjects.map((subject) => (
                <Tag key={subject.id} size="sm" type="gray">
                  {subject.label}
                </Tag>
              ))}
            </dd>
          </div>
          <div>
            <dt>Questions ({brief.questions.length})</dt>
            <dd>
              <ol className={styles.numbered}>
                {brief.questions.map((question) => (
                  <li key={question.id}>{question.text}</li>
                ))}
              </ol>
            </dd>
          </div>
          <div>
            <dt>Constraints</dt>
            <dd>
              {constraints.deadline ? `By ${formatDate(constraints.deadline)}` : 'No deadline set'}{' '}
              ·{' '}
              {constraints.budgetCredits !== null
                ? `up to ${formatCreditsWithCurrency(constraints.budgetCredits)}`
                : 'budget not set'}{' '}
              · {constraints.depth ? DEPTH_LABELS[constraints.depth].label : 'Standard'}
              {brief.stepStatus.constraints === 'attention' ? (
                <span className={styles.attention}>; we’ll suggest these in any quote</span>
              ) : null}
            </dd>
          </div>
        </dl>
      )}

      {isInteractive && !isEditing ? (
        <div className={styles.buttonRow}>
          <Button size="md" onClick={onConfirm}>
            Confirm needs
          </Button>
          <Button kind="tertiary" size="md" onClick={startEditing}>
            Edit
          </Button>
        </div>
      ) : null}
    </Tile>
  );
}
