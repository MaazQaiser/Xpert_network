import { z } from 'zod';
import { anonymousExpertSchema, libraryItemSchema } from './libraryItem.schema';

export const chartSchema = z.object({
  title: z.string(),
  /** Unit for values, e.g. "SAR", "%", "days". */
  unit: z.string(),
  points: z.array(z.object({ label: z.string(), value: z.number() })),
});
export type Chart = z.infer<typeof chartSchema>;

/** A catalogue item as one client sees it: ownership and freshness included (F3). */
export const libraryEntrySchema = libraryItemSchema.extend({
  owned: z.boolean(),
  purchasedAt: z.string().nullable(),
  updatedAt: z.string(),
  /** What changed in the last update, shown to owners. */
  updateNote: z.string().nullable(),
  updatedSincePurchase: z.boolean(),
  readMinutes: z.number().int().positive(),
  sampleChart: chartSchema,
});
export type LibraryEntry = z.infer<typeof libraryEntrySchema>;

export const libraryListSchema = z.object({
  items: z.array(libraryEntrySchema),
  facets: z.object({
    industries: z.array(z.string()),
    regions: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
});
export type LibraryList = z.infer<typeof libraryListSchema>;

export const figureSchema = z.object({
  label: z.string(),
  value: z.string(),
  note: z.string().nullable(),
});
export type Figure = z.infer<typeof figureSchema>;

/** Verbatim expert quote; the expert stays anonymous (role, years, region). */
export const quoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  expert: anonymousExpertSchema,
});
export type Quote = z.infer<typeof quoteSchema>;

export const reportSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.array(z.string()),
  figures: z.array(figureSchema),
  chart: chartSchema.nullable(),
  quotes: z.array(quoteSchema),
});
export type ReportSection = z.infer<typeof reportSectionSchema>;

export const reportSchema = z.object({
  entry: libraryEntrySchema,
  sections: z.array(reportSectionSchema),
  /** Suggested first questions this report can answer (AI_NATIVE §4.1). */
  starterQuestions: z.array(z.string()),
});
export type Report = z.infer<typeof reportSchema>;

export const purchaseResultSchema = z.object({
  entry: libraryEntrySchema,
  balance: z.number().int(),
});
export type PurchaseResult = z.infer<typeof purchaseResultSchema>;

// ——— Ask this report (AI_NATIVE §4) ——————————————————————————————————

export const askInputSchema = z.object({
  /** Client-generated: retries of the same question are idempotent. */
  turnId: z.string(),
  question: z.string().trim().min(3).max(500),
});
export type AskInput = z.infer<typeof askInputSchema>;

export const citationSchema = z.object({
  /** The [n] marker used in the answer text. */
  n: z.number().int().positive(),
  sectionId: z.string(),
  sectionTitle: z.string(),
  /** The passage the claim comes from. */
  passage: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

export const reportAnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  text: z.string(),
  /** False when the report doesn't cover the question ("not in this report"). */
  inReport: z.boolean(),
  citations: z.array(citationSchema),
  followUps: z.array(z.string()),
});
export type ReportAnswer = z.infer<typeof reportAnswerSchema>;

// ——— Browse filters (kept in the URL) ————————————————————————————————

export const libraryViewSchema = z.enum(['cards', 'table']);
export type LibraryView = z.infer<typeof libraryViewSchema>;

export const libraryFiltersSchema = z.object({
  q: z.string(),
  industry: z.string().nullable(),
  regionIds: z.array(z.string()),
  maxPrice: z.number().int().positive().nullable(),
  ownedOnly: z.boolean(),
});
export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;

export const PRICE_CAPS = [100, 150, 200] as const;

export function filtersFromParams(params: URLSearchParams): LibraryFilters {
  const maxPrice = Number(params.get('maxPrice'));
  return {
    q: params.get('q') ?? '',
    industry: params.get('industry'),
    regionIds: params.getAll('region'),
    maxPrice: Number.isInteger(maxPrice) && maxPrice > 0 ? maxPrice : null,
    ownedOnly: params.get('owned') === '1',
  };
}

export function filtersToParams(filters: LibraryFilters, view: LibraryView): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.industry) params.set('industry', filters.industry);
  filters.regionIds.forEach((id) => params.append('region', id));
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  if (filters.ownedOnly) params.set('owned', '1');
  if (view === 'table') params.set('view', 'table');
  return params;
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return Boolean(
    filters.q.trim() ||
    filters.industry ||
    filters.regionIds.length ||
    filters.maxPrice ||
    filters.ownedOnly,
  );
}
