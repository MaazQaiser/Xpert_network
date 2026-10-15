'use client';

import { useState, type FormEvent } from 'react';
import { Button, Form, InlineNotification, TextArea } from '@carbon/react';
import { Send } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { useSendRequestMessage } from '../../api/queries';
import type { CustomRequest } from '../../model/request.schema';
import styles from './RequestDetail.module.scss';

/** Ask the research team about a quote or a running request (F4 step 4). */
export function MessagesPanel({ request }: { request: CustomRequest }) {
  const send = useSendRequestMessage(request.id);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim().length < 2) {
      setError('Write a question first.');
      return;
    }
    setError(null);
    send.mutate({ text: draft.trim() }, { onSuccess: () => setDraft('') });
  };

  return (
    <section id="request-messages" className={styles.card} aria-labelledby="messages-heading">
      <h2 id="messages-heading" className={styles.cardTitle}>
        Questions for our team
      </h2>
      {request.messages.length === 0 ? (
        <p className={styles.help}>
          Ask about scope, timing or experts. We reply within one working day.
        </p>
      ) : (
        <ol className={styles.messages} aria-label="Messages">
          {request.messages.map((message) => (
            <li
              key={message.id}
              className={message.author === 'client' ? styles.messageClient : styles.messageTeam}
            >
              <span className={styles.messageAuthor}>
                {message.author === 'client' ? 'You' : 'Xpert Network research team'}
              </span>
              <p>{message.text}</p>
              <time
                className={styles.activityTime}
                dateTime={message.at}
                title={formatDateTime(message.at)}
              >
                {formatRelative(message.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
      {send.isError ? (
        <InlineNotification
          kind="error"
          title="Message not sent"
          subtitle={`${toUserMessage(send.error)} Your message is still here.`}
          lowContrast
          hideCloseButton
          className={styles.notice}
        />
      ) : null}
      <Form onSubmit={onSubmit} aria-label="Send a message" className={styles.messageForm}>
        <TextArea
          id="request-message"
          labelText="Your question"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          invalid={Boolean(error)}
          invalidText={error ?? undefined}
        />
        <div>
          <Button
            type="submit"
            kind="tertiary"
            size="md"
            renderIcon={Send}
            disabled={send.isPending}
          >
            Send
          </Button>
        </div>
      </Form>
    </section>
  );
}
