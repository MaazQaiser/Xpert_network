'use client';

import { STEP_LABELS } from '../../model/steps';
import { GOAL_TYPE_LABELS, type ResearchBrief } from '../../model/brief.schema';
import type { ChatMessage } from '../../model/message.schema';
import type { TurnController } from '../../hooks/useTurn';
import { ChipGroup } from '../widgets/ChipGroup';
import { SubjectPicker } from '../widgets/SubjectPicker';
import { QuestionPicker } from '../widgets/QuestionPicker';
import { ConstraintsForm } from '../widgets/ConstraintsForm';
import { BriefSummaryCard } from '../widgets/BriefSummaryCard';
import { OptionsPanel } from '../widgets/OptionsPanel';
import { CheckoutPanel } from '../widgets/CheckoutPanel';
import { DonePanel } from '../widgets/DonePanel';

const OPTION_LABELS = {
  library: 'Buy library reports',
  custom: 'Request custom research',
  mix: 'Mix: reports plus custom research',
} as const;

type WidgetViewProps = {
  message: ChatMessage;
  brief: ResearchBrief;
  /** Latest message and nothing in flight: the widget accepts input. */
  isInteractive: boolean;
  turn: TurnController;
};

/** Renders the structured UI attached to an assistant message. */
export function WidgetView({ message, brief, isInteractive, turn }: WidgetViewProps) {
  const { widget } = message;
  if (!widget) return null;
  const isDisabled = !isInteractive;

  switch (widget.kind) {
    case 'goal-types':
      return (
        <ChipGroup
          label="Goal type"
          isDisabled={isDisabled}
          chips={widget.options.map((id) => ({ id, label: GOAL_TYPE_LABELS[id] }))}
          onPick={(chip) => {
            const goalType = widget.options.find((id) => id === chip.id);
            if (goalType) turn.send({ kind: 'goal-type', goalType }, chip.label);
          }}
        />
      );
    case 'starters':
      return (
        <ChipGroup
          label="Example objectives"
          isDisabled={isDisabled}
          chips={widget.chips}
          onPick={(chip) => turn.send({ kind: 'text', text: chip.label }, chip.label)}
        />
      );
    case 'subjects':
      return (
        <SubjectPicker
          brief={brief}
          suggestions={widget.suggestions}
          candidates={widget.candidates}
          unresolved={widget.unresolved}
          isDisabled={isDisabled}
          onAdd={(subject) => turn.send({ kind: 'subject-add', subject }, subject.label)}
          onRemove={(subject) => turn.send({ kind: 'subject-remove', subjectId: subject.id })}
          onDone={() =>
            turn.send(
              { kind: 'subjects-done' },
              `Focus on ${brief.subjects.map((s) => s.label).join(', ')}`,
            )
          }
        />
      );
    case 'questions':
      return (
        <QuestionPicker
          key={message.id}
          suggestions={widget.suggestions}
          current={brief.stepStatus.summary !== 'todo' ? brief.questions : []}
          isDisabled={isDisabled}
          onSubmit={(questions) =>
            turn.send({ kind: 'questions', questions }, `Use these ${questions.length} questions`)
          }
        />
      );
    case 'constraints':
      return (
        <ConstraintsForm
          brief={brief}
          isDisabled={isDisabled}
          onSubmit={(constraints) =>
            turn.send({ kind: 'constraints', constraints }, 'Constraints set')
          }
          onSkip={() => turn.send({ kind: 'skip', step: 'constraints' }, 'Skip for now')}
        />
      );
    case 'summary':
      return (
        <BriefSummaryCard
          brief={brief}
          isInteractive={isInteractive}
          onConfirm={() => turn.send({ kind: 'confirm-needs' }, 'Confirm needs')}
        />
      );
    case 'options':
      return (
        <OptionsPanel
          brief={brief}
          coverage={widget.coverage}
          isInteractive={isInteractive}
          onChoose={(option) => turn.send({ kind: 'choose-option', option }, OPTION_LABELS[option])}
        />
      );
    case 'checkout':
      return (
        <CheckoutPanel
          brief={brief}
          option={widget.option}
          isInteractive={isInteractive}
          onChangeOption={() =>
            turn.send(
              { kind: 'revisit', step: 'options' },
              `Back to ${STEP_LABELS.options.label.toLowerCase()}`,
            )
          }
        />
      );
    case 'done':
      return (
        <DonePanel
          option={widget.option}
          purchasedReportIds={widget.purchasedReportIds}
          requestId={widget.requestId}
        />
      );
  }
}
