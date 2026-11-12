'use client';

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, InlineNotification, SkeletonText, Tag, TextArea } from '@carbon/react';
import { CheckmarkFilled, LogoLinkedin, Send, UserFollow } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import {
  PROFILE_READ_TIMEOUT_MS,
  useLinkedinProfile,
  useMessageLinkedinLead,
  useSendConnectionRequest,
} from '../../api/queries';
import {
  CONNECTION_NOTE_MAX,
  LINKEDIN_MESSAGE_MAX,
  senderAccountId,
  senderName,
  type SenderProfile,
} from '../../model/inbox.schema';
import type { LinkedinProfile } from '../../model/linkedinProfile.schema';
import { initials } from '../inboxDisplay';
import panel from './ReportPanel.module.scss';
import styles from './LinkedinOutreach.module.scss';

const count = new Intl.NumberFormat('en-GB');
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

function period(start: string | null, end: string | null): string {
  if (!start) return '';
  return `${monthYear.format(new Date(start))} – ${end ? monthYear.format(new Date(end)) : 'Present'}`;
}

/** The inbox thread with this person, under the sender that messages them. */
export function inboxThreadHref(senderUuid: string, leadUuid: string): string {
  const query = new URLSearchParams({
    account: senderAccountId(senderUuid),
    conversation: leadUuid,
  });
  return `${routes.admin.inbox}?${query.toString()}`;
}

/** Clicks on links, buttons or the draft itself don't count as clicking the card. */
function isOwnControl(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest('a, button, textarea, input, label'));
}

/**
 * A LinkedIn profile as a card: photo and name, the numbers, then their latest roles. With
 * `onOpen`, clicking anywhere on it (outside its links and buttons) opens the message draft;
 * `action` is the button that does the same for keyboard and screen reader users.
 */
