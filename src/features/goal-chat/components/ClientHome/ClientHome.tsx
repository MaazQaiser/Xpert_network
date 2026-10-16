'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, InlineNotification } from '@carbon/react';
import { useSession } from '@/features/auth';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useCreateBrief } from '../../api/queries';
import { GOAL_TYPE_LABELS, type GoalType } from '../../model/brief.schema';
import { setPendingPrompt } from '../../model/pendingPrompt';
import { FloatingComposer } from '../FloatingComposer/FloatingComposer';
import { RecentBriefs } from '../RecentBriefs/RecentBriefs';
import styles from './ClientHome.module.scss';

const QUICK_STARTS: GoalType[] = ['invest', 'expand', 'market'];

function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Client home, centred like a chat start page: a short greeting, the composer, quick
 * starts, and the latest briefs to continue.
 */
export function ClientHome() {
  const router = useRouter();
  const session = useSession();
  const create = useCreateBrief();
  const firstName = session.data?.user?.name.split(' ')[0];

  const startFromText = (text: string) => {
    create.mutate(undefined, {
      onSuccess: (brief) => {
        setPendingPrompt(brief.id, text);
        router.push(routes.client.brief(brief.id));
      },
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.column}>
        <header className={styles.intro}>
          <p className={styles.greeting}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className={styles.title}>What are you researching today?</h1>
        </header>

        {create.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t start a new brief"
            subtitle={toUserMessage(create.error)}
            lowContrast
            onCloseButtonClick={() => create.reset()}
          />
        ) : null}
        <FloatingComposer
          placement="inline"
          autoFocus
          label="Describe your research goal"
          placeholder="e.g. Should we open 3 café franchises in Riyadh next year?"
          isBusy={create.isPending}
          onSend={startFromText}
        />

        <div className={styles.quickStarts} role="group" aria-label="Quick starts">
          {QUICK_STARTS.map((goal) => (
            <Button
              key={goal}
              as={Link}
              href={`${routes.client.ask}?goal=${goal}`}
              kind="tertiary"
              size="sm"
              className={styles.quickStart}
            >
              {GOAL_TYPE_LABELS[goal]}
            </Button>
          ))}
        </div>

        <RecentBriefs />
      </div>
    </div>
  );
}
