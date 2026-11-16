/**
 * Words from the backend that reach the UI. Notes are written by agents that name the providers;
 * the UI never does (profile search, web search), so they're reworded here, in one place.
 */

const PROVIDER_WORDS: [RegExp, string][] = [
  // Tool names first, e.g. "exa_find_people", "fullenrich_search".
  [/\bfull[\s_-]?enrich_\w+/gi, 'profile search'],
  [/\bexa_\w+/gi, 'web search'],
  [/\bget[\s_-]?sales_\w+/gi, 'outreach'],
  [/\bfull[\s_-]?enrich\b/gi, 'Profile search'],
  [/\bexa\b/gi, 'Web search'],
  [/\bget[\s_-]?sales\b/gi, 'outreach'],
];

/** The text with every provider's name replaced by what the UI calls it. */
export function withoutProviderNames(text: string): string {
  return PROVIDER_WORDS.reduce((result, [pattern, word]) => result.replace(pattern, word), text);
}

/** Reference URLs fit to link: no blanks, no repeats. */
export function cleanReferences(references: string[]): string[] {
  return [...new Set(references.map((url) => url.trim()).filter(Boolean))];
}
