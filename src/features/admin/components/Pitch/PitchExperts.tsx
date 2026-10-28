'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  InlineNotification,
  Select,
  SelectItem,
  Tag,
  TextArea,
  TextInput,
  Toggle,
} from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary } from '@/shared/ui';
import { usePatchPitch, usePitch, useSendPitch } from '../../api/queries';
import type { Pitch } from '../../model/journey.schema';
import type { Project } from '../../model/project.schema';
import { ProjectGate, StepHeader, StepLoading, shortProjectName } from '../ProjectSteps/StepFrame';
import styles from './PitchExperts.module.scss';

const REMINDERS = [
  ['none', 'No reminder'],
  ['email_24h', 'Email after 24 hours'],
  ['email_sms_24h', 'Email and SMS after 24 hours'],
] as const;

/** PRD screen 06: the AI-drafted pitch email and the 15-question form for the shortlisted experts. */
export function PitchExperts({ projectId }: { projectId: string }) {
  return (
    <ProjectGate projectId={projectId} label="Loading the pitch">
      {(project) => <PitchScreen project={project} />}
    </ProjectGate>
  );
}

function PitchScreen({ project }: { project: Project }) {
  const pitch = usePitch(project.id);
  const router = useRouter();
  return (
    <AsyncBoundary
      query={pitch}
      errorTitle="The pitch didn’t load"
      loading={<StepLoading label="Loading the pitch" />}
      notFound={
        <div className={styles.root}>
          <StepHeader project={project} step="pitch" title="Pitch experts" />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="No pitch yet."
            subtitle="Choose experts on the shortlist and the AI drafts the email."
          />
          <div>
            <Button
              kind="tertiary"
              onClick={() => router.push(routes.admin.projectStep(project.id, 'shortlist'))}
            >
              Back to the shortlist
            </Button>
          </div>
        </div>
      }
    >
      {(data) => <PitchView project={project} pitch={data} />}
    </AsyncBoundary>
  );
}

