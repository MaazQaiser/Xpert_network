'use client';

import { useState } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { Document, Download, SendAlt, SubtractAlt, UserFollow } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { XpertLogo } from '@/shared/ui';
import { useSendCallFollowUps } from '../../api/queries';
import type { CallDetail } from '../../model/calls.schema';
import { clock, longDateOf, minutesBetween, timeOf } from './callParts';
import { SentToast } from './SentToast';
import styles from './Calls.module.scss';

const REQUEST_LABELS = {
  document: { label: 'Document', Icon: Document },
  new_requirement: { label: 'New expert needed', Icon: UserFollow },
  remove_requirement: { label: 'Requirement removed', Icon: SubtractAlt },
} as const;

const OWNER_NOTE = 'Umer';

/** A timestamp in the report that plays the recording from there. */
function Source({ at, onJump }: { at: number; onJump: (at: number) => void }) {
  return (
    <button
      type="button"
      className={styles.source}
      onClick={() => onJump(at)}
      aria-label={`Play the recording from ${clock(at)}`}
    >
      {clock(at)}
    </button>
  );
}

/**
 * The call's knowledge report: one document that sets out everything the call covered, the
 * way a research team would file it. A letterhead and the call's facts; the summary; every
 * question the client asked with what the expert said (and where, so it can be played back);
 * requests and next steps. It downloads as a PDF and goes to the client in one click.
 */
export function CallReport({ call, onJump }: { call: CallDetail; onJump: (at: number) => void }) {
  const send = useSendCallFollowUps(call.id);
  // Set when this report goes out, for the toast; cleared when the toast leaves.
  const [justSent, setJustSent] = useState(false);
  const clientFirst = call.client.name.split(' ')[0] ?? call.client.name;
  const covered = call.questions.filter((q) => q.covered).length;

  if (call.status !== 'completed') {
    return (
      <div className={styles.reportPending}>
        <p className={styles.reportPendingTitle}>The report is written when the call ends.</p>
        <p className={styles.none}>
          So far the call has covered {covered} of {call.questions.length} of the client’s
          questions. Follow it in the transcript.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.reportWrap}>
      {/* What to do with it: keep a copy, or send it on. */}
      <div className={styles.reportBar}>
        <p className={styles.aiLine}>
          <AIExplainLabel size="xs" aria-label="AI-written report" />
          Written by the AI from the transcript. Check it before you send it on.
        </p>
        <div className={styles.reportActions}>
          <Button kind="tertiary" size="sm" renderIcon={Download} onClick={() => window.print()}>
            Download PDF
          </Button>
          {/* The button stays: a report can go again (after an edit, or to resend). */}
          <Button
            size="sm"
            renderIcon={SendAlt}
            disabled={send.isPending}
            onClick={() => send.mutate(undefined, { onSuccess: () => setJustSent(true) })}
          >
            {send.isPending ? 'Sending…' : `Send to ${clientFirst}`}
          </Button>
        </div>
      </div>
      {send.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t send."
          subtitle={toUserMessage(send.error)}
          onCloseButtonClick={() => send.reset()}
        />
      ) : null}
      {justSent ? (
        <SentToast
          title={`Report sent to ${call.client.name}`}
          detail={`${call.email.toEmail || call.client.detail} · ${call.projectName}`}
          onClose={() => setJustSent(false)}
        />
      ) : null}

      <article className={styles.report} aria-labelledby={`report-${call.id}`} data-print-root="">
        {/* Letterhead. */}
        <header className={styles.letterhead}>
          <span className={styles.brand}>
            <XpertLogo size={20} />
            Xpert Network
          </span>
          <span className={styles.reportRef}>Call report · {call.projectId}</span>
        </header>

        <h2 id={`report-${call.id}`} className={styles.reportTitle}>
          {call.projectName}
        </h2>
        <p className={styles.reportSubtitle}>
          Expert call with {call.expert.name}, {call.expert.detail}
        </p>

        <dl className={styles.reportFacts}>
          <div>
            <dt>Client</dt>
            <dd>
              {call.client.name}, {call.client.detail}
            </dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>
              {longDateOf(call.startsAt)}, {timeOf(call.startsAt)}
            </dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd>{minutesBetween(call.startsAt, call.endsAt)} minutes</dd>
          </div>
          <div>
            <dt>Moderator</dt>
            <dd>{OWNER_NOTE}, Xpert Network</dd>
          </div>
          <div>
            <dt>Questions covered</dt>
            <dd>
              {covered} of {call.questions.length}
            </dd>
          </div>
        </dl>

        <section className={styles.reportSection} aria-labelledby={`summary-${call.id}`}>
          <h3 id={`summary-${call.id}`} className={styles.reportHeading}>
            Summary
          </h3>
          <p className={styles.reportLead}>{call.purpose}</p>
          <ul className={styles.reportBullets}>
            {call.takeaways.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className={styles.reportSection} aria-labelledby={`answers-${call.id}`}>
          <h3 id={`answers-${call.id}`} className={styles.reportHeading}>
            What the client asked
          </h3>
          <ol className={styles.qa}>
            {call.questions.map((q, i) => (
              <li
                key={q.text}
                className={q.answer ? styles.qaItem : `${styles.qaItem} ${styles.qaOpen}`}
              >
                <span className={styles.qaNumber} aria-hidden="true">
                  Q{i + 1}
                </span>
                <div className={styles.qaBody}>
                  <p className={styles.qaQuestion}>{q.text}</p>
                  {q.answer ? (
                    <p className={styles.qaAnswer}>
                      {q.answer} {q.at !== null ? <Source at={q.at} onJump={onJump} /> : null}
                    </p>
                  ) : (
                    <p className={styles.qaMissing}>
                      Not covered in this call. Worth raising with the next expert.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.reportSection} aria-labelledby={`requests-${call.id}`}>
          <h3 id={`requests-${call.id}`} className={styles.reportHeading}>
            Requests and next steps
          </h3>
          {call.requests.length > 0 ? (
            <ul className={styles.requests}>
              {call.requests.map((request) => {
                const { label, Icon } = REQUEST_LABELS[request.kind];
                return (
                  <li key={request.id} className={styles.request}>
                    <Icon className={styles.requestIcon} aria-hidden={true} />
                    <div>
                      <p className={styles.requestKind}>
                        {label} · <Source at={request.at} onJump={onJump} />
                      </p>
                      <p className={styles.body01}>{request.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {call.nextSteps.length > 0 ? (
            <table className={styles.stepsTable}>
              <caption className="cds--visually-hidden">Next steps</caption>
              <thead>
                <tr>
                  <th scope="col">Next step</th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {call.nextSteps.map((step) => (
                  <tr key={step.id}>
                    <td>{step.text}</td>
                    <td className={styles.stepOwner}>{step.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <footer className={styles.reportFooter}>
          Prepared by Xpert Network from the recording and transcript of this call. The expert’s
          views are their own. Confidential: for {call.client.detail} only.
        </footer>
      </article>
    </div>
  );
}
