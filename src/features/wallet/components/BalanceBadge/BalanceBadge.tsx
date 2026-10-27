'use client';

import Link from 'next/link';
import { Wallet as WalletIcon } from '@carbon/icons-react';
import { formatCredits } from '@/shared/lib/credits';
import { useWallet } from '../../api/useWallet';
import { LOW_BALANCE_THRESHOLD } from '../../model/wallet.schema';
import styles from './BalanceBadge.module.scss';

/** Credit balance in the header; links to the wallet. */
export function BalanceBadge() {
  const wallet = useWallet();
  const balance = wallet.data?.balance;
  const isLow = balance !== undefined && balance < LOW_BALANCE_THRESHOLD;
  return (
    <Link
      href="/wallet"
      className={styles.root}
      aria-label={
        balance === undefined
          ? 'Wallet'
          : `Wallet: ${formatCredits(balance)}${isLow ? ', low balance' : ''}`
      }
    >
      <WalletIcon size={20} aria-hidden="true" />
      <span className={styles.amount}>{balance === undefined ? '…' : formatCredits(balance)}</span>
    </Link>
  );
}