function PitchView({ project, pitch }: { project: Project; pitch: Pitch }) {
  const router = useRouter();
  const patch = usePatchPitch(project.id);
  const send = useSendPitch(project.id);
  const [subject, setSubject] = useState(pitch.subject);
  const [body, setBody] = useState(pitch.body);
  const [error, setError] = useState<unknown>(null);
  const sent = pitch.sentAt !== null;
  const dirty = subject !== pitch.subject || body !== pitch.body;
  const count = pitch.recipients.length;

  const save = (change: Parameters<typeof patch.mutate>[0]) => {
    setError(null);
    patch.mutate(change, { onError: (err) => setError(err) });
  };

  const sendAll = async () => {
    setError(null);
    try {
      if (dirty) {
        await patch.mutateAsync({ subject: subject.trim(), body: body.trim() });
      }
      await send.mutateAsync();
      router.push(routes.admin.projectStep(project.id, 'responses'));
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className={styles.root}>
      <StepHeader
        project={project}
        step="pitch"
        title={`Pitch ${count} experts`}
        subtitle={`${shortProjectName(project.name)}: one email and a ${pitch.questions.length}-question form per expert.`}
        actions={
          sent ? (
            <Button onClick={() => router.push(routes.admin.projectStep(project.id, 'responses'))}>
              See responses
            </Button>
          ) : (
            <Button disabled={count === 0 || send.isPending} onClick={() => void sendAll()}>
              {send.isPending ? 'Sending…' : `Send to ${count} experts`}
            </Button>
          )
        }
      />

      {sent ? (
        <InlineNotification
          kind="success"
          lowContrast
          hideCloseButton
          title="Pitch sent."
          subtitle={`${count} experts have their private link. Answers arrive on the responses screen.`}
        />
      ) : null}
      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t work."
          subtitle={toUserMessage(error)}
          onClose={() => setError(null)}
        />
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="email-title">
            <div className={styles.cardHeader}>
              <h2 id="email-title" className={styles.cardTitle}>
                Email to each expert
              </h2>
              <AIExplainLabel
                summary="Drafted from the client’s brief and each expert’s profile."
                basis="Project brief and shortlist"
                isEdited={subject !== pitch.ai.subject || body !== pitch.ai.body}
                onRevert={() => {
                  setSubject(pitch.ai.subject);
                  setBody(pitch.ai.body);
                  save({ subject: pitch.ai.subject, body: pitch.ai.body });
                }}
                aria-label="Pitch email"
              />
            </div>
            <TextInput
              id="pitch-subject"
              labelText="Subject"
              value={subject}
              readOnly={sent}
              onChange={(event) => setSubject(event.target.value)}
            />
            <TextArea
              id="pitch-body"
              labelText="Message"
              helperText="{first name} and {why we picked you} are filled in for each expert."
              rows={10}
              value={body}
              readOnly={sent}
              onChange={(event) => setBody(event.target.value)}
            />
            {!sent ? (
              <div className={styles.actions}>
                <Button
                  kind="tertiary"
                  size="md"
                  disabled={!dirty || patch.isPending}
                  onClick={() => save({ subject: subject.trim(), body: body.trim() })}
                >
                  Save edits
                </Button>
                <Button
                  kind="ghost"
                  size="md"
                  disabled={!dirty && subject === pitch.ai.subject && body === pitch.ai.body}
                  onClick={() => {
                    setSubject(pitch.ai.subject);
                    setBody(pitch.ai.body);
                    save({ subject: pitch.ai.subject, body: pitch.ai.body });
                  }}
                >
                  Reset to AI draft
                </Button>
              </div>
            ) : null}
          </section>

          <section className={styles.card} aria-labelledby="form-title">
            <h2 id="form-title" className={styles.cardTitle}>
              {pitch.questions.length}-question form
            </h2>
            <p className={styles.hint}>
              The client’s questions are locked. Screening questions can be removed.
            </p>
            <ol className={styles.questions} aria-label="Form questions">
              {pitch.questions.map((q) => (
                <li key={q.id} className={styles.question}>
                  <span className={styles.number}>{q.number}</span>
                  <div>
                    <p className={styles.questionText}>{q.text}</p>
                    <Tag type={q.source === 'client' ? 'blue' : 'gray'} size="sm">
                      {q.source === 'client' ? 'Client question · locked' : 'Screening'}
                    </Tag>
                  </div>
                  {!q.locked && !sent ? (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() =>
                        save({ questions: pitch.questions.filter((item) => item.id !== q.id) })
                      }
                    >
                      Remove
                      <span className="cds--visually-hidden"> question {q.number}</span>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="settings-title">
            <h2 id="settings-title" className={styles.cardTitle}>
              Deadline and reminders
            </h2>
            <Select
              id="answer-by"
              labelText="Answer within"
              value={String(pitch.answerByHours)}
              disabled={sent}
              onChange={(event) => save({ answerByHours: Number(event.target.value) })}
            >
              {[24, 48, 72].map((hours) => (
                <SelectItem key={hours} value={String(hours)} text={`${hours} hours`} />
              ))}
            </Select>
            <Select
              id="reminder"
              labelText="Reminder"
              value={pitch.reminder}
              disabled={sent}
              onChange={(event) => save({ reminder: event.target.value as Pitch['reminder'] })}
            >
              {REMINDERS.map(([value, text]) => (
                <SelectItem key={value} value={value} text={text} />
              ))}
            </Select>
            <Toggle
              id="hide-client"
              labelText="Hide the client’s name"
              labelA="Off"
              labelB="On"
              size="sm"
              toggled={pitch.hideClientName}
              disabled={sent}
              onToggle={(checked) => save({ hideClientName: checked })}
            />
            <Toggle
              id="ask-compliance"
              labelText="Ask experts to sign compliance terms"
              labelA="Off"
              labelB="On"
              size="sm"
              toggled={pitch.askCompliance}
              disabled={sent}
              onToggle={(checked) => save({ askCompliance: checked })}
            />
          </section>

          <section className={styles.card} aria-labelledby="recipients-title">
            <h2 id="recipients-title" className={styles.cardTitle}>
              Recipients · {count}
            </h2>
            <ul className={styles.recipients} aria-label="Recipients">
              {pitch.recipients.map((r) => (
                <li key={r.id} className={styles.recipient}>
                  <span>
                    {r.displayId}
                    <span className={styles.recipientRole}> · {r.role}</span>
                  </span>
                  <span>{r.matchPercent}%</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
