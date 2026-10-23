import type { MatchedExpert, MatchResult } from '@/features/admin';

// The brief asks for US participants only.
const COUNTRIES = ['US'] as const;
const ROLES = [
  'Thru-hiker, Pacific Crest Trail',
  'Trail runner, 50 km ultras',
  'Backpacker, Appalachian Trail sections',
  'Trail runner, mountain races',
  'Thru-hiker, Colorado Trail',
  'Trail runner and backpacker',
  'Backpacker, John Muir Trail',
  'Trail runner, desert ultras',
  'Thru-hiker, Continental Divide Trail',
  'Trail runner, Pacific Northwest',
] as const;

const WHY = [
  'Wears Shokz OpenRun on every long run',
  'Finished a 5-night section hike in September',
  'Shared a GPS route map and race certificate',
  'Runs 40 km+ on trails most weekends',
  'Switched from earbuds to bone conduction last year',
  'Hikes solo and wants to hear wildlife and weather',
  'Was asked to remove earbuds on a shared trail',
  'Rated 4.8 on past Xpert Network interviews',
] as const;

/** Deterministic 0–1 from a string so the same expert always ranks the same. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function pick<T>(list: readonly T[], seed: string): T {
  const item = list[Math.floor(hash(seed) * list.length)];
  if (item === undefined) throw new Error('pick() needs a non-empty list');
  return item;
}

function whyFor(id: string): string[] {
  const a = pick(WHY, `${id}-a`);
  const b = pick(WHY, `${id}-b`);
  return a === b ? [a, pick(WHY, `${id}-c`)] : [a, b];
}

/**
 * Builds the 146 matches for PRJ-1042 (US thru-hikers and trail runners). Expert #4821 is always first so the
 * expert-app side of the demo has a stable person to follow.
 */
export function seedPrj1042Matches(now: Date): MatchResult {
  const experts: MatchedExpert[] = [];
  const head: MatchedExpert = {
    id: 'exp_4821',
    label: 'Expert #4821',
    role: 'Thru-hiker, Pacific Crest Trail',
    years: 9,
    country: 'US',
    matchPercent: 94,
    lastEngagedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    excluded: false,
    whyPicked: [
      'Hiked 6 nights on the PCT in August, with route map',
      'Wears Shokz OpenRun for podcasts on long climbs',
      'Has strong views on hearing other hikers and wildlife',
    ],
    questionsCovered: 7,
    compliance: 'cleared',
    rateHint: '$150',
  };
  experts.push(head);

  for (let n = 1; n < 146; n += 1) {
    const num = 4000 + n;
    const id = `exp_${num}`;
    const matchPercent = Math.max(42, Math.round(93 - n * 0.35 - hash(id) * 3));
    const weeksAgo = Math.floor(hash(`${id}-w`) * 80);
    experts.push({
      id,
      label: `Expert #${num}`,
      role: pick(ROLES, id),
      years: 2 + Math.floor(hash(`${id}-y`) * 14),
      country: pick(COUNTRIES, id),
      matchPercent,
      lastEngagedAt:
        hash(`${id}-e`) > 0.22
          ? new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      pinned: false,
      excluded: false,
      whyPicked: whyFor(id),
      questionsCovered: 2 + Math.floor(hash(`${id}-q`) * 7),
      compliance: hash(`${id}-c`) > 0.15 ? 'cleared' : 'pending',
      rateHint: `$${100 + Math.floor(hash(`${id}-r`) * 8) * 10}`,
    });
  }

  experts.sort((a, b) => b.matchPercent - a.matchPercent || a.id.localeCompare(b.id));

  return {
    projectId: 'PRJ-1042',
    searchedAt: now.toISOString(),
    searchedCount: 18_240,
    durationMs: 2100,
    filters: [
      'Thru-hikers',
      'Trail runners',
      'United States',
      'Active in last 6 months',
      'Wears headphones',
      'Proof of activity',
    ],
    experts,
  };
}

/** Empty match set for projects that haven't been approved yet, or the 0-match demo. */
export function emptyMatches(projectId: string, now: Date): MatchResult {
  return {
    projectId,
    searchedAt: now.toISOString(),
    searchedCount: 18_240,
    durationMs: 1800,
    filters: ['Profile requirements'],
    experts: [],
  };
}
