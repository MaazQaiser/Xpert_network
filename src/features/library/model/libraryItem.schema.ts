import { z } from 'zod';

/** Report sections carry topic tags that link them to research questions (coverage map). */
export const tocSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  topics: z.array(z.string()),
});
export type TocSection = z.infer<typeof tocSectionSchema>;

/** Experts are anonymous to clients: role + years + region (open question #1, decided). */
export const anonymousExpertSchema = z.object({
  role: z.string(),
  years: z.number().int(),
  region: z.string(),
});
export type AnonymousExpert = z.infer<typeof anonymousExpertSchema>;

export const libraryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  category: z.object({ industry: z.string(), subIndustry: z.string() }),
  regionIds: z.array(z.string()),
  companyIds: z.array(z.string()),
  priceCredits: z.number().int().positive(),
  expertCount: z.number().int().positive(),
  experts: z.array(anonymousExpertSchema),
  toc: z.array(tocSectionSchema),
  publishedAt: z.string(),
  provenance: z.string(),
});
export type LibraryItem = z.infer<typeof libraryItemSchema>;
