import type { GoalType } from '@/features/goal-chat';

export type QuestionTemplate = {
  topic: string;
  /** `{company}` / `{region}` / `{industry}` are filled from the brief's subjects. */
  text: string;
};

/** Suggested research questions per goal type, in default priority order. */
export const QUESTION_BANK: Record<GoalType, QuestionTemplate[]> = {
  invest: [
    { topic: 'sales-trend', text: 'How have {company} sales trended over the last 3 years?' },
    { topic: 'competition', text: 'Which competitors are gaining share from {company}, and why?' },
    {
      topic: 'unit-economics',
      text: 'What are store-level unit economics: average ticket, footfall and margin range?',
    },
    {
      topic: 'growth-drivers',
      text: 'How much growth comes from new stores versus like-for-like sales?',
    },
    {
      topic: 'operational-risk',
      text: 'What do suppliers and former staff see as the biggest operational risks?',
    },
    { topic: 'brand-perception', text: 'How do customers rate {company} against premium rivals?' },
    { topic: 'leadership', text: 'How do former executives rate the leadership team’s execution?' },
    {
      topic: 'regulation',
      text: 'Which regulatory changes could squeeze margins in the next 12 months?',
    },
  ],
  expand: [
    {
      topic: 'suppliers',
      text: 'Who are the main coffee, dairy and bakery suppliers serving cafés in {region}?',
    },
    {
      topic: 'lead-times',
      text: 'What are typical lead times for equipment and fit-out in {region}?',
    },
    { topic: 'setup-costs', text: 'What does it cost to fit out and open a 120 m² café?' },
    { topic: 'rent', text: 'What rent should I expect in high-footfall districts of {region}?' },
    {
      topic: 'licensing',
      text: 'Which licences and permits are needed, and how long do they take?',
    },
    {
      topic: 'procurement-model',
      text: 'Should procurement be central or local for the first 3 sites?',
    },
    { topic: 'staffing', text: 'What staffing costs and Saudisation quotas apply to a café?' },
    {
      topic: 'local-competition',
      text: 'Which café brands dominate the districts I’m considering?',
    },
  ],
  market: [
    {
      topic: 'market-size',
      text: 'How big is the {industry} market in {region}, and how fast is it growing?',
    },
    { topic: 'competition', text: 'Who are the leading players and how is share shifting?' },
    { topic: 'consumer-trends', text: 'Which consumer trends are changing demand?' },
    { topic: 'pricing', text: 'How are prices and average tickets moving?' },
    { topic: 'regulation', text: 'Which regulations shape the market?' },
    { topic: 'growth-drivers', text: 'What will drive growth over the next 3 years?' },
  ],
  other: [
    { topic: 'market-size', text: 'What is the size and growth of the market?' },
    { topic: 'competition', text: 'Who are the key competitors?' },
    { topic: 'pricing', text: 'What are typical prices and costs?' },
    { topic: 'regulation', text: 'Which rules or permits matter?' },
    { topic: 'consumer-trends', text: 'What are customers asking for?' },
  ],
};

/** Starter objectives per goal type ("Starter chips at each step", PRODUCT_PLAN F2). */
export const OBJECTIVE_STARTERS: Record<GoalType, string[]> = {
  invest: [
    'Decide whether to take a stake in Qahwa House this year',
    'Check if Sahm Grocers’ growth is sustainable before our IC meeting',
  ],
  expand: [
    'Decide whether to open 3 café franchises in Riyadh within 12 months',
    'Plan sourcing for a café franchise in Jeddah',
  ],
  market: [
    'Size the specialty coffee market in Saudi Arabia',
    'Understand how grocery retail is shifting in KSA',
  ],
  other: ['Benchmark franchise fees for a QSR brand in the GCC'],
};

export const SUBJECT_SUGGESTIONS: Record<GoalType, string[]> = {
  invest: ['co_qahwa_house', 'co_sahm_grocers', 'in_specialty_coffee', 'tf_last_3y'],
  expand: ['rg_riyadh', 'rg_jeddah', 'in_specialty_coffee', 'tf_next_12m'],
  market: ['in_specialty_coffee', 'in_grocery', 'rg_ksa', 'rg_uae'],
  other: ['in_fnb_franchising', 'rg_gcc'],
};
