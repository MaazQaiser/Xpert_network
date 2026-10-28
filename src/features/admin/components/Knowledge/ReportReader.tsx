'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, SkeletonText } from '@carbon/react';
import { ArrowLeft, Video } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, NotFoundState } from '@/shared/ui';
import { useCallRecord } from '../../api/queries';
import { CallReport } from '../Calls/CallReport';
import styles from './Knowledge.module.scss';

/**
 * One research report from the knowledge base, read as a page. A timestamp in it opens the
 * call itself, where the recording and transcript live.
 */
export function ReportReader({ callId }: { callId: string }) {
  const report = useCallRecord(callId);
  const router = useRouter();
  return (
    <div className={styles.root}>
      <div className={styles.readerBar}>
        <Link href={routes.admin.knowledge} className={styles.back}>
          <ArrowLeft aria-hidden={true} />
          Knowledge base
        </Link>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Video}
          onClick={() => router.push(routes.admin.callReview(callId))}
        >
          Open the call recording
        </Button>
      </div>
      <AsyncBoundary
        query={report}
        errorTitle="This report didn’t load"
        notFound={
          <NotFoundState
            title="Report not found"
            message="It may have been removed. The other reports are still in the knowledge base."
            backHref={routes.admin.knowledge}
            backLabel="Back to the knowledge base"
          />
        }
        loading={
          <div className={styles.panel} aria-busy="true" aria-label="Loading the report">
            <SkeletonText heading width="40%" />
            <SkeletonText paragraph lineCount={12} />
          </div>
        }
      >
        {(data) => (
          <div className={styles.reader}>
            <CallReport call={data} onJump={() => router.push(routes.admin.callReview(callId))} />
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
