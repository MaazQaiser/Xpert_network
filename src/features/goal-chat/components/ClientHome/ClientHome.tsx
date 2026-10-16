'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, InlineNotification, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { useSession } from '@/features/auth';
import { PageHeader } from '@/shared/ui';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useCreateBrief } from '../../api/queries';
import { setPendingPrompt } from '../../model/pendingPrompt';
import { FloatingComposer } from '../FloatingComposer/FloatingComposer';
import { ResumeBriefs } from '../ResumeBriefs/ResumeBriefs';
import styles from './ClientHome.module.scss';

/** Client home: start new research (card or the floating composer), resume briefs. */
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
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        subtitle="What decision are you working on?"
      />
      <Tile className={styles.hero}>
        <h2 className={styles.heroTitle}>Start new research</h2>
        <p className={styles.heroBody}>
          Answer a few guided questions. We’ll draft a research brief, show which questions the
          library already answers, and quote anything it doesn’t. Or just type your goal below.
        </p>
        <Button as={Link} href={routes.client.ask} renderIcon={ArrowRight}>
          Start new research
        </Button>
      </Tile>
      <ResumeBriefs />
      <div className={styles.composer}>
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
          label="Describe your research goal"
          placeholder="e.g. Should we open 3 café franchises in Riyadh next year?"
          isBusy={create.isPending}
          onSend={startFromText}
        />
      </div>
    </div>
  );
}
