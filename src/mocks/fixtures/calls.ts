import type { InterviewModeOption, ScreeningQuestion } from '@/features/open-calls';

/** A guide question; `followUp` is asked once when the first answer is thin. */
export type GuideQuestion = { id: string; text: string; followUp: string };
export type GuideSection = { id: string; title: string; questions: GuideQuestion[] };

/** Server-side rules for screening answers; the expert never sees these. */
export type Eligibility = {
  /** Answers that must match, with the note shown when they don't. */
  required: Record<string, { answer: string; note: string }>;
  /** True when an analyst reviews applications instead of auto-approving. */
  review: boolean;
};

export type CallFixture = {
  id: string;
  title: string;
  brief: string;
  industryId: string;
  regionIds: string[];
  topicIds: string[];
  companiesInScope: string[];
  feeUsd: number;
  estMinutes: number;
  deadline: string | null;
  mode: InterviewModeOption;
  evergreen: boolean;
  spotsLeft: number;
  publishedAt: string;
  screening: ScreeningQuestion[];
  eligibility: Eligibility;
  guide: GuideSection[];
};

const ROLE_QUESTION: ScreeningQuestion = {
  id: 'sq_role',
  kind: 'choice',
  text: 'Which best describes your most relevant role?',
  options: [
    { id: 'operator', label: 'I worked for an operator (café, restaurant or retailer)' },
    { id: 'supplier', label: 'I worked for a supplier or distributor' },
    { id: 'advisor', label: 'I advised companies in this area' },
  ],
};

/** The F9 happy-path guide: six sections, two questions each. */
const COFFEE_SUPPLY_GUIDE: GuideSection[] = [
  {
    id: 'sec_background',
    title: 'Background',
    questions: [
      {
        id: 'q_bg_role',
        text: 'To start, tell me about your role in coffee supply in the region and the years you held it.',
        followUp: 'Which parts of the supply chain were you directly responsible for?',
      },
      {
        id: 'q_bg_scale',
        text: 'Roughly how large were the operations you sourced for, in stores or volume?',
        followUp: 'Was that mostly specialty coffee, or a mix with commercial grades?',
      },
    ],
  },
  {
    id: 'sec_market',
    title: 'Market overview',
    questions: [
      {
        id: 'q_mk_demand',
        text: 'How has demand for specialty coffee in Saudi Arabia changed over the last three years?',
        followUp: 'Which customer groups or cities drove most of that change?',
      },
      {
        id: 'q_mk_players',
        text: 'Which kinds of operators are winning share, and why?',
        followUp: 'Is that about price, location, or something else?',
      },
    ],
  },
  {
    id: 'sec_suppliers',
    title: 'Suppliers',
    questions: [
      {
        id: 'q_sp_origins',
        text: 'Where do Saudi specialty chains source green coffee from, and through whom?',
        followUp: 'How concentrated is that among the main importers?',
      },
      {
        id: 'q_sp_leadtime',
        text: 'What lead times and customs delays should a new entrant plan for?',
        followUp: 'What usually causes the longest delays?',
      },
    ],
  },
  {
    id: 'sec_pricing',
    title: 'Pricing',
    questions: [
      {
        id: 'q_pr_landed',
        text: 'What landed cost per kilo do specialty chains typically pay for green coffee today?',
        followUp: 'How much does that move between origins or seasons?',
      },
      {
        id: 'q_pr_terms',
        text: 'How do payment terms and minimum orders usually work with importers?',
        followUp: 'Do smaller chains get noticeably worse terms?',
      },
    ],
  },
  {
    id: 'sec_risks',
    title: 'Risks',
    questions: [
      {
        id: 'q_rk_main',
        text: 'What are the biggest supply risks for a chain expanding quickly in the Kingdom?',
        followUp: 'How do the better operators protect themselves against that?',
      },
      {
        id: 'q_rk_regulation',
        text: 'Are there regulatory changes on the horizon that affect coffee imports or roasting?',
        followUp: 'How much notice do operators usually get?',
      },
    ],
  },
  {
    id: 'sec_wrapup',
    title: 'Wrap-up',
    questions: [
      {
        id: 'q_wu_advice',
        text: 'If you were advising a chain entering Riyadh next year, what would you tell them first?',
        followUp: 'What mistake do you see new entrants make most often?',
      },
      {
        id: 'q_wu_anything',
        text: 'Is there anything we haven’t asked that the client should know?',
        followUp: 'Anything about timing or partners worth flagging?',
      },
    ],
  },
];

