import type { AnswerQuality } from '@/features/admin';
import { PRJ_1042_TOPICS } from './prj1042';

/** What the live call says, line by line (screen 14). Topics name a question in `topics`. */
export type CallScript = {
  /** The client's first question and the expert's answer. */
  open: { client: string; expert: string; covers: string };
  /** The expert carries on after the moderator. */
  middle: { expert: string; covers: string };
  /** The client asks something else, and the expert answers. */
  ask: string;
  answer: { expert: string; covers: string };
  /** The client drops one question. */
  drop: { topic: string; line: string; quote: string };
  /** The expert answers the next question. */
  next: { expert: string; covers: string };
  /** The client asks for another kind of expert. */
  request: { line: string; quote: string };
  /** Questions answered before the transcript starts. */
  coveredBefore: string[];
};

/**
 * Everything a project needs after its brief is approved: who matches, how they answer the
 * screening questions, what the client asks for and what is said on the call. Realistic
 * content for usability tests (CLAUDE.md rule 11).
 */
export type ExpertStory = {
  projectId: string;
  /** Expert numbers start here, so each project's experts are different people. */
  idBase: number;
  matchCount: number;
  /** The expert who always ranks first, so the demo has a stable person to follow. */
  head: {
    num: number;
    role: string;
    years: number;
    country: string;
    matchPercent: number;
    whyPicked: string[];
    rateHint: string;
  };
  countries: readonly string[];
  roles: readonly string[];
  /** Where these experts worked and what they did earlier, for their LinkedIn-style history. */
  career: { employers: readonly string[]; earlier: readonly string[] };
  why: readonly string[];
  filters: string[];
  /** Fewest years of experience, and the spread above it. */
  years: { min: number; span: number };
  /** A placeholder rate for a 0–1 seed. */
  rate: (seed: number) => string;
  /** Short names for the questions, in order. */
  topics: readonly string[];
  /** Two voices per question so experts don't read identically. */
  answers: string[][];
  summaries: Record<AnswerQuality, string>;
  /** What the client asks Expert B to cover when they pick them. */
  noteForB: string | null;
  briefing: string;
  doNotShare: string;
  call: CallScript;
};

const DO_NOT_SHARE =
  'Confidential information from current or former employers, or anything under NDA.';

