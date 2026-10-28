import type { MatchedExpert, NetworkExpert, NetworkSector } from '@/features/admin';
import { buildCalls } from './calls';
import { seedMatches } from './experts';
import { seedProjects } from './seed';
import { storyFor } from './stories';

/**
 * The Xpert Network database (F20): everyone who signed up and was vetted. First the experts
 * who've taken calls with us, as those calls know them; then the people the AI is matching to
 * the headphones project; then members who haven't been matched to a live project yet (no
 * portrait on file). Each person appears once, with one career that fits their calls.
 */

/** The sector each project's experts come from. */
const SECTOR_BY_PROJECT: Record<string, NetworkSector> = {
  'PRJ-1039': 'industrial',
  'PRJ-1040': 'logistics',
  'PRJ-1041': 'food',
  'PRJ-1042': 'consumer',
  'PRJ-1043': 'aviation',
  'PRJ-1044': 'environment',
};

type Career = {
  country: string;
  employers: readonly string[];
  earlier: readonly string[];
  knownFor: readonly string[];
  rate: (seed: number) => string;
};

/** Careers for the sectors whose experts we only know from calls. */
const CALL_CAREERS: Partial<Record<NetworkSector, Career>> = {
  industrial: {
    country: 'DE',
    employers: ['Siemens', 'Bosch Rexroth', 'KUKA', 'Festo', 'Dürr', 'ZF Friedrichshafen'],
    earlier: ['Automation Engineer', 'Production Manager', 'Maintenance Lead', 'Project Engineer'],
    knownFor: [
      'Ran line retrofits across four German plants',
      'Knows how mid-size manufacturers buy automation',
      'Led works-council sign-off on two automation programmes',
      'Has priced dozens of single-line retrofits',
    ],
    rate: (n) => `€${250 + Math.round(n * 8) * 25}`,
  },
  food: {
    country: 'NL',
    employers: ['Nestlé', 'Sucafina', 'Volcafe', 'Olam Food Ingredients', 'Costa Coffee'],
    earlier: ['Green Coffee Trader', 'Quality Control Manager', 'Category Buyer', 'Supply Planner'],
    knownFor: [
      'Bought green coffee for roasters across the GCC',
      'Knows direct-trade pricing from origin to cup',
      'Set up specialty sourcing for a 200-store chain',
      'Can speak to coffee import rules in the UAE and Saudi Arabia',
    ],
    rate: (n) => `€${200 + Math.round(n * 6) * 25}`,
  },
  logistics: {
    country: 'GB',
    employers: ['Agility', 'DP World', 'Americold', 'Lineage Logistics', 'Maersk'],
    earlier: ['Warehouse Manager', 'Transport Planner', 'Operations Analyst', 'Fleet Manager'],
    knownFor: [
      'Ran temperature-controlled storage in Dubai and Abu Dhabi',
      'Knows who rents cold-chain capacity, and at what price',
      'Opened two pharma-grade cold stores',
      'Can speak to utilisation across GCC cold storage',
    ],
    rate: (n) => `£${250 + Math.round(n * 6) * 25}`,
  },
};

/** Members not on a current project, and the sector they'd be matched in. */
const MEMBERS: readonly [string, NetworkSector][] = [
  ['Aaron Feldman', 'consumer'],
  ['Bianca Moretti', 'consumer'],
  ['Caleb Thornton', 'consumer'],
  ['Dana Whitfield', 'consumer'],
  ['Eli Navarro', 'consumer'],
  ['Farah Qureshi', 'consumer'],
  ['Alistair Grant', 'aviation'],
  ['Bethan Lloyd', 'aviation'],
  ['Callum Reid', 'aviation'],
  ['Deirdre Walsh', 'aviation'],
  ['Euan McKenzie', 'aviation'],
  ['Fiona Gallagher', 'aviation'],
  ['Gareth Hughes', 'aviation'],
  ['Harriet Shaw', 'aviation'],
  ['Imran Akhtar', 'aviation'],
  ['Joost de Wit', 'aviation'],
  ['Katie Byrne', 'aviation'],
  ['Liam Doherty', 'aviation'],
  ['Anouk Peeters', 'environment'],
  ['Bram Janssens', 'environment'],
  ['Clara Vogel', 'environment'],
  ['Dirk Hoffmann', 'environment'],
  ['Eva Smits', 'environment'],
  ['Floris Bakker', 'environment'],
  ['Greta Maes', 'environment'],
  ['Hendrik Weber', 'environment'],
  ['Ilse van Dam', 'environment'],
  ['Jonas Keller', 'environment'],
  ['Katrien Claes', 'environment'],
  ['Lukas Brandt', 'environment'],
  ['Mila Schreiber', 'industrial'],
  ['Niklas Vogt', 'industrial'],
  ['Omar Haddad', 'food'],
  ['Pieter de Graaf', 'food'],
  ['Rania Saleh', 'logistics'],
  ['Simon Clarke', 'logistics'],
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 2 ** 32;
}

