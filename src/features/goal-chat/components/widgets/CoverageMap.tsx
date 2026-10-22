'use client';

import { Button } from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { StatusTag, type StatusTone } from '@/shared/ui';
import { useOpenReportReview } from '../ReportReview/reportReviewContext';
import {
  COVERAGE_LABELS,
  summariseCoverage,
  type CoverageLevel,
  type CoverageResult,
} from '../../model/coverage.schema';
import type { Question } from '../../model/brief.schema';
import styles from './widgets.module.scss';

const TONE: Record<CoverageLevel, StatusTone> = {
  full: 'success',
  partial: 'warning',
  none: 'neutral',
};

type CoverageMapProps = { coverage: CoverageResult; questions: Question[] };

/** Per question: Covered / Partly / Not covered, with the "why" (PRODUCT_PLAN §10). */
export function CoverageMap({ coverage, questions }: CoverageMapProps) {
  const counts = summariseCoverage(coverage.items);
  const openReport = useOpenReportReview();
  return (
    <section className={styles.stack} aria-labelledby="coverage-heading">
      <div className={styles.labelRow}>
        <h3 id="coverage-heading" className={styles.sectionTitle}>
          Coverage map
        </h3>
        <AIExplainLabel
          size="mini"
          aria-label="About the coverage map"
          summary="Each question was matched to sections of published library reports. “Partly” means the report covers a broader or different region or company."
          basis={`${coverage.reports.length} library reports`}
          confidence={`${counts.full} covered · ${counts.partial} partly · ${counts.none} not covered`}
        />
      </div>
      <ul className={styles.coverageList}>
        {coverage.items.map((item) => {
          const question = questions.find((q) => q.id === item.questionId);
          const source = item.matches[0];
          return (
            <li key={item.questionId} className={styles.coverageRow}>
              <p className={styles.coverageQuestion}>{question?.text ?? 'Question'}</p>
              <div className={styles.coverageMeta}>
                <StatusTag
                  tone={TONE[item.coverage]}
                  label={COVERAGE_LABELS[item.coverage]}
                  size="sm"
                />
                <p className={styles.muted}>
                  {item.reason}
                  {source ? <> Source: {source.reportTitle}.</> : null}
                </p>
                {openReport && source ? (
                  <Button kind="ghost" size="sm" onClick={() => openReport(source.libraryItemId)}>
                    View report
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
