import type { MatchedExpert, MatchResult } from '@/features/admin';
import { expertPerson } from './expertPeople';
import type { ExpertStory } from './stories';

/** Deterministic 0–1 from a string so the same expert always ranks the same. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Final avalanche so neighbouring ids (exp_6001, exp_6002) land far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}

function pick<T>(list: readonly T[], seed: string): T {
  const item = list[Math.floor(hash(seed) * list.length)];
  if (item === undefined) throw new Error('pick() needs a non-empty list');
  return item;
}

function whyFor(why: readonly string[], id: string): string[] {
  const a = pick(why, `${id}-a`);
  const b = pick(why, `${id}-b`);
  return a === b ? [a, pick(why, `${id}-c`)] : [a, b];
}

/**
 * A LinkedIn-style work history that adds up to their years: the role they're known for (left a
 * year or three ago), then two earlier jobs. Former and Ex- roles have ended; the rest are current.
 */
function historyFor(
  id: string,
  role: string,
  years: number,
  location: string,
  career: ExpertStory['career'],
  now: Date,
): NonNullable<MatchedExpert['history']> {
  const thisYear = now.getUTCFullYear();
  const [main = role, detail] = role.split(', ');
  const isPast = /^(Former|Ex-|Retired)/i.test(main);
  const title = main.replace(/^(Former|Ex-|Retired)\s*/i, '').trim();
  const left = isPast ? 1 + Math.floor(hash(`${id}-left`) * 3) : 0;
  const lastSpan = 3 + Math.floor(hash(`${id}-s1`) * 4);
  const midSpan = 2 + Math.floor(hash(`${id}-s2`) * 4);
  const end1 = isPast ? thisYear - left : null;
  const start1 = (end1 ?? thisYear) - lastSpan;
  const start2 = start1 - midSpan;
  const start3 = Math.min(start2 - 1, thisYear - left - years);
  const [a, b, c] = [0, 1, 2].map((n) => pick(career.employers, `${id}-emp${n}`));
  return [
    {
      title: detail ? `${title}, ${detail}` : title,
      org: a ?? '',
      startYear: start1,
      endYear: end1,
      location,
    },
    {
      title: pick(career.earlier, `${id}-t1`),
      org: b === a ? pick(career.employers, `${id}-emp9`) : (b ?? ''),
      startYear: start2,
      endYear: start1,
      location,
    },
    {
      title: pick(career.earlier, `${id}-t2`),
      org: c ?? '',
      startYear: start3,
      endYear: start2,
      location,
    },
  ];
}

/** Name, portrait and LinkedIn for the PM; most experts in the network have a profile. */
function identity(id: string, num: number) {
  const person = expertPerson(id);
  const slug = person.name.toLowerCase().replace(/\s+/g, '-');
  return {
    ...person,
    linkedinUrl: hash(`${id}-li`) > 0.25 ? `https://www.linkedin.com/in/${slug}-${num}` : null,
    source: 'network' as const,
  };
}

/**
 * Builds a project's matches from its story. The story's head expert is always first so the
 * demo has a stable person to follow (Expert #4821 for PRJ-1042, which the expert app uses too).
 */
export function seedMatches(story: ExpertStory, now: Date): MatchResult {
  const experts: MatchedExpert[] = [];
  const { head } = story;
  experts.push({
    id: `exp_${head.num}`,
    label: `Expert #${head.num}`,
    role: head.role,
    years: head.years,
    country: head.country,
    matchPercent: head.matchPercent,
    lastEngagedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    excluded: false,
    whyPicked: head.whyPicked,
    questionsCovered: Math.max(1, story.topics.length - 1),
    compliance: 'cleared',
    rateHint: head.rateHint,
    history: historyFor(`exp_${head.num}`, head.role, head.years, head.country, story.career, now),
    ...identity(`exp_${head.num}`, head.num),
  });

  for (let n = 1; n < story.matchCount; n += 1) {
    const num = story.idBase + n;
    const id = `exp_${num}`;
    const matchPercent = Math.max(42, Math.round(93 - n * 0.35 - hash(id) * 3));
    const weeksAgo = Math.floor(hash(`${id}-w`) * 80);
    experts.push({
      id,
      label: `Expert #${num}`,
      role: pick(story.roles, id),
      years: story.years.min + Math.floor(hash(`${id}-y`) * story.years.span),
      country: pick(story.countries, id),
      matchPercent,
      lastEngagedAt:
        hash(`${id}-e`) > 0.22
          ? new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      pinned: false,
      excluded: false,
      whyPicked: whyFor(story.why, id),
      questionsCovered: Math.min(story.topics.length, 2 + Math.floor(hash(`${id}-q`) * 7)),
      compliance: hash(`${id}-c`) > 0.15 ? 'cleared' : 'pending',
      rateHint: story.rate(hash(`${id}-r`)),
      history: historyFor(
        id,
        pick(story.roles, id),
        story.years.min + Math.floor(hash(`${id}-y`) * story.years.span),
        pick(story.countries, id),
        story.career,
        now,
      ),
      ...identity(id, num),
    });
  }

  experts.sort((a, b) => b.matchPercent - a.matchPercent || a.id.localeCompare(b.id));

  return {
    projectId: story.projectId,
    searchedAt: now.toISOString(),
    searchedCount: 18_240,
    durationMs: 2100,
    filters: story.filters,
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