const PRJ_1042: ExpertStory = {
  projectId: 'PRJ-1042',
  idBase: 4000,
  matchCount: 146,
  head: {
    num: 4821,
    role: 'Thru-hiker, Pacific Crest Trail',
    years: 9,
    country: 'US',
    matchPercent: 94,
    whyPicked: [
      'Hiked 6 nights on the PCT in August, with route map',
      'Wears Shokz OpenRun for podcasts on long climbs',
      'Has strong views on hearing other hikers and wildlife',
    ],
    rateHint: '$150',
  },
  // The brief asks for US participants only.
  countries: ['US'],
  roles: [
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
  ],
  career: {
    employers: [
      'REI Co-op',
      'Patagonia',
      'Garmin',
      'Pacific Crest Trail Association',
      'Salomon',
      'Backcountry.com',
    ],
    earlier: [
      'Outdoor guide',
      'Gear tester',
      'Retail associate, outdoor gear',
      'Trail crew volunteer',
    ],
  },
  why: [
    'Wears Shokz OpenRun on every long run',
    'Finished a 5-night section hike in September',
    'Shared a GPS route map and race certificate',
    'Runs 40 km+ on trails most weekends',
    'Switched from earbuds to bone conduction last year',
    'Hikes solo and wants to hear wildlife and weather',
    'Was asked to remove earbuds on a shared trail',
    'Rated 4.8 on past Xpert Network interviews',
  ],
  filters: [
    'Thru-hikers',
    'Trail runners',
    'United States',
    'Active in last 6 months',
    'Wears headphones',
    'Proof of activity',
  ],
  years: { min: 2, span: 14 },
  rate: (seed) => `$${100 + Math.floor(seed * 8) * 10}`,
  topics: PRJ_1042_TOPICS,
  answers: [
    [
      'Three overnight hikes since May, the longest on the PCT in August. I’ve attached my Gaia GPS route map.',
      'Eleven trail runs since spring, plus a 50K in September. Race certificate and Strava map attached.',
    ],
    [
      'Six days and five nights on the PCT through Oregon, mostly forest trail with some lava rock.',
      'A 52 km mountain race with about 2,400 m of climbing. Almost all my running is single-track.',
    ],
    [
      'Shokz OpenRun Pro. I switched from AirPods after losing one on a descent.',
      'Powerbeats Pro, so not Shokz. They stay in, but I take one out near other people.',
    ],
    [
      'Podcasts on long climbs and music for the last hours of the day. Never at camp or near water crossings.',
      'Music for tempo efforts, audiobooks on long easy runs. Usually three to five hours at a time.',
    ],
    [
      'Battery is the big one: three days with no outlet means I ration listening. Sweat makes the band slip too.',
      'Fit under a cap and sunglasses. Sound gets thin in wind, and the buds get gross with sweat.',
    ],
    [
      'A horse rider once had to shout twice before I heard her. Since then I keep the volume really low.',
      'Other runners think I can’t hear them, so I get the “on your left” yelled at me. The arms also clash with my visor.',
    ],
    [
      'Hiking solo I need to hear rockfall, rattlesnakes and the weather turning. Open-ear is non-negotiable.',
      'On shared trails I need to hear bikes coming. Today I just run with one bud in.',
    ],
    [
      'I’d try an ear-clip if it stays put on rough ground. Battery life and weight matter most, then sound.',
      'Ear-clips look comfortable with a cap. I’d rank fit and stability first, then sweat resistance and simple buttons.',
    ],
  ],
  summaries: {
    strong:
      'Clear proof of activity and detailed stories on pain points, awareness and the ear-clip.',
    good: 'Qualifies on activity and headphones; lighter on conflicts and feature priorities.',
    weak: 'Short, general answers and no proof of recent activity yet.',
  },
  noteForB: 'their night-hiking setup',
  briefing:
    'A consumer research firm is studying how US thru-hikers and trail runners use headphones: use cases, pain points, staying aware of their surroundings and an ear-clip design.',
  doNotShare: 'Details of unreleased products you have tested for a brand, or anything under NDA.',
  call: {
    open: {
      client: 'So on battery: how do you manage listening over a multi-day hike?',
      expert:
        'I ration it. My Shokz last about ten hours, so on a five-night trip I only listen on the long climbs, and I carry a small power bank.',
      covers: 'Pain points',
    },
    middle: {
      expert:
        'Mostly podcasts in the afternoon, when the miles get slow. Never at camp, and never near river crossings.',
      covers: 'Use cases',
    },
    ask: 'Have headphones ever caused trouble with other people on the trail?',
    answer: {
      expert:
        'Once, with a horse rider who had to call out twice before I heard her. Now I keep the volume low enough to hear voices.',
      covers: 'Wearing conflicts',
    },
    drop: {
      topic: 'Current headphones',
      line: 'Actually, let’s drop the question on current headphones. We have that from the screener.',
      quote: 'Drop the question on current headphones.',
    },
    next: {
      expert:
        'Sure. Hiking solo, hearing what’s around me matters most: rockfall, the weather turning, a rattlesnake on the path.',
      covers: 'Hearing surroundings',
    },
    request: {
      line: 'Could we also talk to a hiker who doesn’t use Shokz, for contrast?',
      quote: 'A hiker who doesn’t use Shokz.',
    },
    coveredBefore: ['Activity record', 'Longest outing'],
  },
};

