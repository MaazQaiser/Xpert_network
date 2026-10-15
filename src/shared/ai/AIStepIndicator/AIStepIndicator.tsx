'use client';

import { InlineLoading } from '@carbon/react';

export type AIStepIndicatorProps = {
  steps: string[];
  isActive: boolean;
};

/** "Searching library… Reading 4 sources… Writing answer" (UX_PRINCIPLES §1). */
export function AIStepIndicator({ steps, isActive }: AIStepIndicatorProps) {
  const current = steps.at(-1);
  if (!isActive) return null;
  return <InlineLoading status="active" description={current ?? 'Thinking…'} />;
}
