'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  InlineNotification,
  Modal,
  ProgressBar,
  RadioButton,
  RadioButtonGroup,
  TextArea,
} from '@carbon/react';
import {
  Chat,
  CheckmarkFilled,
  CircleDash,
  InProgress,
  Information,
  Locked,
  Microphone,
  Pause,
  Play,
  Renew,
  Send,
  StopFilled,
  VolumeUp,
} from '@carbon/icons-react';
import { AIStepIndicator, StreamingText, useAIStream } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { createId } from '@/shared/lib/id';
import { interviewKeys, useEndInterview, useUpdateInterview } from '../../api/queries';
import {
  activeSection,
  formatElapsed,
  isLongPause,
  progressPercent,
  SKIP_REASONS,
  turnResultSchema,
  type Interview,
  type TranscriptEntry,
  type TurnInput,
} from '../../model/interview.schema';
import { useSpeech } from '../../lib/useSpeech';
import styles from './InterviewView.module.scss';

function useElapsed(interview: Interview): number {
  const [now, setNow] = useState(() => Date.now());
  const running = interview.status === 'in_progress';
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const stretch =
    running && interview.startedAt
      ? Math.max(0, Math.round((now - new Date(interview.startedAt).getTime()) / 1000))
      : 0;
  return interview.elapsedSeconds + stretch;
}

