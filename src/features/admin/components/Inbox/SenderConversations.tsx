'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, IconButton, InlineNotification, SkeletonText, Tag, TextArea } from '@carbon/react';
import { ArrowLeft, Launch, Renew, Send } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { useSendLinkedinMessage } from '../../api/queries';
import {
  LINKEDIN_MESSAGE_MAX,
  sendLinkedinMessageInputSchema,
  type LinkedinConversation,
  type LinkedinMessage,
  type SendLinkedinMessageInput,
} from '../../model/inbox.schema';
import { fullDateLabel, initials, longDateLabel, receivedLabel } from '../inboxDisplay';
import styles from './Inbox.module.scss';
import chat from './SenderConversations.module.scss';

const TYPE_LABELS: Partial<Record<NonNullable<LinkedinMessage['linkedinType']>, string>> = {
  connection_note: 'Connection note',
  inmail: 'InMail',
};

/** The latest message of a thread, prefixed "You:" when our sender wrote it, as in LinkedIn. */
function lastLine(conversation: LinkedinConversation): string {
  const last = conversation.messages.at(-1);
  if (!last) return '';
  return last.direction === 'sent' ? `You: ${last.text}` : last.text;
}

const AVATAR_PX = { sm: 32, md: 40, lg: 48 } as const;
const AVATAR_CLASS = { sm: chat.avatarSm, md: chat.avatarMd, lg: chat.avatarLg };