function pick<T>(list: readonly T[], seed: string): T {
  const item = list[Math.floor(hash(seed) * list.length)];
  if (item === undefined) throw new Error('pick() needs a non-empty list');
  return item;
}

const yearsAgo = (now: Date, years: number) =>
  new Date(now.getTime() - years * 365 * 24 * 3_600_000).toISOString();

export function buildNetwork(now: Date): NetworkExpert[] {
  const projects = seedProjects(now);
  const byName = new Map<string, NetworkExpert>();

  // Experts who've taken calls: who they are comes from their first call.
  const calls = [...buildCalls(now, {})].sort((x, y) => x.startsAt.localeCompare(y.startsAt));
  for (const call of calls) {
    const name = call.expert.name;
    const entry = byName.get(name) ?? fromCall(call, now);
    entry.calls.push({
      id: call.id,
      status: call.status,
      projectName: call.projectName,
      client: call.client.detail,
      startsAt: call.startsAt,
      minutes: Math.round(
        (new Date(call.endsAt).getTime() - new Date(call.startsAt).getTime()) / 60_000,
      ),
    });
    if (!entry.projects.some((p) => p.id === call.projectId)) {
      entry.projects.push({
        id: call.projectId,
        name: call.projectName,
        client: call.client.detail,
        matchPercent: null,
      });
    }
    // A completed call is the last time they worked with us.
    if (call.status === 'completed' && (entry.lastEngagedAt ?? '') < call.startsAt) {
      entry.lastEngagedAt = call.startsAt;
    }
    byName.set(name, entry);
  }
  for (const entry of byName.values()) {
    entry.calls.sort((x, y) => y.startsAt.localeCompare(x.startsAt));
  }

  // The rest of the people the AI is matching to the headphones project.
  const story = storyFor('PRJ-1042');
  const project = projects['PRJ-1042'];
  if (story && project) {
    for (const expert of seedMatches(story, now).experts) {
      if (!expert.name || byName.has(expert.name)) continue;
      const entry = fromMatch(expert, 'consumer', now);
      entry.projects.push({
        id: project.id,
        name: project.name,
        client: project.client.name,
        matchPercent: expert.matchPercent,
      });
      byName.set(expert.name, entry);
    }
  }

  // Members not on a current project.
  const members = MEMBERS.map(([name, sector], i) => member(name, sector, 7101 + i, now));
  return [...byName.values(), ...members];
}

type BuiltCall = ReturnType<typeof buildCalls>[number];

/** Someone we know from their calls: their role on the call, a career in that sector. */
function fromCall(call: BuiltCall, now: Date): NetworkExpert {
  const sector = SECTOR_BY_PROJECT[call.projectId] ?? 'industrial';
  const name = call.expert.name;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  // Their own id in the database, apart from the per-project match numbers.
  const id = `exp_${slug}`;
  const career = careerFor(sector);
  const years = 12 + Math.floor(hash(`${name}-y`) * 14);
  return {
    id,
    name,
    // Their portrait, not the call's camera still: this is their record in the database.
    photoUrl: `/images/avatars/expert-headshots/${slug}.jpg`,
    headline: call.expert.detail,
    sector,
    country: career.country,
    years,
    rateHint: career.rate(hash(`${name}-r`)),
    compliance: 'cleared',
    linkedinUrl: `https://www.linkedin.com/in/${slug}`,
    joinedAt: yearsAgo(now, 1 + hash(`${name}-joined`) * 5),
    lastEngagedAt: null,
    knownFor: [pick(career.knownFor, `${name}-k1`), pick(career.knownFor, `${name}-k2`)].filter(
      (line, i, all) => all.indexOf(line) === i,
    ),
    history: careerHistory(id, call.expert.detail, years, career, now),
    projects: [],
    calls: [],
  };
}

