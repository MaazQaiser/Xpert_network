'use client';

import { Construct } from '@carbon/pictograms-react';
import { EmptyState } from '../EmptyState/EmptyState';
import { PageHeader } from '../PageHeader/PageHeader';

export type PlaceholderScreenProps = {
  title: string;
  /** e.g. "F3 · Library purchase" */
  flow: string;
  phase: number;
  description: string;
};

/** Prototype-only stand-in for a screen planned in a later build phase (PRODUCT_PLAN §11). */
export function PlaceholderScreen({ title, flow, phase, description }: PlaceholderScreenProps) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        pictogram={<Construct aria-hidden="true" />}
        title={`Planned for phase ${phase}`}
        description={`${flow}: ${description}`}
      />
    </>
  );
}
