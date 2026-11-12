'use client';

import { useEffect, useRef } from 'react';
import {
  Accordion,
  AccordionItem,
  InlineNotification,
  ToggleSkeleton,
  Toggle,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { useListFollowUp, useSaveListFollowUp } from '../../api/queries';
import styles from './ListFollowUp.module.scss';

const sameQuestions = (a: string[], b: string[]) =>
  a.length === b.length && a.every((q, i) => q === b[i]);

/**
 * The list project's automatic follow-up: when someone on the list replies interested, the
 * server sends them the project's screening questions as the next LinkedIn message.
 */
export function ListFollowUp({ listUuid, questions }: { listUuid: string; questions: string[] }) {
  const followUp = useListFollowUp(listUuid);
  const save = useSaveListFollowUp(listUuid);
  const data = followUp.data;
  const syncing = useRef<string | null>(null);

  // While it's on, edits to the screening questions reach the server too.
  useEffect(() => {
    if (!data?.enabled || questions.length === 0 || sameQuestions(data.questions, questions)) {
      return;
    }
    const key = JSON.stringify(questions);
    if (syncing.current === key) return; // one try per edit, so a failure doesn't loop
    syncing.current = key;
    save.mutate({ enabled: true, questions });
  }, [data, questions, save]);

  if (followUp.isPending) return <ToggleSkeleton />;
  if (followUp.isError) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The automatic follow-up didn’t load."
        subtitle={toUserMessage(followUp.error)}
      />
    );
  }

  const on = followUp.data.enabled;
  const noQuestions = questions.length === 0;

  return (
    <div className={styles.root}>
      <Toggle
        id={`follow-up-${listUuid}`}
        size="sm"
        labelText="Send the screening questions to interested replies"
        labelA="Off"
        labelB="On"
        toggled={on}
        disabled={save.isPending || (noQuestions && !on)}
        onToggle={(enabled) => save.mutate({ enabled, questions })}
      />
      <p className={styles.helper}>
        {noQuestions && !on
          ? 'Add screening questions to this project to turn this on.'
          : on
            ? `On. When someone on this list replies interested, they get the questions as the next message, unless you’ve already answered. Sent to ${followUp.data.sentCount} ${followUp.data.sentCount === 1 ? 'person' : 'people'} so far.`
            : 'When someone on this list replies interested, they get the questions as the next message. Only replies that arrive after you turn this on.'}
      </p>
      {save.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t save."
          subtitle={toUserMessage(save.error)}
          onClose={() => save.reset()}
        />
      ) : null}
      {on && followUp.data.message ? (
        <Accordion size="sm" className={styles.preview}>
          <AccordionItem title="The message they get">
            <p className={styles.message}>{followUp.data.message}</p>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}
