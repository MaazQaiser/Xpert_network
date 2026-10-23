import type { ClientQuestion, KeyFact, Requirement, SourcePage } from '@/features/admin';

/** PRJ-1042: Jenna Cho's sports headphones brief, North America (wireframes 02–03). */

export const PRJ_1042_BRIEFS = {
  standard: [
    'Ridgeline is researching sports headphones in the North American market and asks us to check feasibility and quote. They need 4 AI-assisted in-depth interviews (50–60 min) in the United States: 2 thru-hikers who carry overnight gear and 2 trail runners, all of whom wear headphones on the trail. Aim for about half Shokz bone-conduction users and both men and women. The interviews cover use cases, pain points, wearing conflicts, the need to hear surroundings and how people feel about an ear-clip design.',
    'Ridgeline Consumer Insights wants to understand how outdoor athletes in the US use headphones, and is asking Xpert Network whether 4 AI-assisted interviews (50–60 min) are feasible and what they would cost. Participants are 2 thru-hikers and 2 trail runners with recent, provable activity and headphone use; about 50% should use Shokz bone-conduction headphones, with a mix of men and women. Topics: use cases, pain points, wearing conflicts, environmental awareness, and acceptance and feature priorities for an ear-clip form factor.',
  ],
  shorter: [
    'Ridgeline needs a feasibility check and quote for 4 AI-assisted interviews (50–60 min) in the US with 2 thru-hikers and 2 trail runners who wear headphones outdoors: about half Shokz users, men and women. Topics: use cases, pain points, awareness and an ear-clip design.',
  ],
} as const;

/** Short names for the eight questions, used in the client email, shortlist and call. */
export const PRJ_1042_TOPICS = [
  'Activity record',
  'Longest outing',
  'Current headphones',
  'Use cases',
  'Pain points',
  'Wearing conflicts',
  'Hearing surroundings',
  'Ear-clip design',
] as const;

export const PRJ_1042_FACTS: KeyFact[] = [
  { id: 'f_industry', label: 'Industry', value: 'Sports headphones', state: 'ok', page: 2 },
  { id: 'f_geography', label: 'Geography', value: 'United States', state: 'ok', page: 2 },
  {
    id: 'f_calls',
    label: 'Interviews',
    value: '4 × 50–60 min (2 hikers, 2 runners)',
    state: 'ok',
    page: 3,
  },
  { id: 'f_deadline', label: 'Deadline', value: null, state: 'missing', page: null },
  { id: 'f_budget', label: 'Budget', value: 'Quote requested', state: 'confirm', page: 3 },
  { id: 'f_call_type', label: 'Call type', value: 'AI-assisted interview', state: 'ok', page: 3 },
  {
    id: 'f_compliance',
    label: 'Proof',
    value: 'Route map, certificate or photos',
    state: 'ok',
    page: 8,
  },
  { id: 'f_language', label: 'Language', value: 'English', state: 'ok', page: 3 },
];

export const PRJ_1042_REQUIREMENTS: Requirement[] = [
  { id: 'r_hiker', text: 'Thru-hiker: 2+ overnight hikes in 6 months' },
  { id: 'r_runner', text: 'Trail runner: 6+ trail runs in 6 months' },
  { id: 'r_distance', text: 'Longest hike 3 days / 2 nights, or run 30 km+' },
  { id: 'r_headphones', text: 'Wore headphones during the activity' },
  { id: 'r_proof', text: 'Route map, certificate or photos' },
  { id: 'r_mix', text: '~50% Shokz users, men and women' },
];

export const PRJ_1042_QUESTIONS: ClientQuestion[] = [
  {
    id: 'q1',
    text: 'In the past 6 months, how many overnight hikes with your own gear, or trail runs, have you done? Can you share a route map, certificate or photos of the latest one?',
    page: 4,
  },
  {
    id: 'q2',
    text: 'What was your longest hike (days and nights) or trail run (km), and what terrain do you mostly cover?',
    page: 4,
  },
  {
    id: 'q3',
    text: 'Which headphones do you wear on the trail, and are they Shokz bone-conduction headphones?',
    page: 5,
  },
  {
    id: 'q4',
    text: 'When and why do you wear headphones outdoors: what do you listen to, and for how long?',
    page: 5,
  },
  {
    id: 'q5',
    text: 'What frustrates you about your headphones outdoors: fit, sweat, battery, sound or weight?',
    page: 6,
  },
  {
    id: 'q6',
    text: 'Has wearing headphones ever caused a conflict, with other trail users, your safety or gear like hats, helmets and sunglasses?',
    page: 6,
  },
  {
    id: 'q7',
    text: 'How much do you need to hear your surroundings (people, bikes, wildlife, weather), and how do you manage that today?',
    page: 7,
  },
  {
    id: 'q8',
    text: 'Would you wear ear-clip headphones that sit outside the ear? Which features matter most to you?',
    page: 7,
  },
];

