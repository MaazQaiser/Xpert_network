'use client';

import { useState } from 'react';
import { Button, Checkbox, InlineNotification, Tag } from '@carbon/react';
import { Document } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatTime } from '@/shared/lib/dates';
import { AsyncBoundary, StatusTag, type StatusTone } from '@/shared/ui';
import { useCall, usePatchCall, useSendCallToClient } from '../../api/queries';
import type { CallWorkspace } from '../../model/journey.schema';
import type { Project } from '../../model/project.schema';
import { ProjectGate, StepHeader, StepLoading } from '../ProjectSteps/StepFrame';
import styles from './CallWorkspaceView.module.scss';

const STATUS: Record<CallWorkspace['status'], { tone: StatusTone; label: string }> = {
  scheduled: { tone: 'info', label: 'Scheduled' },
  live: { tone: 'progress', label: 'Live' },
  ended: { tone: 'success', label: 'Ended' },
};

const SPEAKER = { client: 'Client', expert: 'Expert', ai: 'AI note' } as const;

const REQUEST_LABEL = {
  document: 'Document request',
  removed_requirement: 'Removed requirement',
  new_expert: 'New expert needed',
} as const;

/** PRD screen 16: live transcript, AI-detected client requests, questions covered, documents. */
export function CallWorkspaceView({ projectId, callId }: { projectId: string; callId: string }) {
  return (
    <ProjectGate projectId={projectId} label="Loading the call workspace">
      {(project) => <CallScreen project={project} callId={callId} />}
    </ProjectGate>
  );
}

function CallScreen({ project, callId }: { project: Project; callId: string }) {
  const call = useCall(project.id, callId);
  return (
    <AsyncBoundary
      query={call}
      errorTitle="The call didn’t load"
      loading={<StepLoading label="Loading the call workspace" />}
      notFound={
        <div className={styles.root}>
          <StepHeader project={project} step="booked" title="Call not found" />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="We couldn’t find that call."
            subtitle="Open it from the booked project's calls list."
          />
        </div>
      }
    >
      {(data) => <CallView project={project} call={data} />}
    </AsyncBoundary>
  );
}

function CallView({ project, call }: { project: Project; call: CallWorkspace }) {
  const patch = usePatchCall(project.id, call.id);
  const sendAll = useSendCallToClient(project.id, call.id);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);
  const status = STATUS[call.status];
  const covered = call.questionsCovered.filter((q) => q.covered).length;
  const onError = (err: unknown) => setError(err);

  return (
    <div className={styles.root}>
      <StepHeader
        project={project}
        step="booked"
        title={call.title}
        eyebrow={
          <span className={styles.hint}>
            <StatusTag tone={status.tone} label={status.label} size="sm" /> Expert{' '}
            {call.expertLetter} · {call.expertRole}
          </span>
        }
        subtitle={
          <a href={routes.admin.projectStep(project.id, 'booked')}>Back to the booked project</a>
        }
        actions={
          <Button
            disabled={sendAll.isPending || call.status === 'scheduled'}
            onClick={() => {
              setError(null);
              sendAll.mutate(undefined, { onSuccess: () => setSent(true), onError });
            }}
          >
            {sendAll.isPending ? 'Sending…' : 'Send all to client'}
          </Button>
        }
      />

      {sent ? (
        <InlineNotification
          kind="success"
          lowContrast
          title="Sent to the client."
          subtitle="Documents and notes are in the mail sandbox."
          onClose={() => setSent(false)}
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
          <section className={styles.card} aria-labelledby="transcript-title">
            <div className={styles.cardHeader}>
              <h2 id="transcript-title" className={styles.cardTitle}>
                Live transcript
              </h2>
              {call.status === 'scheduled' ? (
                <Button
                  kind="tertiary"
                  size="sm"
                  onClick={() => patch.mutate({ status: 'live' }, { onError })}
                >
                  Start the call
                </Button>
              ) : call.status === 'live' ? (
                <Button
                  kind="tertiary"
                  size="sm"
                  onClick={() => patch.mutate({ status: 'ended' }, { onError })}
                >
                  End the call
                </Button>
              ) : null}
            </div>
            {call.transcript.length === 0 ? (
              <p className={styles.hint}>The transcript appears here once the call starts.</p>
            ) : (
              <ol className={styles.transcript} aria-label="Transcript">
                {call.transcript.map((line) => (
                  <li key={line.id} className={styles.line}>
                    <span className={styles.speaker}>
                      {SPEAKER[line.speaker]} · {formatTime(line.at)}
                    </span>
                    <p className={styles.text}>{line.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={styles.card} aria-labelledby="requests-title">
            <h2 id="requests-title" className={styles.cardTitle}>
              Client requests the AI detected
            </h2>
            {call.requests.length === 0 ? (
              <p className={styles.hint}>Nothing detected yet.</p>
            ) : (
              <ul className={styles.list} aria-label="Detected client requests">
                {call.requests.map((request) => (
                  <li key={request.id} className={styles.request}>
                    <Tag type="purple" size="sm">
                      {REQUEST_LABEL[request.kind]}
                    </Tag>
                    {request.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="covered-title">
            <h2 id="covered-title" className={styles.cardTitle}>
              Questions covered · {covered} of {call.questionsCovered.length}
            </h2>
            <ul className={styles.list} aria-label="Questions covered">
              {call.questionsCovered.map((q) => (
                <li key={q.id}>
                  <Checkbox
                    id={`covered-${q.id}`}
                    labelText={`${q.label}: ${project.questions.find((item) => item.id === q.id)?.text ?? ''}`}
                    checked={q.covered}
                    onChange={() => patch.mutate({ coveredId: q.id }, { onError })}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="docs-title">
            <h2 id="docs-title" className={styles.cardTitle}>
              After-call documents
            </h2>
            {call.documents.length === 0 ? (
              <p className={styles.hint}>No documents yet.</p>
            ) : (
              <ul className={styles.list} aria-label="After-call documents">
                {call.documents.map((doc) => (
                  <li key={doc.id} className={styles.request}>
                    <Tag type="gray" size="sm" renderIcon={Document}>
                      {doc.kind.toUpperCase()}
                    </Tag>
                    {doc.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