/** A LinkedIn profile photo, or the person's initials when there's none or it fails to load. */
function Avatar({
  name,
  url,
  size,
}: {
  name: string;
  url: string | null;
  size: keyof typeof AVATAR_PX;
}) {
  const [hasFailed, setHasFailed] = useState(false);
  const px = AVATAR_PX[size];
  return (
    <span className={`${chat.avatar} ${AVATAR_CLASS[size]}`} aria-hidden="true">
      {url && !hasFailed ? (
        // LinkedIn photos come from several CDNs, so they're shown as they are.
        <Image
          src={url}
          alt=""
          width={px}
          height={px}
          unoptimized
          className={chat.avatarPhoto}
          onError={() => setHasFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function ConversationListSkeleton() {
  return (
    <div
      className={chat.listSkeleton}
      role="status"
      aria-busy="true"
      aria-label="Loading LinkedIn conversations"
    >
      {[0, 1, 2].map((i) => (
        <SkeletonText key={i} paragraph lineCount={2} />
      ))}
    </div>
  );
}

/** The sender's LinkedIn threads, newest first, in the same rows as the email list. */
export function ConversationList({
  conversations,
  selectedId,
  hrefFor,
}: {
  conversations: LinkedinConversation[];
  selectedId: string | null;
  hrefFor: (id: string) => string;
}) {
  return (
    <ul className={styles.list} aria-label="Conversations">
      {conversations.map((conversation) => {
        const isUnread = conversation.unread > 0;
        const isSelected = conversation.id === selectedId;
        return (
          <li key={conversation.id}>
            <Link
              href={hrefFor(conversation.id)}
              className={`${styles.row} ${chat.rowWithAvatar} ${isSelected ? styles.rowSelected : ''}`}
              aria-current={isSelected ? 'true' : undefined}
              scroll={false}
            >
              <span className={styles.dotCol} aria-hidden={isUnread ? undefined : true}>
                {isUnread ? (
                  <span className={styles.unreadDot}>
                    <span className="cds--visually-hidden">Unread: </span>
                  </span>
                ) : null}
              </span>
              <Avatar name={conversation.lead.name} url={conversation.lead.avatarUrl} size="md" />
              <span className={styles.rowBody}>
                <span className={styles.rowTop}>
                  <span className={isUnread ? styles.senderUnread : styles.sender}>
                    {conversation.lead.name}
                  </span>
                  {conversation.lastMessageAt ? (
                    <time className={styles.time} dateTime={conversation.lastMessageAt}>
                      {receivedLabel(conversation.lastMessageAt)}
                    </time>
                  ) : null}
                </span>
                {conversation.lead.headline ? (
                  <span className={styles.subjectLine}>
                    <span className={styles.subject}>{conversation.lead.headline}</span>
                  </span>
                ) : null}
                <span className={styles.preview}>{lastLine(conversation)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** One LinkedIn thread: who the lead is, then every message oldest first, ours on the right. */
export function ConversationThread({
  conversation,
  senderUuid,
  senderLabel,
  senderAvatarUrl,
  backHref,
}: {
  conversation: LinkedinConversation;
  senderUuid: string;
  senderLabel: string;
  senderAvatarUrl: string | null;
  backHref: string;
}) {
  const { lead, messages } = conversation;
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.uuid;
  // Resends a failed message as it was written.
  const retry = useSendLinkedinMessage(senderUuid, conversation);
  const retryingId = retry.isPending ? retry.variables?.replaces : undefined;
  const retryFailedId = retry.isError ? retry.variables?.replaces : undefined;

  // Like any chat, open at the newest message (and follow new replies as they sync in).
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [conversation.id, lastId]);

  return (
    <article className={chat.thread} aria-labelledby="conversation-title">
      <Link href={backHref} className={styles.back}>
        <ArrowLeft aria-hidden={true} /> Inbox
      </Link>

      <header className={chat.threadHeader}>
        <Avatar name={lead.name} url={lead.avatarUrl} size="lg" />
        <div className={chat.who}>
          <h2 id="conversation-title" className={chat.leadName}>
            {lead.name}
          </h2>
          {lead.headline ? <p className={chat.headline}>{lead.headline}</p> : null}
        </div>
        {lead.linkedinUrl ? (
          <Button
            kind="tertiary"
            size="md"
            href={lead.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            renderIcon={Launch}
          >
            LinkedIn profile
          </Button>
        ) : null}
      </header>

      <ol className={chat.messages} aria-label={`Messages with ${lead.name}`}>
        {messages.map((message) => {
          const isSent = message.direction === 'sent';
          const typeLabel = message.linkedinType ? TYPE_LABELS[message.linkedinType] : undefined;
          return (
            <li key={message.uuid} className={isSent ? chat.sent : chat.received}>
              <Avatar
                name={isSent ? senderLabel : lead.name}
                url={isSent ? senderAvatarUrl : lead.avatarUrl}
                size="sm"
              />
              <div className={chat.messageBody}>
                <p className={chat.meta}>
                  <span>{isSent ? senderLabel : lead.name}</span>
                  {message.sentAt ? (
                    <time dateTime={message.sentAt} title={fullDateLabel(message.sentAt)}>
                      {longDateLabel(message.sentAt)}
                    </time>
                  ) : null}
                  {typeLabel ? (
                    <Tag size="sm" type="gray">
                      {typeLabel}
                    </Tag>
                  ) : null}
                </p>
                <div className={chat.bubble}>
                  {message.subject ? <p className={chat.subject}>{message.subject}</p> : null}
                  <p className={chat.text}>{message.text}</p>
                </div>
                {isSent && message.status === 'failed' ? (
                  <div className={chat.failedRow}>
                    <p className={chat.failed}>
                      {retryingId === message.uuid
                        ? 'Sending again…'
                        : retryFailedId === message.uuid
                          ? `Still not sent: ${toUserMessage(retry.error)}`
                          : `Not sent${message.failReason ? `: ${message.failReason}` : '.'}`}
                    </p>
                    <IconButton
                      kind="ghost"
                      size="sm"
                      align="left"
                      label="Retry sending"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate({ text: message.text, replaces: message.uuid })}
                    >
                      <Renew />
                    </IconButton>
                  </div>
                ) : isSent && message.status === 'in_progress' ? (
                  <p className={chat.pending}>Sending…</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className={chat.composerDock}>
        {/* Keyed by thread, so a half-written reply never carries over to another person. */}
        <Composer
          key={conversation.id}
          conversation={conversation}
          senderUuid={senderUuid}
          senderLabel={senderLabel}
        />
      </div>
      {/* Scrolling to this, after the sticky reply box, takes the pane to its very bottom. */}
      <div ref={endRef} aria-hidden="true" />
    </article>
  );
}

/** Reply box: sends through GetSales from this sender's LinkedIn account. */
function Composer({
  conversation,
  senderUuid,
  senderLabel,
}: {
  conversation: LinkedinConversation;
  senderUuid: string;
  senderLabel: string;
}) {
  const send = useSendLinkedinMessage(senderUuid, conversation);
  const firstName = conversation.lead.name.split(' ')[0] ?? conversation.lead.name;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendLinkedinMessageInput>({
    resolver: zodResolver(sendLinkedinMessageInputSchema),
    defaultValues: { text: '' },
  });

  const submit = handleSubmit((input) => {
    if (send.isPending) return;
    send.mutate(input, { onSuccess: () => reset() });
  });

  return (
    <form
      className={chat.composer}
      aria-label={`Reply to ${conversation.lead.name}`}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      {send.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Couldn’t send it."
          subtitle={toUserMessage(send.error)}
          onCloseButtonClick={() => send.reset()}
        />
      ) : null}
      <div className={chat.composerRow}>
        <TextArea
          id={`reply-${conversation.id}`}
          className={chat.composerField}
          labelText={`Message ${conversation.lead.name}`}
          hideLabel
          placeholder={`Write a message to ${firstName}…`}
          rows={2}
          maxCount={LINKEDIN_MESSAGE_MAX}
          invalid={Boolean(errors.text)}
          invalidText={errors.text?.message}
          {...register('text')}
          onKeyDown={(event) => {
            // Outreach can't be unsent, so plain Enter is a new line; ⌘/Ctrl + Enter sends.
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <Button type="submit" size="md" renderIcon={Send} disabled={send.isPending}>
          {send.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      <p className={chat.composerHint}>
        Sends from {senderLabel}’s LinkedIn. ⌘ or Ctrl + Enter to send.
      </p>
    </form>
  );
}
