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
import { formatDateTime } from '@/shared/lib/dates';
import { AsyncBoundary } from '@/shared/ui';
import {
  useClientSend,
  useLockProject,
  usePatchClientSend,
  useSendToClient,
  useSubmitPick,
  useSyncClient,
} from '../../api/queries';
import type { ClientExpertCard, ClientSend } from '../../model/journey.schema';
import type { Project } from '../../model/project.schema';
import { ProjectGate, StepHeader, StepLoading } from '../ProjectSteps/StepFrame';
import styles from './SendToClient.module.scss';

type Stage = 'draft' | 'waiting' | 'reply' | 'sync';

function stageOf(send: ClientSend): Stage {
  if (!send.sentAt) return 'draft';
  if (!send.picks) return 'waiting';
  return send.syncedAt ? 'sync' : 'reply';
}

/**
 * PRD screens 10, 13 and 14: write to the client, read their reply, sync with the experts and
 * lock the project. The stage follows `sentAt`, `picks` and `syncedAt`.
 */
export function SendToClient({ projectId }: { projectId: string }) {
  return (
    <ProjectGate projectId={projectId} label="Loading the client email">
      {(project) => <ClientScreen project={project} />}
    </ProjectGate>
  );
}

function ClientScreen({ project }: { project: Project }) {
  const send = useClientSend(project.id);
  const router = useRouter();
  return (
    <AsyncBoundary
      query={send}
      errorTitle="The client email didn’t load"
      loading={<StepLoading label="Loading the client email" />}
      notFound={
        <div className={styles.root}>
          <StepHeader project={project} step="client" title="Send experts to the client" />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Nothing to send yet."
            subtitle="Confirm availability first."
          />
          <div>
            <Button
              kind="tertiary"
              onClick={() => router.push(routes.admin.projectStep(project.id, 'availability'))}
            >
              Back to availability
            </Button>
          </div>
        </div>
      }
    >
      {(data) => <ClientView key={stageOf(data)} project={project} send={data} />}
    </AsyncBoundary>
  );
}

