import { describe, expect, it } from 'vitest';
import { formatCredits, formatCreditsWithCurrency } from './credits';

describe('credits formatting', () => {
  it('pluralises credits', () => {
    expect(formatCredits(1)).toBe('1 credit');
    expect(formatCredits(1200)).toBe('1,200 credits');
  });

  it('shows the currency equivalent next to credits', () => {
    expect(formatCreditsWithCurrency(120)).toBe('120 credits (≈ $600)');
  });
});
