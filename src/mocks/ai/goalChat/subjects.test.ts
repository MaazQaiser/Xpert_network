import { describe, expect, it } from 'vitest';
import { resolveSubject } from './subjects';

describe('resolveSubject', () => {
  it('resolves an exact label regardless of case', () => {
    const result = resolveSubject('riyadh');
    expect(result).toMatchObject({ kind: 'resolved', subject: { id: 'rg_riyadh' } });
  });

  it('resolves common aliases', () => {
    expect(resolveSubject('KSA')).toMatchObject({ kind: 'resolved', subject: { id: 'rg_ksa' } });
    expect(resolveSubject('cafes')).toMatchObject({
      kind: 'resolved',
      subject: { id: 'in_specialty_coffee' },
    });
  });

  it('asks "did you mean" when several companies match', () => {
    const result = resolveSubject('Qahwa');
    expect(result.kind).toBe('ambiguous');
    if (result.kind !== 'ambiguous') return;
    expect(result.candidates.map((c) => c.id)).toEqual(
      expect.arrayContaining(['co_qahwa_house', 'co_qahwa_lane']),
    );
  });

  it('returns unknown for text that matches nothing', () => {
    expect(resolveSubject('Zanzibar spice traders')).toEqual({ kind: 'unknown', candidates: [] });
  });
});
