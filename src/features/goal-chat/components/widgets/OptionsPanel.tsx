'use client';

import { useState } from 'react';
import { Button, RadioTile, TileGroup } from '@carbon/react';
import { formatCreditsWithCurrency } from '@/shared/lib/credits';
import { summariseCoverage, type CoverageResult } from '../../model/coverage.schema';
import type { ResearchBrief, ResearchOption } from '../../model/brief.schema';
import { CoverageMap } from './CoverageMap';
import styles from './widgets.module.scss';

type OptionsPanelProps = {
  brief: ResearchBrief;
  coverage: CoverageResult;
  isInteractive: boolean;
  onChoose: (option: ResearchOption) => void;
};

/** F2 step 6: coverage map + three option cards: library, custom, mix. */
export function OptionsPanel({ brief, coverage, isInteractive, onChoose }: OptionsPanelProps) {
  const counts = summariseCoverage(coverage.items);
  const toBuy = coverage.reports.filter((r) => !r.owned);
  const libraryCost = toBuy.reduce((sum, r) => sum + r.priceCredits, 0);
  const hasLibrary = coverage.reports.length > 0;
  const hasGaps = counts.full < counts.total;

  // Facets that don't apply are disabled with a reason, not hidden (UX_PRINCIPLES search rules).
  const options: { value: ResearchOption; title: string; body: string; isDisabled: boolean }[] = [
    {
      value: 'library',
      title: 'Buy library reports',
      body: hasLibrary
        ? `${coverage.reports.length} ${coverage.reports.length === 1 ? 'report' : 'reports'} answering ${counts.full + counts.partial} of ${counts.total} questions · ${libraryCost ? formatCreditsWithCurrency(libraryCost) : 'already owned'} · instant access`
        : 'No library reports match your questions yet.',
      isDisabled: !hasLibrary,
    },
    {
      value: 'custom',
      title: 'Request custom research',
      body: `Fresh expert interviews on all ${counts.total} questions · free quote within 24 hours · pay only if you accept`,
      isDisabled: false,
    },
    {
      value: 'mix',
      title: 'Mix: reports now, custom for the gaps',
      body:
        hasLibrary && hasGaps
          ? `Buy ${coverage.reports.length} ${coverage.reports.length === 1 ? 'report' : 'reports'} now and get a quote for the ${counts.total - counts.full} ${counts.total - counts.full === 1 ? 'question' : 'questions'} they don’t fully answer`
          : hasGaps
            ? 'Not available: nothing in the library to combine with.'
            : 'Not needed: the library already covers every question.',
      isDisabled: !(hasLibrary && hasGaps),
    },
  ];

  const recommended: ResearchOption = !hasLibrary ? 'custom' : hasGaps ? 'mix' : 'library';
  const [choice, setChoice] = useState<ResearchOption>(brief.chosenOption ?? recommended);

  return (
    <div className={styles.stack}>
      <CoverageMap coverage={coverage} questions={brief.questions} />
      <TileGroup
        legend="How would you like to proceed?"
        name={`option-${brief.id}`}
        valueSelected={choice}
        disabled={!isInteractive}
        onChange={(value) => setChoice(value as ResearchOption)}
        className={styles.options}
      >
        {options.map((option, index) => (
          <RadioTile
            key={option.value}
            id={`option-${brief.id}-${option.value}`}
            value={option.value}
            disabled={option.isDisabled || !isInteractive}
            className={styles.optionTile}
          >
            <span className={styles.optionTitle}>
              {index + 1}. {option.title}
              {option.value === recommended ? (
                <span className={styles.recommended}> · Recommended</span>
              ) : null}
            </span>
            <span className={styles.optionBody}>{option.body}</span>
          </RadioTile>
        ))}
      </TileGroup>
      {isInteractive ? (
        <div>
          <Button size="md" onClick={() => onChoose(choice)}>
            Continue
          </Button>
        </div>
      ) : null}
    </div>
  );
}
