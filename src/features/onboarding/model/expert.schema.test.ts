import { describe, expect, it } from 'vitest';
import { addBusinessDays, basicsSchema, positionSchema } from './expert.schema';

describe('expert onboarding rules', () => {
  it('skips weekends when estimating a decision date', () => {
    // Thursday 15 Oct 2026 + 2 business days → Monday 19 Oct.
    expect(addBusinessDays(new Date('2026-10-15T10:00:00Z'), 2).getDate()).toBe(19);
  });

  it('accepts an empty or well-formed LinkedIn link only', () => {
    const base = {
      headline: 'Former supply-chain manager, F&B',
      yearsExperience: 12,
      countryId: 'ct_ae',
    };
    expect(basicsSchema.safeParse({ ...base, linkedinUrl: '' }).success).toBe(true);
    expect(
      basicsSchema.safeParse({ ...base, linkedinUrl: 'https://www.linkedin.com/in/karim-aziz' })
        .success,
    ).toBe(true);
    expect(basicsSchema.safeParse({ ...base, linkedinUrl: 'linkedin karim' }).success).toBe(false);
  });

  it('rejects a role that ends before it starts, on the end year', () => {
    const result = positionSchema.safeParse({
      id: 'p1',
      company: 'Bayt Burger',
      title: 'Regional operations director',
      startYear: '2020',
      endYear: '2018',
    });
    expect(result.error?.issues[0]?.path).toEqual(['endYear']);
  });
});
