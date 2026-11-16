'use client';

import { useId, useState } from 'react';
import {
  Button,
  IconButton,
  InlineNotification,
  Select,
  SelectItem,
  Tag,
  TextArea,
  TextInput,
} from '@carbon/react';
import { Add, Edit, Quotes, TrashCan } from '@carbon/icons-react';
import type {
  AnswerType,
  ScreeningQuestion,
  ScreeningQuestionEdit,
} from '../../model/requirements.schema';
import styles from './RequirementsPanel.module.scss';

const ANSWER_TYPES: Record<AnswerType, string> = {
  open: 'Open response',
  single: 'Pick one',
  multi: 'Select all that apply',
};

const DQ = /\s*\(DQ\)\s*$/i;

/** The answers as the PM edits them: one per line, "(DQ)" at the end of a disqualifying one. */
const answersToText = (options: ScreeningQuestion['options']) =>
  options.map((o) => (o.disqualifies ? `${o.text} (DQ)` : o.text)).join('\n');

const textToAnswers = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line.replace(DQ, ''), disqualifies: DQ.test(line) }));

/** A question as it's saved. */
export const toQuestionEdit = (q: ScreeningQuestion | ScreeningQuestionEdit) => ({
  ...(q.id ? { id: q.id } : {}),
  text: q.text,
  answerType: q.answerType,
  options: q.options,
  condition: q.condition,
  note: q.note,
});

/** Where a question came from: the email's words, a warning if they aren't there, or nothing. */
function QuestionSource({ question }: { question: ScreeningQuestion }) {
  if (!question.source) {
    return <p className={styles.source}>Added by you, so not from the email.</p>;
  }
  if (!question.sourceFound) {
    return (
      <p className={`${styles.source} ${styles.sourceMissing}`}>
        These words aren’t in the email, so check this one: “{question.source}”
      </p>
    );
  }
  return (
    <blockquote className={`${styles.source} ${styles.sourceLines}`}>
      <span className={styles.sourceLabel}>
        {question.origin === 'client' ? 'The client’s question' : 'Checks this from the email'}
      </span>
      “{question.source}”
    </blockquote>
  );
}

