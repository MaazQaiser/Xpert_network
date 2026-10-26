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
    role: 'Former Director, CoWoS operations',
    years: 19,
    country: 'TW',
    matchPercent: 95,
    whyPicked: [
      'Ran CoWoS capacity planning at a Taiwanese foundry',
      'Sourced ABF substrates through the 2023 shortage',
      'Left the foundry 14 months ago',
    ],
    rateHint: '$620',
  },
  countries: ['TW', 'TW', 'MY', 'SG', 'JP', 'US'],
  roles: [
    'Former Director, CoWoS operations',
    'Ex-VP Supply Chain, OSAT',
    'Former Head of Substrate Procurement',
    'Ex-Plant Manager, packaging site',
    'Former Director, fan-out packaging',
    'Ex-Equipment Sourcing Lead, hybrid bonding',
    'Former GM, OSAT',
    'Ex-Capacity Planning Lead, foundry',
  ],
  why: [
    'Planned CoWoS-class capacity through 2026',
    'Negotiated ABF substrate contracts with 3 suppliers',
    'Ran a fan-out line for an OSAT',
    'Sourced hybrid bonding tools from Japan and Europe',
    'Knows how OSATs and foundries split the work',
    'Costed two new packaging lines',
    'Left their company less than 2 years ago',
    'Rated 4.8 on past Xpert Network calls',
  ],
  filters: ['Advanced packaging', 'Director+', 'Taiwan', 'Malaysia', '10+ yrs', 'Substrates'],
  years: { min: 10, span: 16 },
  rate: (seed) => `$${450 + Math.floor(seed * 10) * 25}`,
  topics: ['New capacity', 'Bottlenecks', 'Substrate lead times', 'OSAT vs foundry', 'Line cost'],
  answers: [
    [
      'CoWoS roughly doubles again by 2027, almost all in Taiwan. Malaysia adds fan-out and test, not CoWoS.',
      'The foundry leads on CoWoS; OSATs in Penang and Kulim are adding fan-out lines for overflow.',
    ],
    [
      'Substrates first, then hybrid bonding tools. Labour is tight in Malaysia but manageable.',
      'Interposers and ABF substrates. Equipment lead times have eased since last year.',
    ],
    [
      'ABF lead times are around 20–26 weeks for large-body substrates and will stay tight through 2026.',
      'Standard substrates are back to 12 weeks; the big AI packages still wait five to six months.',
    ],
    [
      'The foundry keeps CoWoS in-house and passes the back end to OSATs. That split is loosening.',
      'OSATs are winning more 2.5D work as customers push for a second source.',
    ],
    [
      'A new CoWoS-class line is US$1–1.5 billion and 18–24 months to volume.',
      'Fan-out lines are cheaper, a few hundred million, and can ramp in about a year.',
    ],
  ],
  summaries: {
    strong: 'Direct capacity and substrate experience with specific numbers through 2027.',
    good: 'Solid on bottlenecks and lead times; lighter on line costs.',
    weak: 'General semiconductor background with little advanced packaging detail.',
  },
  noteForB: 'ABF substrate pricing',
  briefing:
    'A consultancy is mapping advanced packaging capacity in Taiwan and Malaysia for a client weighing an investment: new capacity, bottlenecks, substrate lead times and line costs.',
  doNotShare: DO_NOT_SHARE,
  call: {
    open: {
      client: 'How much new CoWoS capacity do you expect by 2027, and where?',
      expert:
        'Roughly double today’s, and nearly all of it in Taiwan. Malaysia gets fan-out and test rather than CoWoS.',
      covers: 'New capacity',
    },
    middle: {
      expert:
        'The binding constraint is still substrates. Equipment has eased a lot since last year.',
      covers: 'Bottlenecks',
    },
    ask: 'What lead times are you seeing on ABF substrates now?',
    answer: {
      expert:
        'For the large AI packages, five to six months. Standard substrates are back to about twelve weeks.',
      covers: 'Substrate lead times',
    },
    drop: {
      topic: 'Line cost',
      line: 'Actually, let’s drop the question on line cost — our client already has those numbers.',
      quote: 'Drop the question on line cost.',
    },
    next: {
      expert:
        'Sure. On the split, the foundry keeps CoWoS but OSATs are winning more 2.5D work as a second source.',
      covers: 'OSAT vs foundry',
    },
    request: {
      line: 'Could we also get someone who has run an OSAT site in Malaysia?',
      quote: 'Someone who has run an OSAT site in Malaysia.',
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
