'use client';

import { Fragment, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Form, InlineNotification, Tag, TextInput } from '@carbon/react';
import { ArrowRight, Renew, Send, StopFilledAlt } from '@carbon/icons-react';
import {
  AIExplainLabel,
  AIFeedback,
  AIStepIndicator,
  StreamingText,
  useAIStream,
} from '@/shared/ai';
import { createId } from '@/shared/lib/id';
import { reportAnswerSchema, type Citation, type ReportAnswer } from '../../model/report.schema';
import styles from './AskReportPanel.module.scss';

type Turn = {
  turnId: string;
  question: string;
  answer: ReportAnswer | null;
  /** The stream ended without an answer (error or Stop); the question is kept for retry. */
  failed: boolean;
};

type AskReportPanelProps = {
  itemId: string;
  /** Questions this report can answer, from the server. */
  starters: string[];
  /** Scroll the report to a cited section. */
  onCite: (sectionId: string) => void;
};

/**
 * "Ask this report" (F3, AI_NATIVE §4): answers only from this report, streamed, with
 * numbered citations into its sections, sources, feedback and follow-ups.
 */
export function AskReportPanel({ itemId, starters, onCite }: AskReportPanelProps) {
  const stream = useAIStream({ path: `/library/${itemId}/ask`, resultSchema: reportAnswerSchema });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const isStreaming = stream.status === 'streaming';

  const ask = async (question: string, turnId = createId('turn')) => {
    setTurns((current) => [
      ...current.filter((t) => t.turnId !== turnId),
      { turnId, question, answer: null, failed: false },
    ]);
    const answer = await stream.start({ turnId, question });
    setTurns((current) =>
      current.map((t) => (t.turnId === turnId ? { ...t, answer, failed: answer === null } : t)),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (question.length < 3) {
      setInputError('Ask a question of at least a few words.');
      return;
    }
    setInputError(null);
    setDraft('');
    void ask(question);
  };

  return (
    <section id="ask-report" className={styles.root} aria-labelledby="ask-heading">
      <header className={styles.header}>
        <h2 id="ask-heading" className={styles.title}>
          Ask this report
        </h2>
        <AIExplainLabel aria-label="About these answers" />
      </header>
      <div className={styles.scope}>
        <Tag type="gray" size="sm">
          Scope: this report
        </Tag>
        <span>AI can make mistakes. Check the cited sections.</span>
      </div>

      {turns.length === 0 ? (
        <div className={styles.starters} role="group" aria-label="Suggested questions">
          {starters.map((starter) => (
            <Button
              key={starter}
              kind="tertiary"
              size="sm"
              disabled={isStreaming}
              onClick={() => void ask(starter)}
            >
              {starter}
            </Button>
          ))}
        </div>
      ) : null}

      <ol className={styles.turns} aria-label="Questions and answers">
        {turns.map((turn, index) => {
          const isLast = index === turns.length - 1;
          return (
            <li key={turn.turnId} className={styles.turn}>
              <p className={styles.question}>{turn.question}</p>
              {turn.answer ? (
                <AnswerView
                  answer={turn.answer}
                  onCite={onCite}
                  onFollowUp={(q) => void ask(q)}
                  isBusy={isStreaming}
                />
              ) : isLast && isStreaming ? (
                <div className={styles.answer}>
                  <AIStepIndicator steps={stream.steps} isActive={stream.text.length === 0} />
                  {stream.text ? <StreamingText text={stream.text} isStreaming /> : null}
                  <Button kind="ghost" size="sm" renderIcon={StopFilledAlt} onClick={stream.stop}>
                    Stop
                  </Button>
                </div>
              ) : turn.failed && isLast ? (
                <div className={styles.answer}>
                  {stream.text ? <p className={styles.partial}>{stream.text}</p> : null}
                  <InlineNotification
                    kind={stream.status === 'stopped' ? 'info' : 'error'}
                    title={stream.status === 'stopped' ? 'Stopped' : 'Answer interrupted'}
                    subtitle={
                      stream.status === 'stopped'
                        ? 'You stopped this answer. Ask again to get the full answer.'
                        : (stream.errorMessage ?? 'Something went wrong. Try again.')
                    }
                    lowContrast
                    hideCloseButton
                    className={styles.notice}
                  />
                  <Button
                    kind="tertiary"
                    size="sm"
                    renderIcon={Renew}
                    onClick={() => void ask(turn.question, turn.turnId)}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Form onSubmit={onSubmit} className={styles.form} aria-label="Ask a question">
        <TextInput
          id="ask-report-input"
          labelText="Your question"
          placeholder="Ask about this report"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          invalid={Boolean(inputError)}
          invalidText={inputError ?? undefined}
          disabled={isStreaming}
          size="lg"
        />
        <Button
          type="submit"
          hasIconOnly
          renderIcon={Send}
          iconDescription="Ask"
          tooltipPosition="left"
          disabled={isStreaming}
        />
      </Form>
    </section>
  );
}

function AnswerView({
  answer,
  onCite,
  onFollowUp,
  isBusy,
}: {
  answer: ReportAnswer;
  onCite: (sectionId: string) => void;
  onFollowUp: (question: string) => void;
  isBusy: boolean;
}) {
  return (
    <div className={styles.answer}>
      {answer.text.split('\n\n').map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className={styles.answerText}>
          <CitedText text={paragraph} citations={answer.citations} onCite={onCite} />
        </p>
      ))}

      {answer.inReport ? null : (
        <div className={styles.notInReport}>
          <p className={styles.muted}>
            Need this answered? We can scope custom research with experts.
          </p>
          <Button as={Link} href="/ask" kind="tertiary" size="sm" renderIcon={ArrowRight}>
            Request research on this
          </Button>
        </div>
      )}

      {answer.citations.length > 0 ? (
        <div>
          <p className={styles.sourcesTitle}>Sources</p>
          <ol className={styles.sources}>
            {answer.citations.map((citation) => (
              <li key={citation.n}>
                <button
                  type="button"
                  className={styles.sourceLink}
                  onClick={() => onCite(citation.sectionId)}
                >
                  <span className={styles.sourceNumber}>{citation.n}</span>
                  Section: {citation.sectionTitle}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <AIFeedback responseId={answer.id} />

      {answer.followUps.length > 0 ? (
        <div className={styles.followUps} role="group" aria-label="Follow-up questions">
          {answer.followUps.map((followUp) => (
            <Button
              key={followUp}
              kind="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => onFollowUp(followUp)}
            >
              {followUp}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Turns "[1]" markers into buttons that jump to the cited section. Text stays plain. */
function CitedText({
  text,
  citations,
  onCite,
}: {
  text: string;
  citations: Citation[];
  onCite: (sectionId: string) => void;
}) {
  const parts = text.split(/(\[\d+\])/);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const citation = match ? citations.find((c) => c.n === Number(match[1])) : undefined;
        if (!citation) return <Fragment key={index}>{part}</Fragment>;
        return (
          <button
            key={index}
            type="button"
            className={styles.citation}
            aria-label={`Source ${citation.n}: ${citation.sectionTitle}`}
            title={citation.passage}
            onClick={() => onCite(citation.sectionId)}
          >
            {citation.n}
          </button>
        );
      })}
    </>
  );
}