const block = (
  id: string,
  kind: 'heading' | 'text',
  text: string,
  sourceFor: string | null = null,
) => ({
  id,
  kind,
  text,
  sourceFor,
});

export const PRJ_1042_PAGES: SourcePage[] = [
  {
    page: 1,
    blocks: [
      block('p1h', 'heading', 'Research brief: sports headphones, North America'),
      block(
        'p1a',
        'text',
        'Prepared by Ridgeline Consumer Insights for Xpert Network. Confidential, October 2026.',
      ),
      block('p1b', 'text', 'Contact: Jenna Cho, Research Director.'),
    ],
  },
  {
    page: 2,
    blocks: [
      block('p2h', 'heading', '1. Background'),
      block(
        'p2a',
        'text',
        'We are running a research project on sports headphones for outdoor athletes and invite Xpert Network to assess feasibility and provide a quote.',
        'f_industry',
      ),
      block(
        'p2b',
        'text',
        'Market: North America. Fieldwork in the United States only, 4 participants.',
        'f_geography',
      ),
    ],
  },
  {
    page: 3,
    blocks: [
      block('p3h', 'heading', '2. Method and sample'),
      block(
        'p3a',
        'text',
        '4 in-depth interviews of 50–60 minutes: 2 thru-hikers and 2 trail runners. Participants may qualify as both.',
        'f_calls',
      ),
      block('p3b', 'text', 'Interviews are AI-assisted.', 'f_call_type'),
      block('p3c', 'text', 'All interviews in English.', 'f_language'),
      block('p3d', 'text', 'Please share feasibility and a quote for the full scope.', 'f_budget'),
    ],
  },
  {
    page: 4,
    blocks: [
      block('p4h', 'heading', '3. Screening: activity'),
      block(
        'p4a',
        'text',
        'Thru-hikers: at least 2 hikes in the past 6 months carrying their own overnight gear. Trail runners: at least 6 runs on trails or natural terrain in the past 6 months. Proof of the latest activity is required.',
        'q1',
      ),
      block(
        'p4b',
        'text',
        'Longest hike at least 3 days and 2 nights; longest trail run at least 30 km. Runners mainly run on trails, not only roads or treadmills.',
        'q2',
      ),
    ],
  },
  {
    page: 5,
    blocks: [
      block('p5h', 'heading', '3. Screening: headphones'),
      block(
        'p5a',
        'text',
        'All participants used headphones during the activity. About 50% should be Shokz bone-conduction users.',
        'q3',
      ),
      block(
        'p5b',
        'text',
        'Objective 1: understand headphone use cases during outdoor activities.',
        'q4',
      ),
    ],
  },
  {
    page: 6,
    blocks: [
      block('p6h', 'heading', '4. Objectives: pain points and conflicts'),
      block(
        'p6a',
        'text',
        'Objective 2: understand pain points when wearing headphones outdoors.',
        'q5',
      ),
      block(
        'p6b',
        'text',
        'Objective 3: understand conflicts related to wearing headphones, with other people, safety and other gear.',
        'q6',
      ),
    ],
  },
  {
    page: 7,
    blocks: [
      block('p7h', 'heading', '4. Objectives: awareness and the ear-clip'),
      block(
        'p7a',
        'text',
        'Objective 4: understand the need to stay aware of the environment while listening.',
        'q7',
      ),
      block(
        'p7b',
        'text',
        'Objective 5: assess acceptance of the ear-clip form factor and which features to prioritise.',
        'q8',
      ),
    ],
  },
  {
    page: 8,
    blocks: [
      block('p8h', 'heading', '5. Participant profile'),
      block(
        'p8a',
        'text',
        'Include both male and female participants. Participants must have used headphones during their hikes or runs.',
      ),
      block(
        'p8b',
        'text',
        'Each participant provides a route map, completion or race certificate, or photos of their most recent activity.',
        'f_compliance',
      ),
    ],
  },
  ...[
    'Appendix A: Product concept (redacted)',
    'Appendix B: Market data we already hold',
    'Appendix C: Discussion guide outline',
    'Appendix D: Trail and race examples',
    'Appendix E: Glossary',
    'Appendix F: Contacts',
  ].map((title, index) => ({
    page: 9 + index,
    blocks: [
      block(`p${9 + index}h`, 'heading', title),
      block(
        `p${9 + index}a`,
        'text',
        'Supporting material for context. No questions or requirements on this page.',
      ),
    ],
  })),
];
