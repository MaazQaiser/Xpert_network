import { z } from 'zod';

export const optionSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string().optional(),
});
export type Option = z.infer<typeof optionSchema>;

/** Pick lists shared by client interests (F1), expert expertise (F7) and settings (F17). */
export const taxonomySchema = z.object({
  industries: z.array(optionSchema),
  regions: z.array(optionSchema),
  topics: z.array(optionSchema),
  languages: z.array(optionSchema),
  countries: z.array(optionSchema),
});
export type Taxonomy = z.infer<typeof taxonomySchema>;

export function labelsFor(ids: string[], options: Option[]): string[] {
  return ids.map((id) => options.find((o) => o.id === id)?.label ?? id);
}
