'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  ContentSwitcher,
  InlineNotification,
  ProgressBar,
  ProgressIndicator,
  ProgressStep,
  SkeletonText,
  Switch,
  TextArea,
} from '@carbon/react';
import { Microphone, MicrophoneOff, Video, VideoOff } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, NotFoundState } from '@/shared/ui';
import { useCall } from '../../api/queries';
import type { CallQuestion, OpenCall } from '../../model/call.schema';
import styles from './RequestSession.module.scss';

type Mode = 'camera' | 'chat';

type Answer = { skipped: boolean; text: string };

/**
 * One-to-one interview for a request. Camera works like a call; chat asks one question
 * at a time, with next or skip.
 */
export function RequestSession({ callId }: { callId: string }) {
  const call = useCall(callId);
  return (
    <AsyncBoundary
      query={call}
      errorTitle="This interview request didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that interview request"
          message="The link may be incomplete. Open one from your interview requests."
          backHref={routes.expert.calls}
          backLabel="Back to interview requests"
        />
      }
      loading={
        <div aria-busy="true" aria-label="Loading interview">
          <SkeletonText heading width="40%" />
          <SkeletonText paragraph lineCount={6} />
        </div>
      }
    >
      {(data) => <Session call={data} />}
    </AsyncBoundary>
  );
}

