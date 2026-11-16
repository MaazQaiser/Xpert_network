import { describe, expect, it } from 'vitest';
import type { Search } from '../../model/search.schema';
import { budgetReachedIn, outcomeText } from './searchFormat';

const search = (fields: Partial<Search>): Search =>
  ({
    id: 'search_1',
    briefId: 'brief_1',
    status: 'running',
    note: null,
    target: 4,
    columns: [],
    groups: [],
    people: [],
    progress: { matches: 3, byGroup: [], done: false, analysed: 10 },
    cost: { exaDollars: 0, fullenrichCredits: 0, fullenrichDollars: null, totalDollars: 0 },
    startedAt: '2026-11-16T09:00:00+00:00',
    endedAt: null,
    ...fields,
  }) as Search;

describe('search wording', () => {
  it('reads the web budget from the note', () => {
    expect(budgetReachedIn('Exa budget reached ($2.00)')).toBe(2);
    expect(budgetReachedIn('Exa budget reached ($0.25)')).toBe(0.25);
    expect(budgetReachedIn('Found 2 of 4')).toBeNull();
    expect(budgetReachedIn(null)).toBeNull();
  });

  it('says the budget from the note, else the one given, never the provider', () => {
    const ended = search({ status: 'budget_reached', note: 'Exa budget reached ($1.50)' });
    expect(outcomeText(ended, 2)).toBe('Web search budget reached ($1.50)');
    expect(outcomeText({ ...ended, note: null }, 2)).toBe('Web search budget reached ($2.00)');
    expect(outcomeText({ ...ended, note: null })).toBe('Web search budget reached');
    expect(outcomeText(search({ status: 'found' }))).toBe('Found 3 of 4');
  });
});
