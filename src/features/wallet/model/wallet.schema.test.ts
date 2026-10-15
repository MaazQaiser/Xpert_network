import { describe, expect, it } from 'vitest';
import { spentThisMonth, type Transaction } from './wallet.schema';

const t = (type: Transaction['type'], amount: number, at: string): Transaction => ({
  id: at,
  type,
  amount,
  description: '',
  at,
});

describe('spentThisMonth', () => {
  it('counts purchases and research spend this month only', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    expect(
      spentThisMonth(
        [
          t('purchase', -150, '2026-10-05T10:00:00Z'),
          t('spent', -120, '2026-10-12T10:00:00Z'),
          t('top_up', 500, '2026-10-01T10:00:00Z'),
          t('purchase', -80, '2026-09-28T10:00:00Z'),
        ],
        now,
      ),
    ).toBe(270);
  });
});
