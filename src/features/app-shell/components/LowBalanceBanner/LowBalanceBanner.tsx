'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionableNotification } from '@carbon/react';
import { formatCredits } from '@/shared/lib/credits';
import { LOW_BALANCE_THRESHOLD, useWallet } from '@/features/wallet';
import styles from './LowBalanceBanner.module.scss';

/** App-wide low-balance banner (F6). Dismissed for the rest of the visit. */
export function LowBalanceBanner() {
  const router = useRouter();
  const wallet = useWallet();
  const [isDismissed, setIsDismissed] = useState(false);
  const balance = wallet.data?.balance;
  if (isDismissed || balance === undefined || balance >= LOW_BALANCE_THRESHOLD) return null;

  return (
    <div className={styles.root}>
      <ActionableNotification
        kind="warning"
        title="Your credit balance is low"
        subtitle={`You have ${formatCredits(balance)} left. Top up to keep buying reports.`}
        actionButtonLabel="Top up"
        onActionButtonClick={() => router.push('/wallet')}
        onCloseButtonClick={() => setIsDismissed(true)}
        inline
        hasFocus={false}
        lowContrast
      />
    </div>
  );
}
