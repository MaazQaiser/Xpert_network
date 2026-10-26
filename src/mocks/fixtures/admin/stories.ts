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
      line: 'Actually, let’s drop the question on current headphones — we have that from the screener.',
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
    role: 'Former Head of Quality, UK Part 145 MRO',
    years: 22,
    country: 'GB',
    matchPercent: 95,
    whyPicked: [
      'Took a 250-person MRO through its own Part 145 approval',
      'Ran the first CAA audit after an airline carve-out',
      'Left the industry’s largest UK MRO 2 years ago',
    ],
    rateHint: '£480',
  },
  countries: ['GB', 'GB', 'GB', 'IE', 'NL'],
  roles: [
    'Former Head of Quality, Part 145 MRO',
    'Ex-Compliance Manager, airline engineering',
    'Former Accountable Manager, line maintenance',
    'Ex-Airworthiness Surveyor, aviation authority',
    'Former Quality Director, engine shop',
    'Ex-Head of Continuing Airworthiness',
    'Former Separation Lead, MRO carve-out',
    'Ex-Maintenance Systems Lead, MRO',
  ],
  why: [
    'Wrote the exposition for a new Part 145 approval',
    'Led quality through an airline MRO carve-out',
    'Former CAA surveyor for maintenance organisations',
    'Set up AMOS records for a stand-alone MRO',
    'Knows how lessors react to a new approval holder',
    'Ran a 30-person quality department',
    'Clear of the target and its parent',
    'Rated 4.7 on past Xpert Network calls',
  ],
  filters: [
    'Aircraft maintenance',
    'Part 145',
    'United Kingdom',
    'Quality & compliance',
    '10+ yrs',
    'Not at target',
  ],
  years: { min: 10, span: 18 },
  rate: (seed) => `£${300 + Math.floor(seed * 12) * 25}`,
  topics: [
    'Own approval',
    'Shared functions',
    'Customer reaction',
    'First audit',
    'Quality staffing',
    'IT systems',
  ],
  answers: [
    [
      'Plan on 9–12 months. The exposition, nominated persons and a clean CAA audit are the critical path.',
      'The CAA wants your own accountable manager and quality system in place before they’ll grant it. Six months is the best I’ve seen.',
    ],
    [
      'Quality audit, training records and tool calibration are almost always run by the parent.',
      'Continuing airworthiness and the stores system are the hardest; they’re woven into the airline.',
    ],
    [
      'Lessors want proof nothing changes on records. Expect every major customer to audit you in year one.',
      'Customers are calm if the same people sign the release certificates. Losing key staff is what scares them.',
    ],
    [
      'Training records and tool control. Nearly every first audit after separation finds gaps there.',
      'Findings cluster around procedures still referencing the parent’s manuals.',
    ],
    [
      'For 300 people, plan 8–10 in quality: a head, auditors, a training lead and a records team.',
      'You need around 3% of headcount in quality, plus nominated deputies the CAA will accept.',
    ],
    [
      'Maintenance records are the big one. Migrating AMOS or TRAX data cleanly takes most of a year.',
      'Tooling and parts traceability systems are often shared licences, which takes time to untangle.',
    ],
  ],
  summaries: {
    strong: 'Hands-on Part 145 approval and carve-out experience, with specific audit lessons.',
    good: 'Solid on approvals and staffing; lighter on systems and customer reaction.',
    weak: 'General aviation quality background with little carve-out experience.',
  },
  noteForB: 'first-audit findings',
  briefing:
    'An adviser is testing whether a UK maintenance business can hold its own Part 145 approval after a carve-out: approvals, shared functions, audits, staffing and systems.',
  doNotShare: DO_NOT_SHARE,
  call: {
    open: {
      client: 'How long should we expect the CAA to take to grant a stand-alone approval?',
      expert:
        'Realistically nine to twelve months from a submitted exposition. Six if the nominated persons are already known to the CAA.',
      covers: 'Own approval',
    },
    middle: {
      expert:
        'The hardest thing to separate is usually continuing airworthiness. It sits inside the airline’s planning team.',
      covers: 'Shared functions',
    },
    ask: 'And what does the CAA usually find in that first audit?',
    answer: {
      expert:
        'Training records and tool control, nearly every time. And procedures that still point to the parent’s manuals.',
      covers: 'First audit',
    },
    drop: {
      topic: 'Customer reaction',
      line: 'Actually, let’s drop the question on customer reaction — we’re covering that with the lessors directly.',
      quote: 'Drop the question on customer reaction.',
    },
    next: {
      expert:
        'Fine. On staffing, for 300 people I’d plan eight to ten in quality, including a training lead.',
      covers: 'Quality staffing',
    },
    request: {
      line: 'Could we also speak to someone who has migrated maintenance records to a new system?',
      quote: 'Someone who has migrated maintenance records.',
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
      line: 'Let’s skip the margin deep-dive — we already have supplier benchmarks.',
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
