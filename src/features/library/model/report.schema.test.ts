import { describe, expect, it } from 'vitest';
import { filtersFromParams, filtersToParams, hasActiveFilters } from './report.schema';

describe('library filters in the URL', () => {
  it('round-trips search, industry, regions, price cap, owned and view', () => {
    const params = new URLSearchParams(
      'q=coffee&industry=Food+%26+beverage&region=rg_ksa&region=rg_riyadh&maxPrice=150&owned=1&view=table',
    );
    const filters = filtersFromParams(params);
    expect(filters).toEqual({
      q: 'coffee',
      industry: 'Food & beverage',
      regionIds: ['rg_ksa', 'rg_riyadh'],
      maxPrice: 150,
      ownedOnly: true,
    });
    expect(filtersToParams(filters, 'table').toString()).toBe(params.toString());
  });

  it('ignores junk and reports when nothing is filtered', () => {
    const filters = filtersFromParams(new URLSearchParams('maxPrice=abc'));
    expect(filters.maxPrice).toBeNull();
    expect(hasActiveFilters(filters)).toBe(false);
  });
});
