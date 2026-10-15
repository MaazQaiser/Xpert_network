'use client';

import { useState } from 'react';
import {
  Button,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  SkeletonText,
  Stack,
} from '@carbon/react';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import { toUserMessage } from '@/shared/api';
import { useCreditPacks, useTopUp } from '../../api/useWallet';
import styles from './TopUpPanel.module.scss';

type TopUpPanelProps = {
  /** Credits still needed; the smallest pack that covers it is preselected. */
  shortfall?: number;
  onToppedUp?: () => void;
};

/** Inline top-up used wherever a balance is too low (F2 step 7, F3, F6). */
export function TopUpPanel({ shortfall = 0, onToppedUp }: TopUpPanelProps) {
  const packs = useCreditPacks();
  const topUp = useTopUp();
  const fallbackPack = packs.data?.find((p) => p.credits >= shortfall) ?? packs.data?.at(-1);
  const [selected, setSelected] = useState<string | null>(null);
  const packId = selected ?? fallbackPack?.id ?? null;

  if (packs.isPending) return <SkeletonText paragraph lineCount={3} />;
  if (packs.isError) {
    return (
      <InlineNotification
        kind="error"
        title="Credit packs didn’t load"
        subtitle={toUserMessage(packs.error)}
        lowContrast
        hideCloseButton
      />
    );
  }

  return (
    <Stack gap={5}>
      <RadioButtonGroup
        legendText="Choose a credit pack"
        name="credit-pack"
        orientation="vertical"
        valueSelected={packId ?? undefined}
        onChange={(value) => setSelected(String(value))}
      >
        {packs.data.map((pack) => (
          <RadioButton
            key={pack.id}
            id={`pack-${pack.id}`}
            value={pack.id}
            labelText={`${pack.label}: ${formatCreditsWithCurrency(pack.credits)}${pack.isPopular ? ' · Most popular' : ''}`}
          />
        ))}
      </RadioButtonGroup>
      {topUp.isError ? (
        <InlineNotification
          kind="error"
          title="Top-up failed"
          subtitle={toUserMessage(topUp.error)}
          lowContrast
          hideCloseButton
        />
      ) : null}
      <div>
        <Button
          kind="secondary"
          size="md"
          disabled={!packId || topUp.isPending}
          onClick={() => {
            if (!packId) return;
            topUp.mutate({ packId }, { onSuccess: () => onToppedUp?.() });
          }}
        >
          {topUp.isPending ? 'Adding credits…' : 'Buy credits'}
        </Button>
      </div>
      <p className={styles.note}>Prototype: no payment is taken.</p>
    </Stack>
  );
}
