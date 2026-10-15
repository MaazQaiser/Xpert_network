'use client';

import Link from 'next/link';
import { Button } from '@carbon/react';
import { CheckmarkFilled } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import type { ResearchOption } from '../../model/brief.schema';
import styles from './widgets.module.scss';

type DonePanelProps = {
  option: ResearchOption;
  purchasedReportIds: string[];
  requestId: string | null;
};

/** F2 done screen: what happened and where to find it next. */
export function DonePanel({ option, purchasedReportIds, requestId }: DonePanelProps) {
  return (
    <div className={styles.done}>
      <CheckmarkFilled size={24} className={styles.doneIcon} aria-hidden="true" />
      <div className={styles.stack}>
        <p className={styles.sectionTitle}>
          {option === 'library'
            ? 'Reports purchased'
            : option === 'custom'
              ? 'Quote requested'
              : 'Reports purchased and quote requested'}
        </p>
        <div className={styles.buttonRow}>
          {purchasedReportIds.length > 0 ? (
            <Button as={Link} href={routes.client.library} size="md">
              Open your reports
            </Button>
          ) : null}
          {requestId ? (
            <Button
              as={Link}
              href={routes.client.requests}
              size="md"
              kind={purchasedReportIds.length > 0 ? 'tertiary' : 'primary'}
            >
              Track your request
            </Button>
          ) : null}
          <Button as={Link} href={routes.client.home} kind="ghost" size="md">
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