function QuestionForm({
  question,
  isSaving,
  onSave,
  onCancel,
}: {
  question: ScreeningQuestion | null;
  isSaving: boolean;
  onSave: (edit: ScreeningQuestionEdit) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(question?.text ?? '');
  const [answerType, setAnswerType] = useState<AnswerType>(question?.answerType ?? 'single');
  const [answers, setAnswers] = useState(answersToText(question?.options ?? []));
  const [condition, setCondition] = useState(question?.condition ?? '');
  const [note, setNote] = useState(question?.note ?? '');
  const id = useId();
  const options = answerType === 'open' ? [] : textToAnswers(answers);
  const tooFewAnswers = answerType !== 'open' && options.length < 2;

  return (
    <div className={styles.questionForm}>
      <TextArea
        id={`${id}-text`}
        labelText={question ? 'Edit question' : 'New question'}
        rows={2}
        value={text}
        maxLength={500}
        autoFocus
        onChange={(event) => setText(event.target.value)}
      />
      <Select
        id={`${id}-type`}
        labelText="Answer"
        size="sm"
        value={answerType}
        onChange={(event) => setAnswerType(event.target.value as AnswerType)}
      >
        {Object.entries(ANSWER_TYPES).map(([value, label]) => (
          <SelectItem key={value} value={value} text={label} />
        ))}
      </Select>
      {answerType === 'open' ? null : (
        <TextArea
          id={`${id}-answers`}
          labelText="Answers, one per line"
          helperText="End an answer with (DQ) if it rules the person out."
          rows={Math.min(8, Math.max(3, options.length + 1))}
          value={answers}
          invalid={tooFewAnswers && answers.trim() !== ''}
          invalidText="Give at least two answers."
          onChange={(event) => setAnswers(event.target.value)}
        />
      )}
      <TextInput
        id={`${id}-condition`}
        labelText="Only ask if (optional)"
        size="sm"
        value={condition}
        maxLength={300}
        onChange={(event) => setCondition(event.target.value)}
      />
      <TextInput
        id={`${id}-note`}
        labelText="How to judge the answer (optional)"
        size="sm"
        value={note}
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className={styles.editActions}>
        <Button
          size="sm"
          kind="primary"
          disabled={!text.trim() || tooFewAnswers || isSaving}
          onClick={() =>
            onSave({
              ...(question ? { id: question.id } : {}),
              text: text.trim(),
              answerType,
              options,
              condition: condition.trim() || null,
              note: note.trim() || null,
            })
          }
        >
          Save
        </Button>
        <Button size="sm" kind="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Question({
  question,
  number,
  isSaving,
  onSave,
  onDelete,
}: {
  question: ScreeningQuestion;
  number: number;
  isSaving: boolean;
  onSave: (edit: ScreeningQuestionEdit) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showsSource, setShowsSource] = useState(false);

  if (isEditing) {
    return (
      <li className={styles.bullet}>
        <QuestionForm
          question={question}
          isSaving={isSaving}
          onSave={(edit) => {
            onSave(edit);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={styles.bullet}>
      <div className={styles.bulletRow}>
        <div className={styles.question}>
          {question.condition ? <p className={styles.questionMeta}>{question.condition}</p> : null}
          <p className={styles.bulletText}>
            <span className={styles.questionNumber}>Q{number}</span>
            {question.text}
            {question.origin === 'pm' ? (
              <Tag size="sm" type="cool-gray" className={styles.checkTag}>
                Yours
              </Tag>
            ) : null}
            {question.source && !question.sourceFound ? (
              <Tag size="sm" type="warm-gray" className={styles.checkTag}>
                Check source
              </Tag>
            ) : null}
          </p>
          <p className={styles.questionMeta}>{ANSWER_TYPES[question.answerType]}</p>
          {question.options.length > 0 ? (
            <ul className={styles.answers} aria-label={`Answers to Q${number}`}>
              {question.options.map((option, i) => (
                <li key={i} className={styles.answer}>
                  {option.text}
                  {option.disqualifies ? (
                    <Tag size="sm" type="red" className={styles.checkTag}>
                      DQ
                    </Tag>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {question.note ? <p className={styles.questionMeta}>{question.note}</p> : null}
        </div>
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
            label={`Edit Q${number}`}
            disabled={isSaving}
            onClick={() => setIsEditing(true)}
          >
            <Edit />
          </IconButton>
          <IconButton
            kind="ghost"
            size="sm"
            align="bottom-end"
            label={`Delete Q${number}`}
            disabled={isSaving}
            onClick={onDelete}
          >
            <TrashCan />
          </IconButton>
        </div>
      </div>
      {showsSource ? <QuestionSource question={question} /> : null}
    </li>
  );
}

/**
 * The brief's screening questions, below its requirements: what can only be learnt by asking.
 * The client's screener is shown as it came; otherwise the AI's suggestions, marked as such.
 */
export function ScreeningQuestions({
  questions,
  attachment,
  isSaving,
  onChange,
}: {
  questions: ScreeningQuestion[];
  attachment: string | null;
  isSaving: boolean;
  onChange: (questions: ScreeningQuestionEdit[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const headingId = useId();
  const fromClient = questions.some((q) => q.origin === 'client');
  const suggested = questions.some((q) => q.origin === 'ai');
  const save = (next: (ScreeningQuestion | ScreeningQuestionEdit)[]) =>
    onChange(next.map(toQuestionEdit));

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        Screening questions
        <span className={styles.count}>{questions.length}</span>
        {fromClient ? (
          <Tag size="sm" type="green">
            From the client
          </Tag>
        ) : suggested ? (
          <Tag size="sm" type="purple">
            Suggested by AI
          </Tag>
        ) : null}
      </h3>
      {!fromClient && attachment ? (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="The client may have sent their own questions."
          subtitle={`${attachment} is attached, and attachments can’t be read yet. Compare these with it.`}
        />
      ) : null}
      {questions.length > 0 || isAdding ? (
        <ol className={styles.bullets}>
          {questions.map((question, index) => (
            <Question
              key={question.id}
              question={question}
              number={index + 1}
              isSaving={isSaving}
              onSave={(edit) => save(questions.map((q) => (q.id === question.id ? edit : q)))}
              onDelete={() => save(questions.filter((q) => q.id !== question.id))}
            />
          ))}
          {isAdding ? (
            <li className={styles.bullet}>
              <QuestionForm
                question={null}
                isSaving={isSaving}
                onSave={(edit) => {
                  setIsAdding(false);
                  save([...questions, edit]);
                }}
                onCancel={() => setIsAdding(false)}
              />
            </li>
          ) : null}
        </ol>
      ) : (
        <p className={styles.empty}>Nothing in the email needs asking.</p>
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
          Add a question
        </Button>
      )}
    </section>
  );
}