function ExpertCard({
  card,
  onRemove,
  muted,
}: {
  card: ClientExpertCard;
  onRemove?: () => void;
  muted?: string;
}) {
  return (
    <article className={styles.expert} aria-label={`Expert ${card.letter}`}>
      <div className={styles.expertHead}>
        <h3 className={styles.expertTitle}>
          Expert {card.letter} · {card.headline}
        </h3>
        {muted ? (
          <Tag type="gray" size="sm">
            {muted}
          </Tag>
        ) : null}
      </div>
      <p className={styles.hint}>
        {card.years} years · {card.country}
        {card.rate ? ` · $${card.rate}/hr` : ''}
      </p>
      <p className={styles.quote}>“{card.quote}”</p>
      <div className={styles.tags}>
        {card.bestFor.map((item) => (
          <Tag key={item} type="blue" size="sm">
            Best for: {item}
          </Tag>
        ))}
      </div>
      <div className={styles.tags}>
        {card.slots.map((slot) => (
          <Tag key={slot.id} type="outline" size="sm">
            {slot.label}
          </Tag>
        ))}
      </div>
      {onRemove ? (
        <div>
          <Button kind="ghost" size="sm" onClick={onRemove}>
            Remove
            <span className="cds--visually-hidden"> Expert {card.letter} from the email</span>
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function ClientView({ project, send }: { project: Project; send: ClientSend }) {
  const router = useRouter();
  const stage = stageOf(send);
  const patch = usePatchClientSend(project.id);
  const sendMail = useSendToClient(project.id);
  const sync = useSyncClient(project.id);
  const lock = useLockProject(project.id);
  const pick = useSubmitPick(send.pickToken);
  const [subject, setSubject] = useState(send.subject);
  const [body, setBody] = useState(send.body);
  const [error, setError] = useState<unknown>(null);
  const firstName = send.to.name.split(' ')[0];
  const dirty = subject !== send.subject || body !== send.body;
  const onError = (err: unknown) => setError(err);

  const change = (value: Parameters<typeof patch.mutate>[0]) => {
    setError(null);
    patch.mutate(value, { onError });
  };

  const sendNow = async () => {
    setError(null);
    try {
      if (dirty) await patch.mutateAsync({ subject: subject.trim(), body: body.trim() });
      await sendMail.mutateAsync();
    } catch (err) {
      setError(err);
    }
  };

  const pickedCards = (send.picks ?? []).flatMap((p) => {
    const card = send.experts.find((e) => e.expertId === p.expertId);
    const slot = card?.slots.find((s) => s.id === p.slotId);
    return card ? [{ card, slot }] : [];
  });
  const otherCards = send.experts.filter(
    (e) => !(send.picks ?? []).some((p) => p.expertId === e.expertId),
  );

  const titles: Record<Stage, string> = {
    draft: `Send ${send.experts.length} experts to ${firstName}`,
    waiting: `Waiting for ${firstName}’s reply`,
    reply: `${firstName} chose ${pickedCards.length} ${pickedCards.length === 1 ? 'expert' : 'experts'}`,
    sync: 'Experts confirmed. Tell the client and lock the project',
  };

  const action =
    stage === 'draft' ? (
      <Button
        disabled={send.experts.length === 0 || sendMail.isPending}
        onClick={() => void sendNow()}
      >
        {sendMail.isPending ? 'Sending…' : `Send to ${firstName}`}
      </Button>
    ) : stage === 'reply' ? (
      <Button disabled={sync.isPending} onClick={() => sync.mutate(undefined, { onError })}>
        {sync.isPending ? 'Syncing…' : 'Sync with experts'}
      </Button>
    ) : stage === 'sync' ? (
      <Button
        disabled={lock.isPending}
        onClick={() =>
          lock.mutate(undefined, {
            onSuccess: () => router.push(routes.admin.projectStep(project.id, 'booked')),
            onError,
          })
        }
      >
        {lock.isPending ? 'Locking…' : `Send to ${firstName} & lock project`}
      </Button>
    ) : null;

  return (
    <div className={styles.root}>
      <StepHeader
        project={project}
        step="client"
        title={titles[stage]}
        subtitle={
          send.sentAt
            ? `Sent ${formatDateTime(send.sentAt)} to ${send.to.name} · reply by ${formatDateTime(send.replyBy)}`
            : `To ${send.to.name} <${send.to.email}>`
        }
        actions={action}
      />

      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t work."
          subtitle={toUserMessage(error)}
          onClose={() => setError(null)}
        />
      ) : null}

      {stage === 'waiting' ? (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="The email is with the client."
          subtitle="Slots stay held until they reply. In the demo you can answer for them."
          actions={
            <div className={styles.actions}>
              <Button
                kind="tertiary"
                size="sm"
                onClick={() => window.open(routes.links.pick(send.pickToken), '_blank', 'noopener')}
              >
                Open the client’s page
              </Button>
              <Button
                kind="ghost"
                size="sm"
                disabled={pick.isPending}
                onClick={() => {
                  const picks = send.experts.slice(0, send.pickLimit).flatMap((e) => {
                    const slot = e.slots[0];
                    return slot ? [{ expertId: e.expertId, slotId: slot.id }] : [];
                  });
                  pick.mutate(
                    { picks, note: 'Thanks. These two look strongest on feedstock and costs.' },
                    { onError },
                  );
                }}
              >
                Demo: simulate the client’s reply
              </Button>
            </div>
          }
        />
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          {stage === 'draft' ? (
            <section className={styles.card} aria-labelledby="client-email-title">
              <div className={styles.cardHeader}>
                <h2 id="client-email-title" className={styles.cardTitle}>
                  Email to {send.to.name}
                </h2>
                <AIExplainLabel
                  summary="Drafted from the experts’ answers, anonymised for the client."
                  basis="Expert answers and confirmed times"
                  isEdited={subject !== send.ai.subject || body !== send.ai.body}
                  onRevert={() => {
                    setSubject(send.ai.subject);
                    setBody(send.ai.body);
                    change({ subject: send.ai.subject, body: send.ai.body });
                  }}
                  aria-label="Client email"
                />
              </div>
              <p className={styles.recipients}>
                Cc: {send.cc.map((c) => c.name).join(', ') || 'nobody'}
              </p>
              <TextInput
                id="client-subject"
                labelText="Subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
              <TextArea
                id="client-body"
                labelText="Message"
                rows={8}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className={styles.actions}>
                <Button
                  kind="tertiary"
                  size="md"
                  disabled={!dirty || patch.isPending}
                  onClick={() => change({ subject: subject.trim(), body: body.trim() })}
                >
                  Save edits
                </Button>
              </div>
            </section>
          ) : null}

          {stage === 'reply' || stage === 'sync' ? (
            <section className={styles.card} aria-labelledby="reply-title">
              <h2 id="reply-title" className={styles.cardTitle}>
                {send.to.name.split(' ')[0]}’s choice
              </h2>
              <ul className={styles.picks} aria-label="Chosen experts">
                {pickedCards.map(({ card, slot }) => (
                  <li key={card.expertId} className={styles.pick}>
                    <span>
                      Expert {card.letter} · {card.headline}
                    </span>
                    <Tag type={stage === 'sync' ? 'green' : 'blue'} size="sm">
                      {slot?.label ?? 'Time to confirm'}
                      {stage === 'sync' ? ' · confirmed' : ''}
                    </Tag>
                  </li>
                ))}
              </ul>
              {send.clientNote ? <p className={styles.message}>“{send.clientNote}”</p> : null}
              {stage === 'sync' ? (
                <>
                  <h3 className={styles.cardTitle}>Message to {firstName}</h3>
                  <p className={styles.message}>
                    {`Hi ${firstName} — both experts are confirmed for the times you chose. Invites and the briefing pack follow. The other experts have been released.`}
                  </p>
                </>
              ) : (
                <p className={styles.hint}>
                  Next: confirm the chosen times with the experts. The others go on standby until
                  the project is locked.
                </p>
              )}
            </section>
          ) : null}

          <section className={styles.card} aria-labelledby="experts-title">
            <h2 id="experts-title" className={styles.cardTitle}>
              {stage === 'draft' || stage === 'waiting'
                ? `${send.experts.length} experts in the email`
                : 'Not chosen'}
            </h2>
            <div className={styles.experts}>
              {(stage === 'draft' || stage === 'waiting' ? send.experts : otherCards).map(
                (card) => (
                  <ExpertCard
                    key={card.expertId}
                    card={card}
                    {...(stage === 'draft' && send.experts.length > 1
                      ? { onRemove: () => change({ removeExpertId: card.expertId }) }
                      : {})}
                    {...(stage === 'reply' ? { muted: 'Standby' } : {})}
                    {...(stage === 'sync' ? { muted: 'Released' } : {})}
                  />
                ),
              )}
            </div>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="visibility-title">
            <h2 id="visibility-title" className={styles.cardTitle}>
              What the client sees
            </h2>
            <Toggle
              id="hide-names"
              labelText="Hide expert names"
              labelA="Off"
              labelB="On"
              size="sm"
              toggled={send.hideNames}
              disabled={stage !== 'draft'}
              onToggle={(checked) => change({ hideNames: checked })}
            />
            <Toggle
              id="include-summaries"
              labelText="Include answer summaries"
              labelA="Off"
              labelB="On"
              size="sm"
              toggled={send.includeSummaries}
              disabled={stage !== 'draft'}
              onToggle={(checked) => change({ includeSummaries: checked })}
            />
            <Toggle
              id="show-rates"
              labelText="Show rates"
              labelA="Off"
              labelB="On"
              size="sm"
              toggled={send.showRates}
              disabled={stage !== 'draft'}
              onToggle={(checked) => change({ showRates: checked })}
            />
            <Select
              id="pick-limit"
              labelText="Client can choose up to"
              value={String(send.pickLimit)}
              disabled={stage !== 'draft'}
              onChange={(event) => change({ pickLimit: Number(event.target.value) })}
            >
              {[1, 2, 3].map((n) => (
                <SelectItem
                  key={n}
                  value={String(n)}
                  text={`${n} ${n === 1 ? 'expert' : 'experts'}`}
                />
              ))}
            </Select>
          </section>

          <section className={styles.card} aria-labelledby="coverage-title">
            <h2 id="coverage-title" className={styles.cardTitle}>
              Question coverage
            </h2>
            <ul className={styles.coverageList} aria-label="Question coverage">
              {send.coverage.map((item) => (
                <li key={item.questionId} className={styles.coverageItem}>
                  <span>{item.label}</span>
                  <span className={styles.tags}>
                    {item.letters.length === 0 ? (
                      <Tag type="warm-gray" size="sm">
                        No expert yet
                      </Tag>
                    ) : (
                      item.letters.map((letter) => (
                        <Tag key={letter} type="blue" size="sm">
                          {letter}
                        </Tag>
                      ))
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