export function LinkedinProfileCard({
  profile,
  action,
  onOpen,
  children,
}: {
  profile: LinkedinProfile;
  action?: ReactNode;
  onOpen?: () => void;
  children?: ReactNode;
}) {
  const [hasPhotoFailed, setHasPhotoFailed] = useState(false);
  const stats = [
    profile.connections !== null
      ? { label: 'Connections', value: count.format(profile.connections) }
      : null,
    profile.followers !== null
      ? { label: 'Followers', value: count.format(profile.followers) }
      : null,
    profile.location ? { label: 'Location', value: profile.location } : null,
  ].filter((stat) => stat !== null);

  return (
    <article
      className={onOpen ? `${styles.card} ${styles.cardClickable}` : styles.card}
      aria-labelledby={`profile-${profile.uuid}`}
      onClick={
        onOpen
          ? (event: MouseEvent<HTMLElement>) => {
              if (!isOwnControl(event.target)) onOpen();
            }
          : undefined
      }
    >
      <header className={styles.head}>
        <span className={panel.bigAvatar} aria-hidden="true">
          {profile.avatarUrl && !hasPhotoFailed ? (
            // LinkedIn photos come from several CDNs, so they're shown as they are.
            <Image
              src={profile.avatarUrl}
              alt=""
              width={72}
              height={72}
              unoptimized
              className={styles.photo}
              onError={() => setHasPhotoFailed(true)}
            />
          ) : (
            initials(profile.name)
          )}
        </span>
        <div className={styles.headText}>
          <h3 id={`profile-${profile.uuid}`} className={panel.profileName}>
            {profile.name}
          </h3>
          {profile.headline ? <p className={styles.headline}>{profile.headline}</p> : null}
          {profile.premium || profile.openProfile ? (
            <div className={styles.tags}>
              {profile.premium ? (
                <Tag size="sm" type="warm-gray">
                  Premium
                </Tag>
              ) : null}
              {profile.openProfile ? (
                <Tag size="sm" type="green">
                  Open Profile
                </Tag>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={styles.headActions}>
          {action}
          <Button
            kind="tertiary"
            size="sm"
            href={profile.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className={panel.inlineButton}
          >
            <LogoLinkedin size={16} aria-hidden={true} />
            View profile
            <span className="cds--visually-hidden"> on LinkedIn (opens in a new tab)</span>
          </Button>
        </div>
      </header>

      {children}

      {stats.length > 0 ? (
        <dl className={`${panel.stats} ${styles.stats}`}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {profile.about ? <p className={styles.about}>{profile.about}</p> : null}

      {profile.experience.length > 0 ? (
        <section aria-labelledby={`experience-${profile.uuid}`} className={styles.section}>
          <h4 id={`experience-${profile.uuid}`} className={styles.sectionTitle}>
            Experience
          </h4>
          <ol className={panel.history}>
            {profile.experience.map((job, index) => (
              <li key={`${job.company}-${job.start}-${index}`} className={panel.job}>
                <span className={panel.jobRail} aria-hidden="true">
                  <span className={panel.jobDot} />
                  <span className={panel.jobLine} />
                </span>
                <div className={panel.jobText}>
                  <p className={panel.jobTitle}>{job.position ?? 'Role not listed'}</p>
                  {job.company ? <p className={panel.jobOrg}>{job.company}</p> : null}
                  {job.start ? <p className={panel.jobMeta}>{period(job.start, job.end)}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

function ProfileSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.card} role="status" aria-busy="true" aria-label={label}>
      <SkeletonText heading width="40%" />
      <SkeletonText paragraph lineCount={4} />
    </div>
  );
}

/**
 * The answer to a LinkedIn link: the profile (waiting for GetSales to read a new one), with a
 * message draft that opens from the card.
 */
export function ProfileLookupAnswer({
  profile: found,
  error,
  lookedUpAt,
  sender,
  onRetry,
}: {
  profile: LinkedinProfile | null;
  error: unknown;
  lookedUpAt: number;
  /** The sender that would message them: the first one with LinkedIn connected. */
  sender: SenderProfile | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className={styles.answer}>
        <p className={styles.text} role="alert">
          {toUserMessage(error)}
        </p>
        <Button kind="ghost" size="sm" onClick={onRetry}>
          Look it up again
        </Button>
      </div>
    );
  }
  if (!found) return <ProfileSkeleton label="Looking up the LinkedIn profile" />;
  return <FoundProfile initial={found} lookedUpAt={lookedUpAt} sender={sender} />;
}

function FoundProfile({
  initial,
  lookedUpAt,
  sender,
}: {
  initial: LinkedinProfile;
  lookedUpAt: number;
  sender: SenderProfile | null;
}) {
  const query = useLinkedinProfile(initial.uuid, lookedUpAt);
  const profile = query.data ?? initial;
  const [now, setNow] = useState(() => Date.now());
  const [isDrafting, setIsDrafting] = useState(false);
  const hasTimedOut = !profile.enriched && now - lookedUpAt > PROFILE_READ_TIMEOUT_MS;
  const isReady = profile.enriched || hasTimedOut;
  // Just added: GetSales may not have told us yet whether they're a connection.
  const isChecking = !profile.settled && !hasTimedOut;
  const first = firstName(profile.name);

  // Notices the time-out even when no new data arrives.
  useEffect(() => {
    if (isReady && !isChecking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, [isReady, isChecking]);

  if (!isReady) {
    return (
      <div className={styles.answer}>
        <p className={styles.text}>
          Found {first} on LinkedIn. Reading their profile now; someone new takes a minute or two.
        </p>
        <ProfileSkeleton label={`Reading ${first}’s LinkedIn profile`} />
      </div>
    );
  }

  // GetSales only knows connections it has seen, so "not connected" can mean "not known".
  const isConnected = sender ? profile.connectedSenderUuids.includes(sender.uuid) : false;
  // A request already queued or sent: another one would only be skipped by LinkedIn.
  const isRequested =
    !isConnected && sender ? profile.requestedSenderUuids.includes(sender.uuid) : false;
  const canWrite = Boolean(sender) && !isRequested && !isChecking;
  const nextStep = !sender
    ? ''
    : isChecking
      ? ` Checking whether you’re connected with ${first}…`
      : isConnected
        ? ' Click the card to write them a message.'
        : isRequested
          ? ` You’ve already asked ${first} to connect. You can message them once they accept.`
          : ` ${first} isn’t one of your connections yet. Click the card to send a connection request.`;
  return (
    <div className={styles.answer}>
      <p className={styles.text}>
        {profile.enriched
          ? `Here’s ${first} on LinkedIn.`
          : `I couldn’t read ${first}’s full profile yet, but you can still reach out.`}
        {nextStep}
      </p>
      {sender ? null : (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No LinkedIn sender connected."
          subtitle="Add a LinkedIn sender from the Inbox to message people from here."
        />
      )}
      <LinkedinProfileCard
        profile={profile}
        onOpen={canWrite ? () => setIsDrafting(true) : undefined}
        action={
          !sender || isDrafting ? null : isChecking ? (
            <Button kind="secondary" size="sm" disabled>
              Checking connection…
            </Button>
          ) : isRequested ? (
            <Button kind="secondary" size="sm" renderIcon={UserFollow} disabled>
              Connection request sent
            </Button>
          ) : (
            <Button
              kind="primary"
              size="sm"
              renderIcon={isConnected ? Send : UserFollow}
              onClick={() => setIsDrafting(true)}
            >
              {isConnected ? 'Send message' : 'Send connection request'}
            </Button>
          )
        }
      >
        {sender && canWrite && isDrafting ? (
          <MessageDraft
            profile={profile}
            sender={sender}
            isConnected={isConnected}
            onCancel={() => setIsDrafting(false)}
          />
        ) : null}
      </LinkedinProfileCard>
    </div>
  );
}

/** The first message, before anything is written. Short enough for a connection note. */
function initialMessage(profile: LinkedinProfile, sender: SenderProfile): string {
  return `Hi ${firstName(profile.name)}, I’m ${sender.firstName} from Xpert Network. I came across your profile and would love to connect. Would you have a few minutes to fill in a short paid questionnaire about your expertise?`;
}

/**
 * The draft on the card. A known connection gets it as a LinkedIn message; anyone else gets a
 * connection request with it as the note (LinkedIn allows 300 characters), since LinkedIn only
 * lets you message your connections.
 */
function MessageDraft({
  profile,
  sender,
  isConnected,
  onCancel,
}: {
  profile: LinkedinProfile;
  sender: SenderProfile;
  isConnected: boolean;
  onCancel: () => void;
}) {
  const message = useMessageLinkedinLead();
  const connect = useSendConnectionRequest();
  const send = isConnected ? message : connect;
  const [text, setText] = useState(() => initialMessage(profile, sender));
  const max = isConnected ? LINKEDIN_MESSAGE_MAX : CONNECTION_NOTE_MAX;
  const trimmed = text.trim();
  const first = firstName(profile.name);
  const problem = !trimmed
    ? 'Write a message first.'
    : trimmed.length > max
      ? `Keep it to ${max} characters for a connection request note.`
      : null;

  if (send.isSuccess) {
    return (
      <div className={styles.result} role="status">
        <p className={styles.sent}>
          <CheckmarkFilled size={16} aria-hidden={true} />
          {isConnected
            ? `Message sent to ${first} from ${senderName(sender)}’s LinkedIn. Their reply will show in your inbox.`
            : `Connection request on its way to ${first} from ${senderName(sender)}’s LinkedIn, with your note. Once they accept, you can message them from your inbox.`}
        </p>
        <Button
          as={Link}
          href={inboxThreadHref(sender.uuid, profile.uuid)}
          kind="tertiary"
          size="sm"
        >
          Open the conversation
        </Button>
      </div>
    );
  }

  const submit = () => {
    if (problem || send.isPending) return;
    if (isConnected) message.mutate({ senderUuid: sender.uuid, lead: profile, text: trimmed });
    else connect.mutate({ senderUuid: sender.uuid, leadUuid: profile.uuid, note: trimmed });
  };

  return (
    <form
      className={styles.draft}
      aria-label={`Message to ${profile.name}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {send.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t send."
          subtitle={toUserMessage(send.error)}
          onCloseButtonClick={() => send.reset()}
        />
      ) : null}
      <TextArea
        id={`draft-${profile.uuid}`}
        labelText={isConnected ? `Message to ${first}` : `Note to ${first}`}
        helperText={
          isConnected
            ? `Sends from ${senderName(sender)}’s LinkedIn as a message.`
            : `${first} isn’t a known connection, so this goes as a connection request with your note (up to ${CONNECTION_NOTE_MAX} characters).`
        }
        rows={4}
        enableCounter
        maxCount={max}
        value={text}
        onChange={(event) => setText(event.target.value)}
        invalid={Boolean(problem) && text.length > 0 && trimmed.length > max}
        invalidText={problem ?? undefined}
      />
      <div className={styles.draftActions}>
        <Button
          type="submit"
          size="sm"
          renderIcon={Send}
          disabled={Boolean(problem) || send.isPending}
        >
          {send.isPending ? 'Sending…' : isConnected ? 'Send' : 'Send connection request'}
        </Button>
        <Button kind="ghost" size="sm" onClick={onCancel} disabled={send.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