/** F9 step 2: sections on the side, the conversation in the middle, controls below. */
export function InterviewRoom({ interview }: { interview: Interview }) {
  const queryClient = useQueryClient();
  const update = useUpdateInterview(interview.id);
  const end = useEndInterview(interview.id);
  const elapsed = useElapsed(interview);
  const speech = useSpeech(interview.language === 'ar' ? 'ar' : 'en');
  const [draft, setDraft] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, setPending] = useState<TurnInput | null>(null);
  const [dialog, setDialog] = useState<'skip' | 'end' | null>(null);
  const [skipReason, setSkipReason] = useState<string>(SKIP_REASONS[0]);
  const lastSpoken = useRef<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const stream = useAIStream({
    path: `/interviews/${interview.id}/turn`,
    resultSchema: turnResultSchema,
    onDone: (result) => {
      queryClient.setQueryData(interviewKeys.detail(interview.id), result.interview);
      setPending(null);
    },
  });

  const section = activeSection(interview);
  const isVoice = interview.mode === 'voice';
  const isPaused = interview.status === 'paused';
  const isBusy = stream.status === 'streaming';
  const lastAi = [...interview.transcript].reverse().find((e) => e.speaker === 'ai');

  // Read the interviewer's newest words aloud in voice mode.
  useEffect(() => {
    if (!isVoice || isPaused || !lastAi || lastSpoken.current === lastAi.id) return;
    lastSpoken.current = lastAi.id;
    const since = interview.transcript.slice(
      interview.transcript.findLastIndex((e) => e.speaker === 'expert') + 1,
    );
    speech.speak(since.map((e) => e.text).join(' '));
  }, [isVoice, isPaused, lastAi, interview.transcript, speech]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView?.({ block: 'nearest' });
  }, [interview.transcript.length, stream.text]);

  const send = useCallback(
    (input: TurnInput) => {
      speech.stopSpeaking();
      speech.stopListening();
      setPending(input);
      void stream.start(input);
    },
    [speech, stream],
  );

  const answer = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) {
      setInputError(isVoice ? 'Say or type your answer first.' : 'Type your answer first.');
      return;
    }
    setInputError(null);
    send({ turnId: createId('turn'), action: 'answer', text: draft.trim() });
    setDraft('');
  };

  const connectionLost = stream.status === 'error';

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.roomTitleGroup}>
          <p className={styles.eyebrow}>Interview</p>
          <h1 className={styles.roomTitle}>{interview.callTitle}</h1>
        </div>
        <div className={styles.roomStatus}>
          <ProgressBar
            label="Overall progress"
            helperText={`${progressPercent(interview)}% · ${section ? `Now: ${section.title}` : 'Wrapping up'}`}
            value={progressPercent(interview)}
            max={100}
            size="small"
            className={styles.overall}
          />
          <p className={styles.elapsed}>
            <span className={styles.visuallyHidden}>Time in interview </span>
            <time>{formatElapsed(elapsed)}</time>
            <span className={styles.estimate}> / about {interview.estMinutes} min</span>
          </p>
          {isPaused ? null : (
            <Button
              kind="tertiary"
              size="md"
              renderIcon={Pause}
              disabled={isBusy || update.isPending}
              onClick={() => update.mutate({ status: 'paused' })}
            >
              Pause
            </Button>
          )}
        </div>
      </header>

      <div className={styles.roomLayout}>
        <nav className={styles.sectionNav} aria-label="Interview sections">
          <ol className={styles.sectionList}>
            {interview.sections.map((s) => (
              <li
                key={s.id}
                className={s.status === 'active' ? styles.sectionActive : styles.sectionItem}
                aria-current={s.status === 'active' ? 'step' : undefined}
              >
                {s.status === 'done' ? (
                  <CheckmarkFilled className={styles.doneIcon} aria-label="Complete" role="img" />
                ) : s.status === 'active' ? (
                  <InProgress className={styles.activeIcon} aria-label="Current" role="img" />
                ) : (
                  <CircleDash className={styles.todoIcon} aria-label="Not started" role="img" />
                )}
                <span className={styles.sectionText}>
                  <span className={styles.sectionName}>{s.title}</span>
                  <span className={styles.sectionCount}>
                    {s.answered} of {s.total}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.conversation} aria-label="Conversation">
          <ol className={styles.transcript} aria-label="Transcript">
            {interview.transcript.map((entry) => (
              <TranscriptItem key={entry.id} entry={entry} />
            ))}
            {pending && pending.action === 'answer' ? (
              <li className={styles.expertMessage}>
                <span className={styles.speaker}>You</span>
                <p>{pending.text}</p>
              </li>
            ) : null}
            {isBusy && stream.text ? (
              <li className={styles.aiMessage}>
                <span className={styles.speaker}>AI interviewer</span>
                <StreamingText text={stream.text} isStreaming />
              </li>
            ) : null}
          </ol>
          <div ref={transcriptEnd} />
          <p className={styles.visuallyHidden} aria-live="polite">
            {isBusy ? '' : lastAi ? `Interviewer: ${lastAi.text}` : ''}
          </p>
          <AIStepIndicator steps={stream.steps} isActive={isBusy && !stream.text} />

          {connectionLost && pending ? (
            <div className={styles.lost}>
              <InlineNotification
                kind="error"
                title="Connection lost"
                subtitle={`${stream.errorMessage ?? 'The connection dropped.'} You were on ${section?.title.toLowerCase() ?? 'the last section'}.`}
                lowContrast
                hideCloseButton
                className={styles.notice}
              />
              <div>
                <Button kind="primary" size="md" renderIcon={Renew} onClick={() => send(pending)}>
                  Resume
                </Button>
              </div>
            </div>
          ) : null}

          {isPaused ? (
            <PausedPanel
              interview={interview}
              onResume={() => update.mutate({ status: 'in_progress' })}
              isPending={update.isPending}
            />
          ) : (
            <>
              {isVoice ? (
                <VoiceBar
                  speech={speech}
                  disabled={isBusy}
                  onReplay={() => {
                    const since = interview.transcript.slice(
                      interview.transcript.findLastIndex((e) => e.speaker === 'expert') + 1,
                    );
                    speech.speak(since.map((e) => e.text).join(' '));
                  }}
                  onText={setDraft}
                  onError={setInputError}
                />
              ) : null}
              <Form onSubmit={answer} className={styles.composer} aria-label="Answer the question">
                <TextArea
                  id="interview-answer"
                  labelText={isVoice ? 'Your answer (what you said)' : 'Your answer'}
                  helperText="Ranges and estimates are fine. You can skip any question."
                  rows={3}
                  value={draft}
                  disabled={isBusy || connectionLost}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) answer(event);
                  }}
                  invalid={Boolean(inputError)}
                  invalidText={inputError ?? undefined}
                />
                <div className={styles.composerActions}>
                  <Button type="submit" renderIcon={Send} disabled={isBusy || connectionLost}>
                    {isVoice ? 'Done' : 'Send answer'}
                  </Button>
                  <Button
                    kind="ghost"
                    disabled={isBusy || connectionLost}
                    onClick={() => setDialog('skip')}
                  >
                    Skip question
                  </Button>
                  <Button
                    kind="ghost"
                    renderIcon={Locked}
                    disabled={isBusy || connectionLost}
                    onClick={() =>
                      send({ turnId: createId('turn'), action: 'confidential', text: '' })
                    }
                  >
                    I can’t answer, it’s confidential
                  </Button>
                </div>
              </Form>
            </>
          )}

          <div className={styles.secondaryControls}>
            {interview.allowedModes.length > 1 ? (
              <Button
                kind="ghost"
                size="sm"
                renderIcon={isVoice ? Chat : Microphone}
                disabled={isBusy || update.isPending}
                onClick={() => {
                  speech.stopSpeaking();
                  update.mutate({ mode: isVoice ? 'text' : 'voice' });
                }}
              >
                {isVoice ? 'Switch to text' : 'Switch to voice'}
              </Button>
            ) : null}
            <Button
              kind="danger--ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => setDialog('end')}
            >
              End early
            </Button>
          </div>
          {update.isError ? (
            <InlineNotification
              kind="warning"
              title="That didn’t change"
              subtitle={toUserMessage(update.error)}
              lowContrast
              className={styles.notice}
            />
          ) : null}
        </section>
      </div>

      {createPortal(
        <>
          <Modal
            open={dialog === 'skip'}
            size="sm"
            modalHeading="Skip this question?"
            primaryButtonText="Skip question"
            secondaryButtonText="Keep answering"
            onRequestClose={() => setDialog(null)}
            onRequestSubmit={() => {
              setDialog(null);
              send({ turnId: createId('turn'), action: 'skip', text: skipReason });
            }}
          >
            <RadioButtonGroup
              legendText="Why are you skipping? (helps us send better questions)"
              name="skip-reason"
              orientation="vertical"
              valueSelected={skipReason}
              onChange={(value) => setSkipReason(String(value))}
            >
              {SKIP_REASONS.map((reason) => (
                <RadioButton key={reason} id={`skip-${reason}`} value={reason} labelText={reason} />
              ))}
            </RadioButtonGroup>
          </Modal>
          <Modal
            open={dialog === 'end'}
            danger
            size="sm"
            modalHeading="End the interview now?"
            primaryButtonText={end.isPending ? 'Ending…' : 'End and review'}
            secondaryButtonText="Keep going"
            primaryButtonDisabled={end.isPending}
            onRequestClose={() => setDialog(null)}
            onRequestSubmit={() => end.mutate(undefined, { onSuccess: () => setDialog(null) })}
          >
            <p className={styles.help}>
              You’ve covered {interview.sections.reduce((n, s) => n + s.answered, 0)} of{' '}
              {interview.sections.reduce((n, s) => n + s.total, 0)} questions. You’ll still review
              what you said, and the fee is paid in proportion to the questions covered.
            </p>
            {end.isError ? (
              <InlineNotification
                kind="error"
                title="Couldn’t end"
                subtitle={toUserMessage(end.error)}
                lowContrast
                hideCloseButton
              />
            ) : null}
          </Modal>
        </>,
        document.body,
      )}
    </div>
  );
}

