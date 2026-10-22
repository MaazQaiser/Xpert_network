import type { MatchedExpert, MatchResult } from '@/features/admin';

const COUNTRIES = ['DE', 'PL', 'SE', 'BE', 'FI', 'NL', 'FR', 'AT', 'DK', 'IE'] as const;
const ROLES = [
  'Former VP Operations, EU battery recycler',
  'Ex-Director, hydrometallurgy plant',
  'Former Head of Black Mass Sourcing',
  'Ex-CTO, lithium-ion recycling',
  'Former Plant Manager, Nordic recycler',
  'Ex-VP Strategy, battery materials',
  'Former Regulatory Lead, EU Battery Regulation',
  'Ex-Director Supply Chain, OEM recycling',
  'Former GM, pyrometallurgy operations',
  'Ex-Head of Commercial, recycling services',
] as const;

const WHY = [
  'Ran 2 hydrometallurgy plants in Germany',
  'Led black mass procurement across DE and PL',
  'Briefed investors on EU Battery Regulation targets',
  'Negotiated OEM take-or-pay recycling contracts',
  'Scaled a plant from pilot to 8 kt/year',
  'Left target company 2 years ago — clear of conflicts',
  'Strong on feedstock economics and Asian entrants',
  'Rated 4.8 on past Xpert Network calls',
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
 * Builds the 146 matches for PRJ-1042. Expert #4821 is always first so the
 * expert-app side of the demo has a stable person to follow.
 */
export function seedPrj1042Matches(now: Date): MatchResult {
  const experts: MatchedExpert[] = [];
  const head: MatchedExpert = {
    id: 'exp_4821',
    label: 'Expert #4821',
    role: 'Former VP Operations, EU battery recycler',
    years: 18,
    country: 'DE',
    matchPercent: 94,
    lastEngagedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    excluded: false,
    whyPicked: [
      'Ran 2 hydrometallurgy plants in Germany',
      'Led black mass procurement across DE and PL',
      'Left a peer recycler 18 months ago — clear of the target',
    ],
    questionsCovered: 7,
    compliance: 'cleared',
    rateHint: '€450',
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
      years: 8 + Math.floor(hash(`${id}-y`) * 20),
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
      rateHint: `€${300 + Math.floor(hash(`${id}-r`) * 250)}`,
    });
  }

  experts.sort((a, b) => b.matchPercent - a.matchPercent || a.id.localeCompare(b.id));

  return {
    projectId: 'PRJ-1042',
    searchedAt: now.toISOString(),
    searchedCount: 18_240,
    durationMs: 2100,
    filters: [
      'Battery recycling',
      'Director+',
      'EU',
      '10+ yrs',
      'Hydrometallurgy',
      'Not at target',
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
