import { z } from 'zod';

export const coverageLevelSchema = z.enum(['full', 'partial', 'none']);
export type CoverageLevel = z.infer<typeof coverageLevelSchema>;

export const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  full: 'Covered',
  partial: 'Partly covered',
  none: 'Not covered',
};

export const coverageMatchSchema = z.object({
  libraryItemId: z.string(),
  reportTitle: z.string(),
  sectionTitle: z.string(),
});

export const coverageItemSchema = z.object({
  questionId: z.string(),
  coverage: coverageLevelSchema,
  /** The "why": which report sections matched, and any gap. */
  reason: z.string(),
  matches: z.array(coverageMatchSchema),
});
export type CoverageItem = z.infer<typeof coverageItemSchema>;

export const coverageReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  priceCredits: z.number().int(),
  expertCount: z.number().int(),
  owned: z.boolean(),
  questionIds: z.array(z.string()),
});
export type CoverageReport = z.infer<typeof coverageReportSchema>;

export const coverageResultSchema = z.object({
  items: z.array(coverageItemSchema),
  reports: z.array(coverageReportSchema),
});
export type CoverageResult = z.infer<typeof coverageResultSchema>;

export function summariseCoverage(items: CoverageItem[]) {
  return {
    full: items.filter((i) => i.coverage === 'full').length,
    partial: items.filter((i) => i.coverage === 'partial').length,
    none: items.filter((i) => i.coverage === 'none').length,
    total: items.length,
  };
}
