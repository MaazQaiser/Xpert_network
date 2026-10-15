import { describe, expect, it } from 'vitest';
import { maskEmail, resetPasswordFormSchema, signUpFormSchema } from './credentials';

describe('signUpFormSchema', () => {
  const valid = {
    name: 'Layla Nasser',
    email: 'layla@nasser.example',
    password: 'harbour2026',
    acceptTerms: true,
  };

  it('accepts a complete sign-up', () => {
    expect(signUpFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects weak passwords with one actionable message', () => {
    const result = signUpFormSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/at least 10 characters/);
  });

  it('requires the terms to be accepted', () => {
    const result = signUpFormSchema.safeParse({ ...valid, acceptTerms: false });
    expect(result.error?.issues[0]?.path).toEqual(['acceptTerms']);
  });
});

describe('resetPasswordFormSchema', () => {
  it('flags mismatched confirmation on the confirm field', () => {
    const result = resetPasswordFormSchema.safeParse({
      password: 'harbour2026',
      confirm: 'harbour2027',
    });
    expect(result.error?.issues[0]?.path).toEqual(['confirm']);
  });
});

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('ayesha.rahman@meridiangulf.example')).toBe('a•••••@meridiangulf.example');
  });
});