const PRJ_1043: ExpertStory = {
  projectId: 'PRJ-1043',
  idBase: 5000,
  matchCount: 64,
  head: {
    num: 5310,
    role: 'Former IT Director, Partner Integration (EDI & eProcurement)',
    years: 16,
    country: 'US',
    matchPercent: 96,
    whyPicked: [
      'Ran Medline’s Partner Integration team for health system EDI and eProcurement',
      'Led 40+ customer go-lives on Epic, Lawson and Workday',
      'Left Medline 8 months ago',
    ],
    rateHint: '$450',
  },
  countries: ['US'],
  roles: [
    'Former IT Manager, Partner Integration',
    'Ex-eCommerce Project Manager, eProcurement & EDI',
    'Former Technical Product Manager, Enterprise Integration Services',
    'Ex-Director, Digital Supply Chain Solutions',
    'Former eProcurement Operations Manager, U.S. Medical',
    'Ex-EDI Operations Lead, health system accounts',
    'Former Customer Onboarding Manager, electronic connectivity',
    'Ex-API Product Manager, distribution platform',
  ],
  career: {
    employers: [
      'Medline Industries',
      'Henry Schein (Medical)',
      'Owens & Minor',
      'Cardinal Health',
      'McKesson Medical-Surgical',
      'GHX (Global Healthcare Exchange)',
    ],
    earlier: [
      'EDI Analyst',
      'Integration Engineer',
      'eCommerce Analyst',
      'Implementation Consultant',
    ],
  },
  why: [
    'Owned customer EDI go-lives for U.S. health systems',
    'Knows how integration fees were quoted, and when they were waived',
    'Built punch-out catalogs for a top-10 health system',
    'Managed GHX connections across a large account base',
    'Left the company within the last 12 months',
    'Worked in the medical business, not dental',
    'Product-managed a customer-facing ordering API',
    'Rated 4.8 on past Xpert Network calls',
  ],
  filters: [
    'Medical distribution',
    'Medline · Henry Schein · Owens & Minor',
    'EDI & eProcurement',
    'Customer integrations',
    'United States',
    'Left ≤ 12 months',
  ],
  years: { min: 8, span: 14 },
  rate: (seed) => `$${300 + Math.floor(seed * 12) * 25}`,
  topics: [
    'Team structure',
    'Implementation',
    'ERPs & channels',
    'Pricing',
    'API maturity',
    'Where it stalls',
  ],
  answers: [
    [
      'A central integration team owns it (Partner Integration at Medline). Sales scopes the work; we built the maps, tested and ran the go-live.',
      'At Owens & Minor it sits under Digital Supply Chain Solutions, with a separate onboarding group for new health systems.',
    ],
    [
      'Eight to fourteen weeks: map the 850, 855, 856 and 810, test with the hospital’s ERP, then run in parallel for two to four weeks.',
      'Kickoff, mapping, testing, then go-live. The hospital’s IT calendar sets the pace far more than ours did.',
    ],
    [
      'Epic, Lawson (Infor) and Workday cover most large systems, and nearly all of them route through GHX.',
      'GHX for most orders, punch-out for the catalog, and direct EDI only for the very largest accounts.',
    ],
    [
      'Standard EDI was never charged. Custom work got a quote, but it was usually waived to win the prime-vendor deal.',
      'We priced integration into the distribution fee rather than billing it. Only one-off custom builds were invoiced.',
    ],
    [
      'APIs existed for order status and pricing, but EDI still carried well over 90% of volume.',
      'Medline was furthest along; Owens & Minor had APIs mostly for its logistics services, less for ordering.',
    ],
    [
      'Item master and unit-of-measure mismatches. That’s where most go-lives slip by weeks.',
      'Hospital IT capacity. A project can sit for a month waiting on an Epic or Lawson change window.',
    ],
  ],
  summaries: {
    strong:
      'Owned customer EDI and eProcurement go-lives and can speak to how integrations were priced.',
    good: 'Solid on implementation and channels; lighter on pricing and APIs.',
    weak: 'Internal IT background with little customer-facing integration work.',
  },
  noteForB: 'how integrations were priced',
  briefing:
    'A research firm is studying how Medline, Henry Schein and Owens & Minor build, run and price ERP and EDI integrations with U.S. health systems, and how mature their APIs are.',
  doNotShare: DO_NOT_SHARE,
  call: {
    open: {
      client: 'How long does an EDI integration with a new health system usually take?',
      expert:
        'Eight to fourteen weeks from kickoff. Mapping the core transactions is quick; testing with the hospital’s ERP is what takes time.',
      covers: 'Implementation',
    },
    middle: {
      expert:
        'And to be clear on ownership: a central integration team ran all of it. Sales only scoped the work.',
      covers: 'Team structure',
    },
    ask: 'Were health systems ever charged for that work?',
    answer: {
      expert:
        'Standard EDI, never. Custom work got a quote, but it was usually waived to win the prime-vendor contract.',
      covers: 'Pricing',
    },
    drop: {
      topic: 'API maturity',
      line: 'Let’s leave API maturity for now. We’ll cover it in next month’s call.',
      quote: 'Leave API maturity for now.',
    },
    next: {
      expert:
        'On where it stalls: item master and unit-of-measure mismatches, every time. That’s where go-lives slip by weeks.',
      covers: 'Where it stalls',
    },
    request: {
      line: 'Could we also speak to someone from Owens & Minor’s Digital Supply Chain team?',
      quote: 'Someone from Owens & Minor’s Digital Supply Chain team.',
    },
    coveredBefore: [],
  },
};