/** Shorter guides for the other calls; generated from section titles. */
function simpleGuide(topic: string, titles: string[]): GuideSection[] {
  return titles.map((title, index) => ({
    id: `sec_${index}`,
    title,
    questions: [
      {
        id: `q_${index}_a`,
        text: `From your experience, what matters most about ${title.toLowerCase()} for ${topic}?`,
        followUp: 'Could you give an example from a company you know?',
      },
      {
        id: `q_${index}_b`,
        text: `How has ${title.toLowerCase()} changed over the last two to three years?`,
        followUp: 'What do you expect over the next year?',
      },
    ],
  }));
}

export const CALLS: CallFixture[] = [
  {
    id: 'call_ksa_coffee_supply',
    title: 'Specialty coffee supply chains in Saudi Arabia',
    brief:
      'A café group planning 30 new stores in Riyadh and Jeddah wants to understand how specialty chains source green coffee, what they pay, and where supply breaks. You’ll be interviewed by our AI interviewer; the client sees an anonymous summary and quotes, never your name.',
    industryId: 'in_specialty_coffee',
    regionIds: ['rg_ksa', 'rg_riyadh'],
    topicIds: ['tp_procurement', 'tp_suppliers', 'tp_lead_times'],
    companiesInScope: ['Specialty café chains in Saudi Arabia (no single company)'],
    feeUsd: 300,
    estMinutes: 45,
    deadline: '2026-10-30T18:00:00.000Z',
    mode: 'voice_or_text',
    evergreen: false,
    spotsLeft: 3,
    publishedAt: '2026-10-12T08:00:00.000Z',
    screening: [
      {
        id: 'sq_sourcing',
        kind: 'yes_no',
        text: 'In the last five years, were you responsible for sourcing coffee or café ingredients in the GCC?',
      },
      ROLE_QUESTION,
      {
        id: 'sq_context',
        kind: 'text',
        text: 'In a sentence or two, what will you be able to tell the client about coffee supply in Saudi Arabia?',
        hint: 'For example: importers you worked with, lead times you managed, pricing you negotiated.',
      },
    ],
    eligibility: {
      required: {
        sq_sourcing: {
          answer: 'yes',
          note: 'This call needs someone who has sourced coffee or café ingredients in the GCC in the last five years.',
        },
      },
      review: false,
    },
    guide: COFFEE_SUPPLY_GUIDE,
  },
  {
    id: 'call_uae_cold_chain',
    title: 'Chilled F&B cold-chain capacity in the UAE',
    brief:
      'An investor is assessing cold-chain warehousing for chilled dairy and bakery in Dubai and Abu Dhabi: capacity, utilisation and who the main 3PLs are.',
    industryId: 'in_fnb_franchising',
    regionIds: ['rg_uae'],
    topicIds: ['tp_cold_chain', 'tp_suppliers'],
    companiesInScope: ['Cold-chain 3PLs in the UAE'],
    feeUsd: 250,
    estMinutes: 30,
    deadline: '2026-11-08T18:00:00.000Z',
    mode: 'text',
    evergreen: false,
    spotsLeft: 2,
    publishedAt: '2026-10-14T08:00:00.000Z',
    screening: [
      {
        id: 'sq_coldchain',
        kind: 'yes_no',
        text: 'Have you managed or bought cold-chain logistics for chilled products in the UAE?',
      },
      ROLE_QUESTION,
    ],
    eligibility: {
      required: {
        sq_coldchain: {
          answer: 'yes',
          note: 'This call needs hands-on cold-chain experience in the UAE.',
        },
      },
      review: true,
    },
    guide: simpleGuide('cold-chain logistics in the UAE', [
      'Background',
      'Capacity',
      'Providers',
      'Wrap-up',
    ]),
  },
  {
    id: 'call_gcc_cafe_franchise',
    title: 'Franchise fee structures for café brands in the GCC',
    brief:
      'A European café brand is choosing between master franchise and joint venture models for its GCC entry. The client wants typical fees, royalties and what partners expect.',
    industryId: 'in_fnb_franchising',
    regionIds: ['rg_gcc'],
    topicIds: ['tp_franchise_dev'],
    companiesInScope: ['Café franchise partners in the GCC'],
    feeUsd: 200,
    estMinutes: 40,
    deadline: '2026-11-15T18:00:00.000Z',
    mode: 'voice_or_text',
    evergreen: false,
    spotsLeft: 4,
    publishedAt: '2026-10-10T08:00:00.000Z',
    screening: [
      {
        id: 'sq_franchise',
        kind: 'yes_no',
        text: 'Have you negotiated or run a franchise agreement in the GCC?',
      },
      ROLE_QUESTION,
    ],
    eligibility: { required: {}, review: true },
    guide: simpleGuide('café franchising in the GCC', [
      'Background',
      'Deal structures',
      'Partners',
      'Wrap-up',
    ]),
  },
  {
    id: 'call_gulf_brands_menu',
    title: 'Gulf Brands Hospitality: supplier strategy for coffee and bakery',
    brief:
      'A competitor wants to understand how Gulf Brands Hospitality chooses and manages its coffee and bakery suppliers.',
    industryId: 'in_specialty_coffee',
    regionIds: ['rg_uae', 'rg_ksa'],
    topicIds: ['tp_suppliers', 'tp_procurement'],
    companiesInScope: ['Gulf Brands Hospitality'],
    feeUsd: 350,
    estMinutes: 45,
    deadline: '2026-11-01T18:00:00.000Z',
    mode: 'voice_or_text',
    evergreen: false,
    spotsLeft: 2,
    publishedAt: '2026-10-15T08:00:00.000Z',
    screening: [ROLE_QUESTION],
    eligibility: { required: {}, review: false },
    guide: simpleGuide('supplier strategy', ['Background', 'Suppliers', 'Wrap-up']),
  },
  {
    id: 'call_gcc_menu_pricing',
    title: 'Menu pricing in GCC quick-service restaurants',
    brief:
      'An ongoing call that keeps our library’s pricing report current: how QSR and café chains set and change menu prices across the GCC.',
    industryId: 'in_qsr',
    regionIds: ['rg_gcc'],
    topicIds: ['tp_menu_pricing', 'tp_consumer'],
    companiesInScope: ['QSR chains in the GCC'],
    feeUsd: 150,
    estMinutes: 30,
    deadline: null,
    mode: 'voice_or_text',
    evergreen: true,
    spotsLeft: 20,
    publishedAt: '2026-06-01T08:00:00.000Z',
    screening: [ROLE_QUESTION],
    eligibility: { required: {}, review: false },
    guide: simpleGuide('menu pricing in GCC QSR', ['Background', 'Price setting', 'Wrap-up']),
  },
  {
    id: 'call_ksa_grocery_private_label',
    title: 'Private-label sourcing in Saudi grocery',
    brief:
      'A retailer wants to know how Saudi grocers source private-label products, which categories work, and how margins compare with brands.',
    industryId: 'in_grocery',
    regionIds: ['rg_ksa'],
    topicIds: ['tp_procurement', 'tp_sales'],
    companiesInScope: ['Grocery retailers in Saudi Arabia'],
    feeUsd: 220,
    estMinutes: 60,
    deadline: '2026-11-20T18:00:00.000Z',
    mode: 'text',
    evergreen: false,
    spotsLeft: 5,
    publishedAt: '2026-10-08T08:00:00.000Z',
    screening: [ROLE_QUESTION],
    eligibility: { required: {}, review: false },
    guide: simpleGuide('private-label sourcing', [
      'Background',
      'Categories',
      'Margins',
      'Wrap-up',
    ]),
  },
];

/** Sara applied to the franchise call before today; it's waiting for an analyst. */
export const SEED_APPLICATIONS: Record<
  string,
  Record<
    string,
    {
      status: 'applied' | 'approved' | 'not_eligible';
      at: string;
      note: string | null;
      interviewId: string | null;
      answers: Record<string, string>;
    }
  >
> = {
  usr_sara: {
    call_gcc_cafe_franchise: {
      status: 'applied',
      at: '2026-10-14T11:20:00.000Z',
      note: 'An analyst is checking your answers. Most applications are decided within a day.',
      interviewId: null,
      answers: { sq_franchise: 'yes', sq_role: 'operator' },
    },
  },
};