function TranscriptItem({ entry }: { entry: TranscriptEntry }) {
  if (entry.kind === 'section_complete') {
    return (
      <li className={styles.sectionDone}>
        <CheckmarkFilled aria-hidden="true" className={styles.doneIcon} />
        <span>{entry.text}</span>
      </li>
    );
  }
  if (entry.speaker === 'ai') {
    const isReminder = entry.kind === 'deflection';
    return (
      <li className={isReminder ? styles.reminder : styles.aiMessage}>
        <span className={styles.speaker}>
          {isReminder ? (
            <>
              <Information aria-hidden="true" /> Compliance reminder
            </>
          ) : entry.kind === 'follow_up' ? (
            'AI interviewer · follow-up'
          ) : (
            'AI interviewer'
          )}
        </span>
        <p>{entry.text}</p>
      </li>
    );
  }
  return (
    <li className={entry.kind === 'answer' ? styles.expertMessage : styles.expertNote}>
      <span className={styles.speaker}>You</span>
      <p>{entry.text}</p>
    </li>
  );
}

function PausedPanel({
  interview,
  onResume,
  isPending,
}: {
  interview: Interview;
  onResume: () => void;
  isPending: boolean;
}) {
  const section = activeSection(interview);
  const long = isLongPause(interview);
  return (
    <section className={styles.paused} aria-labelledby="paused-heading">
      <h2 id="paused-heading" className={styles.cardTitle}>
        {long ? 'Still there?' : 'Paused'}
      </h2>
      <p className={styles.help}>
        {long
          ? `You’ve been paused for more than 10 minutes. Everything is saved. Pick up at ${section?.title.toLowerCase() ?? 'the next question'} whenever you’re ready.`
          : `Your answers are saved and the clock is stopped. You’ll pick up at ${section?.title.toLowerCase() ?? 'the next question'}.`}
      </p>
      <div>
        <Button renderIcon={Play} disabled={isPending} onClick={onResume}>
          Resume
        </Button>
      </div>
    </section>
  );
}

function VoiceBar({
  speech,
  disabled,
  onReplay,
  onText,
  onError,
}: {
  speech: ReturnType<typeof useSpeech>;
  disabled: boolean;
  onReplay: () => void;
  onText: (text: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className={styles.voiceBar}>
      <p className={styles.voiceState} aria-live="polite">
        <span
          className={speech.isSpeaking ? styles.speakingDot : styles.idleDot}
          aria-hidden="true"
        />
        {speech.isListening
          ? 'Listening… your words appear below.'
          : speech.isSpeaking
            ? 'The interviewer is speaking.'
            : speech.canListen
              ? 'Press Start answering, then speak.'
              : 'Voice answers aren’t available in this browser, so type your answer; questions are still read aloud.'}
      </p>
      <div className={styles.voiceActions}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={VolumeUp}
          disabled={!speech.canSpeak || disabled}
          onClick={onReplay}
        >
          Replay question
        </Button>
        {speech.canListen ? (
          speech.isListening ? (
            <Button
              kind="secondary"
              size="md"
              renderIcon={StopFilled}
              onClick={speech.stopListening}
            >
              Stop
            </Button>
          ) : (
            <Button
              kind="secondary"
              size="md"
              renderIcon={Microphone}
              disabled={disabled}
              onClick={() => {
                speech.stopSpeaking();
                speech.listen(onText, onError);
              }}
            >
              Start answering
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