function Session({ call }: { call: OpenCall }) {
  const account = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('camera');
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const question = call.questions[index] ?? null;
  const finished = call.questions.length > 0 && index >= call.questions.length;
  const name = account.data?.user?.name ?? 'You';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    video.srcObject = streamRef.current;
    return () => {
      video.srcObject = null;
    };
  }, [cameraOn, mode]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const showChat = () => {
    stopCamera();
    setMode('chat');
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser can’t open a camera. Switch to chat to answer the questions.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setMicOn(true);
      setCameraOn(true);
    } catch (error) {
      setCameraError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow it in the browser, or switch to chat.'
          : 'The camera couldn’t be opened. Switch to chat to continue.',
      );
    }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const record = (skipped: boolean, spoken = false) => {
    if (!question) return;
    if (!skipped && !spoken && !draft.trim()) return;
    setAnswers((current) => ({
      ...current,
      [question.id]: { skipped, text: skipped || spoken ? '' : draft.trim() },
    }));
    setDraft('');
    if (index + 1 >= call.questions.length) stopCamera();
    setIndex((current) => current + 1);
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Link href={routes.expert.calls} className={styles.back}>
            Interview requests
          </Link>
          <h1 className={styles.title}>{call.title}</h1>
          <p className={styles.meta}>
            {[call.industry.label, ...call.topics].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      {cameraError ? (
        <InlineNotification
          kind="error"
          title="Couldn’t open the camera"
          subtitle={cameraError}
          lowContrast
          onCloseButtonClick={() => setCameraError(null)}
        />
      ) : null}

      {finished ? (
        <Done call={call} answers={answers} />
      ) : mode === 'camera' ? (
        <div className={styles.call}>
          <div className={styles.stage}>
            {cameraOn ? (
              <video ref={videoRef} className={styles.video} autoPlay playsInline muted />
            ) : (
              <div className={styles.placeholder}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(name)}
                </span>
                <p>Your camera is off. Turn it on to join like a video call.</p>
              </div>
            )}
            {question ? (
              <QuestionBar question={question} index={index} total={call.questions.length} />
            ) : null}
          </div>
          <div className={styles.controls}>
            <Button
              kind={cameraOn ? 'danger--tertiary' : 'primary'}
              size="md"
              renderIcon={cameraOn ? VideoOff : Video}
              onClick={() => (cameraOn ? stopCamera() : void startCamera())}
            >
              {cameraOn ? 'Turn camera off' : 'Turn camera on'}
            </Button>
            <Button
              kind="tertiary"
              size="md"
              renderIcon={micOn ? Microphone : MicrophoneOff}
              disabled={!cameraOn}
              onClick={toggleMic}
            >
              {micOn ? 'Mute' : 'Unmute'}
            </Button>
            {question ? (
              <>
                <Button kind="secondary" size="md" onClick={() => record(false, true)}>
                  {index === call.questions.length - 1 ? 'Finish' : 'Next'}
                </Button>
                <Button kind="ghost" size="md" onClick={() => record(true)}>
                  Skip
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : question ? (
        <div className={styles.questionStage}>
          <ChatQuestion
            question={question}
            draft={draft}
            onDraft={setDraft}
            onNext={() => record(false)}
            onSkip={() => record(true)}
            last={index === call.questions.length - 1}
          />
          <ProgressWidget questions={call.questions} index={index} />
        </div>
      ) : (
        <p className={styles.empty}>This request has no questions yet.</p>
      )}
      {finished ? null : (
        <div className={styles.modeDock}>
          <ContentSwitcher
            className={styles.switcher}
            size="md"
            selectedIndex={mode === 'camera' ? 0 : 1}
            onChange={({ index: next }) => (next === 1 ? showChat() : setMode('camera'))}
          >
            <Switch name="camera" text="Switch to interview mode" />
            <Switch name="chat" text="Switch to chat" />
          </ContentSwitcher>
        </div>
      )}
    </div>
  );
}

function QuestionBar({
  question,
  index,
  total,
}: {
  question: CallQuestion;
  index: number;
  total: number;
}) {
  return (
    <div className={styles.caption}>
      <p className={styles.progress}>
        Question {index + 1} of {total}
        <span> · {question.section}</span>
      </p>
      <p className={styles.captionText}>{question.text}</p>
    </div>
  );
}

function ChatQuestion({
  question,
  draft,
  onDraft,
  onNext,
  onSkip,
  last,
}: {
  question: CallQuestion;
  draft: string;
  onDraft: (value: string) => void;
  onNext: () => void;
  onSkip: () => void;
  last: boolean;
}) {
  return (
    <form
      className={styles.chat}
      aria-label="Interview question"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <p className={styles.section}>{question.section}</p>
      <h2 className={styles.question}>{question.text}</h2>
      <TextArea
        id={`answer-${question.id}`}
        labelText="Your answer"
        placeholder="Type your answer"
        rows={4}
        value={draft}
        onChange={(event) => onDraft(event.target.value)}
      />
      <div className={styles.chatActions}>
        <Button type="submit" size="md" disabled={!draft.trim()}>
          {last ? 'Finish' : 'Next'}
        </Button>
        <Button type="button" kind="ghost" size="md" onClick={onSkip}>
          {last ? 'Skip and finish' : 'Skip'}
        </Button>
      </div>
    </form>
  );
}

function Done({ call, answers }: { call: OpenCall; answers: Record<string, Answer> }) {
  const recorded = Object.values(answers);
  const skipped = recorded.filter((answer) => answer.skipped).length;
  const answered = recorded.length - skipped;
  return (
    <div className={styles.done}>
      <h2 className={styles.question}>That’s every question</h2>
      <p>
        You answered {answered} and skipped {skipped} for {call.title}.
      </p>
      <Button as={Link} href={routes.expert.calls} size="md">
        Back to interview requests
      </Button>
    </div>
  );
}

function ProgressWidget({ questions, index }: { questions: CallQuestion[]; index: number }) {
  const sections = sectionsOf(questions);
  const sectionIndex = sections.findIndex((section, position) => {
    const next = sections[position + 1];
    return index >= section.start && (next === undefined || index < next.start);
  });
  const question = questions[index];
  return (
    <aside className={styles.progressWidget} aria-label="Interview progress">
      <p className={styles.widgetTitle}>Progress</p>
      <ProgressBar
        label={`Question ${index + 1} of ${questions.length}`}
        helperText={question?.section}
        max={questions.length}
        size="small"
        value={index + 1}
      />
      <ProgressIndicator currentIndex={Math.max(0, sectionIndex)} vertical>
        {sections.map((section) => (
          <ProgressStep key={`${section.title}-${section.start}`} label={section.title} />
        ))}
      </ProgressIndicator>
    </aside>
  );
}

function sectionsOf(questions: CallQuestion[]) {
  const sections: { title: string; start: number }[] = [];
  questions.forEach((question, start) => {
    const last = sections.at(-1);
    if (!last || last.title !== question.section) sections.push({ title: question.section, start });
  });
  return sections;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
