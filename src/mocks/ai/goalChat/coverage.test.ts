import { describe, expect, it } from 'vitest';
import { LIBRARY_ITEMS } from '../../fixtures/library';
import { REGIONS } from '../../fixtures/entities';
import { computeCoverage } from './coverage';
import { makeBrief } from './fixtures.test-utils';

const riyadh = REGIONS.find((r) => r.id === 'rg_riyadh');
if (!riyadh) throw new Error('fixture missing');

const brief = makeBrief({
  goalType: 'expand',
  subjects: [{ id: riyadh.id, kind: 'region', label: riyadh.label, detail: riyadh.detail }],
  questions: [
    { id: 'q1', text: 'Who supplies cafés in Riyadh?', topic: 'suppliers', source: 'ai' },
    { id: 'q2', text: 'What rent should I expect in Riyadh?', topic: 'rent', source: 'ai' },
    { id: 'q3', text: 'Which licences are needed?', topic: 'licensing', source: 'ai' },
    { id: 'q4', text: 'How good is the leadership?', topic: 'leadership', source: 'ai' },
  ],
});

describe('computeCoverage', () => {
  const result = computeCoverage(brief, {
    library: LIBRARY_ITEMS,
    ownedReportIds: [],
    scenario: 'auto',
  });
  const byQuestion = Object.fromEntries(result.items.map((i) => [i.questionId, i]));

  it('marks a city-specific report as covered', () => {
    expect(byQuestion.q1?.coverage).toBe('full');
    expect(byQuestion.q1?.matches[0]?.libraryItemId).toBe('lib_riyadh_cafe_supply');
  });

  it('marks a report for another city as partly covered, and says why', () => {
    expect(byQuestion.q2?.coverage).toBe('partial');
    expect(byQuestion.q2?.reason).toMatch(/Dubai, not Riyadh/);
  });

  it('treats country-wide rules as covering a city question', () => {
    expect(byQuestion.q3?.coverage).toBe('full');
  });

  it('reports questions no library item answers', () => {
    expect(byQuestion.q4?.coverage).toBe('none');
  });

  it('lists each matched report once with the questions it answers', () => {
    const supply = result.reports.find((r) => r.id === 'lib_riyadh_cafe_supply');
    expect(supply?.questionIds).toEqual(['q1']);
    expect(new Set(result.reports.map((r) => r.id)).size).toBe(result.reports.length);
  });

  it('honours the "nothing covered" and "all covered" toolbar scenarios', () => {
    const none = computeCoverage(brief, {
      library: LIBRARY_ITEMS,
      ownedReportIds: [],
      scenario: 'none',
    });
    expect(none.items.every((i) => i.coverage === 'none')).toBe(true);
    const all = computeCoverage(brief, {
      library: LIBRARY_ITEMS,
      ownedReportIds: [],
      scenario: 'all',
    });
    expect(all.items.every((i) => i.coverage === 'full')).toBe(true);
  });

  it('marks reports the client already owns', () => {
    const owned = computeCoverage(brief, {
      library: LIBRARY_ITEMS,
      ownedReportIds: ['lib_dubai_rents'],
      scenario: 'auto',
    });
    expect(owned.reports.find((r) => r.id === 'lib_dubai_rents')?.owned).toBe(true);
  });
});
