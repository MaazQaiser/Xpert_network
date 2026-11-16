import { describe, expect, it } from 'vitest';
import { cleanReferences, withoutProviderNames } from './searchText';

describe('withoutProviderNames', () => {
  it('rewords the providers, whatever the case', () => {
    expect(
      withoutProviderNames(
        'FullEnrich returned no one new and Exa found no more cafés; fullenrich and EXA are done.',
      ),
    ).toBe(
      'Profile search returned no one new and Web search found no more cafés; Profile search and Web search are done.',
    );
  });

  it('rewords tool names and GetSales', () => {
    expect(withoutProviderNames('exa_find_people and fullenrich_search gave nothing')).toBe(
      'web search and profile search gave nothing',
    );
    expect(withoutProviderNames('Ready for GetSales or getsales_send.')).toBe(
      'Ready for outreach or outreach.',
    );
  });

  it('leaves other words alone', () => {
    expect(withoutProviderNames('An exact example of examples')).toBe(
      'An exact example of examples',
    );
  });
});

describe('cleanReferences', () => {
  it('drops blanks and repeats', () => {
    expect(
      cleanReferences(['https://a.example', ' ', '', 'https://a.example', 'https://b.example']),
    ).toEqual(['https://a.example', 'https://b.example']);
  });
});
