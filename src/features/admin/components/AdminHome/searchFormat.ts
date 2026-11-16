/**
 * How a people search reads in words, shared by the chat card and the results table so both say
 * the same thing. The UI never names the providers: "Profile search" and "Web search".
 */

import type { Search, SearchCost } from '../../model/search.schema';
import { withoutProviderNames } from '../../model/searchText';

export const dollars = (amount: number) => `$${amount.toFixed(2)}`;
export const credits = (amount: number) => String(Number(amount.toFixed(2)));
export const people = (count: number) => (count === 1 ? '1 person' : `${count} people`);

/** "Web $1.30 · Profile search 12.5 credits (≈ $0.60) · total ≈ $1.90". */
export function costText(cost: SearchCost): string {
  const profile = `Profile search ${credits(cost.fullenrichCredits)} credits`;
  if (cost.fullenrichDollars === null) return `Web ${dollars(cost.exaDollars)} · ${profile}`;
  return (
    `Web ${dollars(cost.exaDollars)} · ${profile} (≈ ${dollars(cost.fullenrichDollars)}) · ` +
    `total ≈ ${dollars(cost.totalDollars)}`
  );
}

/** People looked at so far. */
export const checkedCount = (search: Search) =>
  search.progress.analysed ?? search.analysed ?? search.people.length;

/** "Hiker 2/3 · Runner 1/3"; null without profile groups. */
export function groupProgressText(search: Search): string | null {
  const groups = search.progress.byGroup;
  if (groups.length === 0) return null;
  return groups
    .map((g) => (g.quota === null ? `${g.name} ${g.found}` : `${g.name} ${g.found}/${g.quota}`))
    .join(' · ');
}

/**
 * The web budget, when the search's note says it was reached ("Exa budget reached ($2.00)", as
 * the backend writes it); null otherwise.
 */
export function budgetReachedIn(note: string | null): number | null {
  const found = note ? /budget reached \(\$(\d+(?:\.\d+)?)\)/i.exec(note) : null;
  return found?.[1] ? Number(found[1]) : null;
}

/** "Web search budget reached ($2.00)", from the note's amount, else the budget given. */
export function budgetReachedText(search: Search, exaBudget?: number | null): string {
  const amount = budgetReachedIn(search.note) ?? exaBudget ?? null;
  return amount === null
    ? 'Web search budget reached'
    : `Web search budget reached (${dollars(amount)})`;
}

/** How a search ended (or that it's still going), in words. */
export function outcomeText(search: Search, exaBudget?: number | null): string {
  switch (search.status) {
    case 'found':
      return `Found ${search.progress.matches} of ${search.target}`;
    case 'stopped':
      return 'Stopped';
    case 'budget_reached':
      return budgetReachedText(search, exaBudget);
    case 'exhausted':
      // The note is the search agent's own last words: they may name the providers.
      return search.note
        ? `Couldn’t find more: ${withoutProviderNames(search.note)}`
        : 'Couldn’t find more';
    case 'failed':
      // The note is an internal error ("HTTPStatusError: …"): never shown.
      return 'Failed: something went wrong while searching.';
    case 'running':
      return 'Searching';
  }
}
