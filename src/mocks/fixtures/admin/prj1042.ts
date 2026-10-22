import type { ClientQuestion, KeyFact, Requirement, SourcePage } from '@/features/admin';

/** PRJ-1042: Sarah Lin's EV battery recycling brief (wireframes 02–03). */

export const PRJ_1042_BRIEFS = {
  standard: [
    'Helix is evaluating an investment in a mid-size European lithium-ion battery recycler. They need 5–8 one-hour calls with former senior operators and industry specialists to validate market size, feedstock supply (black mass), unit economics of hydrometallurgical recovery and the impact of the EU Battery Regulation. First calls requested for the week of 26 Oct.',
    'Helix Capital Partners is doing diligence on a European lithium-ion battery recycler with hydrometallurgical plants in Germany and Poland. They want 5–8 one-hour calls with former senior operators and specialists covering market size to 2030, who controls black mass supply, recovery rates and costs, and how the EU Battery Regulation shifts demand. First calls in the week of 26 Oct.',
  ],
  shorter: [
    'Helix is assessing a European battery recycler and needs 5–8 one-hour calls with former senior operators on market size, black mass supply, hydrometallurgy economics and the EU Battery Regulation. First calls week of 26 Oct.',
  ],
} as const;

export const PRJ_1042_FACTS: KeyFact[] = [
  { id: 'f_industry', label: 'Industry', value: 'Battery recycling', state: 'ok', page: 2 },
  { id: 'f_geography', label: 'Geography', value: 'EU (DE, PL, Nordics)', state: 'ok', page: 2 },
  { id: 'f_calls', label: 'Calls needed', value: '5–8 × 60 min', state: 'ok', page: 3 },
  { id: 'f_deadline', label: 'Deadline', value: '“Early next month”', state: 'confirm', page: 3 },
  { id: 'f_budget', label: 'Budget', value: null, state: 'missing', page: null },
  { id: 'f_call_type', label: 'Call type', value: 'Phone / video', state: 'ok', page: 3 },
  {
    id: 'f_compliance',
    label: 'Compliance',
    value: 'No current employees of target',
    state: 'ok',
    page: 8,
  },
  { id: 'f_language', label: 'Language', value: 'English', state: 'ok', page: 3 },
];

export const PRJ_1042_REQUIREMENTS: Requirement[] = [
  { id: 'r_vp', text: 'Former VP / Director, battery recycler' },
  { id: 'r_black_mass', text: 'Black mass supply chain' },
  { id: 'r_hydro', text: 'Hydrometallurgy operations' },
  { id: 'r_regulation', text: 'EU Battery Regulation' },
  { id: 'r_years', text: '10+ yrs experience' },
  { id: 'r_left', text: 'Left company < 3 yrs ago' },
];

export const PRJ_1042_QUESTIONS: ClientQuestion[] = [
  {
    id: 'q1',
    text: 'How big is the EU recycling market for EV batteries today, and how fast will it grow to 2030?',
    page: 4,
  },
  {
    id: 'q2',
    text: 'Where does feedstock (black mass) come from, and who controls supply?',
    page: 4,
  },
  {
    id: 'q3',
    text: 'What are typical recovery rates and costs for hydrometallurgical vs pyrometallurgical plants?',
    page: 5,
  },
  {
    id: 'q4',
    text: 'How will the EU Battery Regulation’s recycled-content targets change demand?',
    page: 5,
  },
  { id: 'q5', text: 'Who are the leading players and how are they differentiated?', page: 6 },
  {
    id: 'q6',
    text: 'What pricing do OEMs pay for recycling services, and how are contracts structured?',
    page: 6,
  },
  { id: 'q7', text: 'What are the main operational risks when scaling a plant?', page: 7 },
  { id: 'q8', text: 'How do you see the role of Asian recyclers entering Europe?', page: 7 },
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
      block('p1h', 'heading', 'Project brief: EV battery recycling, Europe'),
      block(
        'p1a',
        'text',
        'Prepared by Helix Capital Partners for Xpert Network. Confidential, October 2026.',
      ),
      block('p1b', 'text', 'Contact: Sarah Lin, Vice President, Industrials.'),
    ],
  },
  {
    page: 2,
    blocks: [
      block('p2h', 'heading', '1. Background'),
      block(
        'p2a',
        'text',
        'Helix is evaluating a minority investment in a mid-size European lithium-ion battery recycler operating hydrometallurgical recovery lines.',
        'f_industry',
      ),
      block(
        'p2b',
        'text',
        'The target runs plants in Germany and Poland and is exploring a third site in the Nordics. We need views across all three markets.',
        'f_geography',
      ),
    ],
  },
  {
    page: 3,
    blocks: [
      block('p3h', 'heading', '2. What we need'),
      block(
        'p3a',
        'text',
        'We would like 5–8 one-hour calls with former senior operators and industry specialists.',
        'f_calls',
      ),
      block('p3b', 'text', 'Calls can be by phone or video.', 'f_call_type'),
      block('p3c', 'text', 'All calls in English.', 'f_language'),
      block(
        'p3d',
        'text',
        'Ideally first calls next week, with all calls completed early next month.',
        'f_deadline',
      ),
    ],
  },
  {
    page: 4,
    blocks: [
      block('p4h', 'heading', '3. Questions: market and supply'),
      block(
        'p4a',
        'text',
        'Market size: how big is the EU recycling market for EV batteries today, and what growth should we expect to 2030?',
        'q1',
      ),
      block(
        'p4b',
        'text',
        'Feedstock: where does black mass come from (production scrap vs end-of-life packs), and who controls supply?',
        'q2',
      ),
    ],
  },
  {
    page: 5,
    blocks: [
      block('p5h', 'heading', '3. Questions: economics and regulation'),
      block(
        'p5a',
        'text',
        'Unit economics: typical recovery rates and cost per tonne for hydrometallurgical vs pyrometallurgical plants.',
        'q3',
      ),
      block(
        'p5b',
        'text',
        'Regulation: how will the EU Battery Regulation’s recycled-content targets change demand for recycled material?',
        'q4',
      ),
    ],
  },
  {
    page: 6,
    blocks: [
      block('p6h', 'heading', '3. Questions: competition and pricing'),
      block('p6a', 'text', 'Who are the leading players, and how are they differentiated?', 'q5'),
      block(
        'p6b',
        'text',
        'What do OEMs pay for recycling services, and how are contracts structured (tolling, offtake, gate fees)?',
        'q6',
      ),
    ],
  },
  {
    page: 7,
    blocks: [
      block('p7h', 'heading', '3. Questions: risks and outlook'),
      block('p7a', 'text', 'What are the main operational risks when scaling a plant?', 'q7'),
      block('p7b', 'text', 'How do you see the role of Asian recyclers entering Europe?', 'q8'),
    ],
  },
  {
    page: 8,
    blocks: [
      block('p8h', 'heading', '4. Expert profile and compliance'),
      block(
        'p8a',
        'text',
        'Former VPs or directors at battery recyclers, with hands-on black mass sourcing or hydrometallurgy operations, ideally 10+ years in the industry.',
      ),
      block(
        'p8b',
        'text',
        'No current employees of the target. Former employees must have left more than 6 months ago.',
        'f_compliance',
      ),
    ],
  },
  ...[
    'Appendix A: Target overview (redacted)',
    'Appendix B: Market data we already hold',
    'Appendix C: EU Battery Regulation timeline',
    'Appendix D: Plant locations',
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