/** A sector's career: from the calls table, or the project story for that sector. */
function careerFor(sector: NetworkSector): Career {
  const own = CALL_CAREERS[sector];
  if (own) return own;
  const projectId =
    Object.keys(SECTOR_BY_PROJECT).find((id) => SECTOR_BY_PROJECT[id] === sector && storyFor(id)) ??
    'PRJ-1042';
  const story = storyFor(projectId);
  if (!story) throw new Error(`No story for ${projectId}`);
  return {
    country: story.countries[0] ?? 'GB',
    employers: story.career.employers,
    earlier: story.career.earlier,
    knownFor: story.why,
    rate: story.rate,
  };
}

/** Three roles, newest first, that add up to their years. */
function careerHistory(
  id: string,
  role: string,
  years: number,
  career: Career,
  now: Date,
): NetworkExpert['history'] {
  const thisYear = now.getUTCFullYear();
  const isPast = /^(Former|Ex-|Retired)/i.test(role);
  const title = role.replace(/^(Former|Ex-|Retired)\s*/i, '').trim();
  const end1 = isPast ? thisYear - 1 - Math.floor(hash(`${id}-l`) * 3) : null;
  const start1 = (end1 ?? thisYear) - 4 - Math.floor(hash(`${id}-s`) * 4);
  const start2 = start1 - 3 - Math.floor(hash(`${id}-s2`) * 4);
  const start3 = Math.min(start2 - 2, thisYear - years);
  const a = pick(career.employers, `${id}-e1`);
  const b = pick(
    career.employers.filter((e) => e !== a),
    `${id}-e2`,
  );
  const c = pick(
    career.employers.filter((e) => e !== b),
    `${id}-e3`,
  );
  const t1 = pick(career.earlier, `${id}-t1`);
  const t2 = pick(
    career.earlier.filter((t) => t !== t1),
    `${id}-t2`,
  );
  return [
    { title, org: a, startYear: start1, endYear: end1, location: career.country },
    {
      title: t1,
      org: b,
      startYear: start2,
      endYear: start1,
      location: career.country,
    },
    {
      title: t2,
      org: c,
      startYear: start3,
      endYear: start2,
      location: career.country,
    },
  ];
}

function fromMatch(expert: MatchedExpert, sector: NetworkSector, now: Date): NetworkExpert {
  const name = expert.name ?? expert.label;
  return {
    id: expert.id,
    name,
    photoUrl: expert.photoUrl ?? null,
    headline: expert.role,
    sector,
    country: expert.country,
    years: expert.years,
    rateHint: expert.rateHint,
    compliance: expert.compliance,
    linkedinUrl: expert.linkedinUrl ?? null,
    joinedAt: yearsAgo(now, 1 + hash(`${name}-joined`) * 5),
    lastEngagedAt: expert.lastEngagedAt,
    knownFor: expert.whyPicked,
    history: expert.history ?? [],
    projects: [],
    calls: [],
  };
}

/** A member with no live project: a career in their sector, no portrait on file. */
function member(name: string, sector: NetworkSector, num: number, now: Date): NetworkExpert {
  const id = `exp_${num}`;
  const career = careerFor(sector);
  const story =
    sector === 'aviation' || sector === 'environment' || sector === 'consumer'
      ? storyFor(Object.keys(SECTOR_BY_PROJECT).find((p) => SECTOR_BY_PROJECT[p] === sector) ?? '')
      : null;
  const role = story
    ? pick(story.roles, `${id}-role`)
    : `Former ${pick(career.earlier, `${id}-role`)}`;
  const years = story
    ? story.years.min + Math.floor(hash(`${id}-y`) * story.years.span)
    : 10 + Math.floor(hash(`${id}-y`) * 15);
  const country = story ? pick(story.countries, `${id}-c`) : career.country;
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '-');
  const engaged = hash(`${id}-eng`);
  return {
    id,
    name,
    photoUrl: null,
    headline: role,
    sector,
    country,
    years,
    rateHint: career.rate(hash(`${id}-r`)),
    compliance: hash(`${id}-cmp`) > 0.25 ? 'cleared' : 'pending',
    linkedinUrl: hash(`${id}-li`) > 0.3 ? `https://www.linkedin.com/in/${slug}-${num}` : null,
    joinedAt: yearsAgo(now, 0.3 + hash(`${id}-j`) * 5),
    lastEngagedAt: engaged > 0.35 ? yearsAgo(now, engaged * 1.5) : null,
    knownFor: [pick(career.knownFor, `${id}-w1`), pick(career.knownFor, `${id}-w2`)].filter(
      (line, i, all) => all.indexOf(line) === i,
    ),
    history: careerHistory(id, role, years, { ...career, country }, now).slice(0, 2),
    projects: [],
    calls: [],
  };
}
