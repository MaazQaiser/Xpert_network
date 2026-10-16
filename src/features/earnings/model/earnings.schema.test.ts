import { describe, expect, it } from 'vitest';
import { payoutMethodFormSchema, payoutMethodInputSchema } from './earnings.schema';

// The standard example IBAN used in banking documentation; not a real account.
const EXAMPLE_IBAN = 'AE07 0331 2345 6789 0123 456';

describe('earnings model (F10)', () => {
  it('accepts an IBAN with spaces and normalises it', () => {
    const parsed = payoutMethodInputSchema.parse({
      kind: 'bank',
      holder: 'Sara Al-Mansouri',
      iban: EXAMPLE_IBAN.toLowerCase(),
    });
    expect(parsed).toMatchObject({ iban: 'AE070331234567890123456' });
  });

  it('checks only the field for the chosen method', () => {
    const bank = payoutMethodFormSchema.safeParse({
      kind: 'bank',
      holder: 'Sara',
      iban: '1234',
      email: '',
    });
    expect(bank.success).toBe(false);
    expect(bank.error?.issues.map((i) => i.path[0])).toEqual(['iban']);
    const paypal = payoutMethodFormSchema.safeParse({
      kind: 'paypal',
      holder: 'Sara',
      iban: '',
      email: 'sara@mail.example',
    });
    expect(paypal.success).toBe(true);
  });
});