const PRJ_1044: ExpertStory = {
  projectId: 'PRJ-1044',
  idBase: 6000,
  matchCount: 38,
  head: {
    num: 6207,
    role: 'Former Project Director, in situ remediation (NL)',
    years: 19,
    country: 'NL',
    matchPercent: 95,
    whyPicked: [
      'Delivered €2–8m in situ and on-site jobs across NL and Flanders',
      'Priced risk-based and liability-takeover contracts above €250k',
      'Advised on Omgevingswet and evolving PFAS limits',
    ],
    rateHint: '€520',
  },
  countries: ['NL', 'BE', 'DE', 'NL', 'BE', 'DE'],
  roles: [
    'Former Project Director, in situ remediation',
    'Ex-Commercial Manager, remediation contractor',
    'Former Principal, environmental consultancy',
    'Ex-Site Owner, brownfield redevelopment',
    'Former Head of Contaminated Land, public authority',
    'Ex-Technical Lead, PFAS soil treatment',
    'Former Operations Manager, pump & treat',
    'Ex-Procurement Lead, industrial site remediation',
  ],
  career: {
    employers: ['Arcadis', 'Tauw', 'Witteveen+Bos', 'Royal HaskoningDHV', 'Sweco', 'Antea Group'],
    earlier: [
      'Remediation Engineer',
      'Environmental Consultant',
      'Site Manager, soil works',
      'Project Engineer',
    ],
  },
  why: [
    'Ran biological and chemical in situ programmes in Flanders',
    'Negotiated risk-based contracts with liability takeover',
    'Sized national spend for PFAS soil treatment',
    'Knows BBodSchG permitting and enforcement practice',
    'Specified thermal desorption for high-concentration sites',
    'Bought remediation as a brownfield developer',
    'Clear of GreenSoil, WATR and Sensatec',
    'Rated 4.8 on past Xpert Network calls',
  ],
  filters: [
    'Soil & groundwater',
    'In situ / on-site',
    'BE / NL / DE',
    'PFAS',
    'Project manager+',
    'Not on do-not-contact',
  ],
  years: { min: 8, span: 16 },
  rate: (seed) => `€${400 + Math.floor(seed * 10) * 20}`,
  topics: [
    'Market sizing',
    'Growth & regulation',
    'Contracts & pricing',
    'Cost & margins',
    'Competition & buying',
  ],
  answers: [
    [
      'For the Netherlands alone I would put 2022 in situ/on-site spend near €350–450m, with PFAS soil still a small but fast slice.',
      'Belgium and Germany are larger by volume; industrial owners still dominate over brownfield developers.',
    ],
    [
      'Growth to 2031 hinges on PFAS limits and the EU Soil Monitoring Directive more than classic VOC work.',
      'Omgevingswet and Flemish Soil Decree tighten triggers on land deals; voluntary remediation stays soft.',
    ],
    [
      'Above €250k you still see unit-rate schedules, but risk-based and liability-takeover deals are common on brownfield.',
      'Warranties of 5–10 years on residual risk are negotiated hard; public buyers prefer framework agreements.',
    ],
    [
      'Margins sit mid-teens on biological/chemical in situ; thermal and complex PFAS jobs run thinner after contingencies.',
      'Cost drivers are characterisation uncertainty, waste disposal and energy for thermal/pump & treat.',
    ],
    [
      'Large multi-disciplinary contractors hold share on frameworks; in situ specialists win on technique fit.',
      'Buyers rank technical approach, residual-risk terms and past PFAS delivery ahead of headline price.',
    ],
  ],
  summaries: {
    strong: 'Direct BE/NL/DE delivery with pricing and regulatory detail.',
    good: 'Solid on techniques and contracts; lighter on country-level sizing.',
    weak: 'General environmental background with little remediation commercial depth.',
  },
  noteForB: 'PFAS contract clauses',
  briefing:
    'Sintel is assessing the soil and groundwater remediation market in Belgium, the Netherlands and Germany: sizing, growth under new regulation, contracts and competition across in situ and on-site techniques including PFAS.',
  doNotShare: DO_NOT_SHARE,
  call: {
    open: {
      client: 'How would you size the 2022 in situ and on-site market in your country?',
      expert:
        'In the Netherlands I would put it around €350–450m. PFAS soil treatment is still small but growing fast.',
      covers: 'Market sizing',
    },
    middle: {
      expert:
        'The real swing factor to 2031 is PFAS limits plus the Soil Monitoring Directive, not classic VOC volumes.',
      covers: 'Growth & regulation',
    },
    ask: 'How are contracts typically priced above €250k?',
    answer: {
      expert:
        'Unit rates are still common, but risk-based and liability-takeover models show up on brownfield deals with long warranties.',
      covers: 'Contracts & pricing',
    },
    drop: {
      topic: 'Cost & margins',
      line: 'Let’s skip the margin deep-dive. We already have supplier benchmarks.',
      quote: 'Skip the margin deep-dive.',
    },
    next: {
      expert:
        'On buying criteria, technical approach and residual-risk terms usually beat the lowest price, especially on PFAS.',
      covers: 'Competition & buying',
    },
    request: {
      line: 'Could we also speak with someone who buys remediation for a public authority in Flanders?',
      quote: 'Someone who buys remediation for a public authority in Flanders.',
    },
    coveredBefore: [],
  },
};

const STORIES: Record<string, ExpertStory> = {
  'PRJ-1042': PRJ_1042,
  'PRJ-1043': PRJ_1043,
  'PRJ-1044': PRJ_1044,
};

/** The project's story, or null for projects that only need to list and open. */
export function storyFor(projectId: string): ExpertStory | null {
  return STORIES[projectId] ?? null;
}
