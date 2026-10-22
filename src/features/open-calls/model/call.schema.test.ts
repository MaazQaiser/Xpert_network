import { describe, expect, it } from 'vitest';
import {
  filtersFromParams,
  filtersToParams,
  matchesCallFilters,
  screeningFormSchema,
  sortCalls,
  type OpenCall,
} from './call.schema';

const call = (overrides: Partial<OpenCall>): OpenCall => ({
  id: 'c',
  title: 'Call',
  brief: '',
  industry: { id: 'in_specialty_coffee', label: 'Specialty coffee' },
  regions: [{ id: 'rg_ksa', label: 'Saudi Arabia' }],
  topics: [],
  questions: [],
  companiesInScope: [],
  feeUsd: 300,
  estMinutes: 45,
  deadline: null,
  mode: 'voice_or_text',
  evergreen: false,
  spotsLeft: 1,
  sections: [],
  screening: [],
  match: { level: 'strong', score: 90, reasons: [] },
  publishedAt: '',
  application: null,
  ...overrides,
});

describe('open calls model (F8)', () => {
  it('round-trips filters through the URL', () => {
    const filters = { industry: 'in_qsr', region: null, minFee: 200, maxMinutes: 45 };
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
    expect(filtersFromParams(new URLSearchParams('minFee=abc'))).toMatchObject({ minFee: null });
  });

  it('filters on fee floor and time cap', () => {
    const filters = { industry: null, region: 'rg_ksa', minFee: 250, maxMinutes: 45 };
    expect(matchesCallFilters(call({}), filters)).toBe(true);
    expect(matchesCallFilters(call({ feeUsd: 200 }), filters)).toBe(false);
    expect(matchesCallFilters(call({ estMinutes: 60 }), filters)).toBe(false);
  });

  it('lists the strongest match first, dated calls before evergreen ones', () => {
    const sorted = sortCalls([
      call({ id: 'weak', match: { level: 'partial', score: 20, reasons: [] } }),
      call({ id: 'evergreen', evergreen: true }),
      call({ id: 'dated' }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['dated', 'evergreen', 'weak']);
  });

  it('requires every screening answer, and a sentence for text questions', () => {
    const schema = screeningFormSchema([
      { id: 'a', kind: 'yes_no', text: 'Q?' },
      { id: 'b', kind: 'text', text: 'Tell us', hint: '' },
    ]);
    expect(schema.safeParse({ a: '', b: 'short' }).success).toBe(false);
    expect(schema.safeParse({ a: 'yes', b: 'I sourced green coffee for 40 stores.' }).success).toBe(
      true,
    );
  });
});
