import type {
  ClientQuestion,
  Confirmation,
  KeyFact,
  Requirement,
  SourcePage,
} from '@/features/admin';

/** Today's two other drafted project files, so Home's "New projects today" has three to show. */
export type DraftProjectContent = {
  brief: string;
  requirements: Requirement[];
  questions: ClientQuestion[];
  facts: KeyFact[];
  confirmations: Confirmation[];
  pages: SourcePage[];
};

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

/** PRJ-1043: Omar Siddiqui (Northgate Advisory) — UK MRO carve-out, from Scope_v2.docx. */
export const PRJ_1043: DraftProjectContent = {
  brief:
    'Northgate Advisory is advising on the carve-out of a UK aircraft maintenance (MRO) business. They need 4–5 one-hour calls with former quality and compliance leads who know EASA Part 145 and UK CAA oversight, to test how ready the business is to hold its own approvals after separation. First calls before 6 Nov.',
  requirements: [
    { id: 'r43_quality', text: 'Former Head of Quality / Compliance Manager, Part 145 MRO' },
    { id: 'r43_easa', text: 'EASA Part 145 and UK CAA approvals' },
    { id: 'r43_carveout', text: 'Lived through a carve-out or approval transfer' },
    { id: 'r43_years', text: '10+ yrs in aviation maintenance' },
    { id: 'r43_left', text: 'Not at the target or its parent today' },
  ],
  questions: [
    {
      id: 'q43_1',
      text: 'What does it take for a carved-out MRO to hold its own Part 145 approval, and how long does the CAA take?',
      page: 2,
    },
    {
      id: 'q43_2',
      text: 'Which quality and compliance functions are usually shared with the parent and hardest to separate?',
      page: 2,
    },
    {
      id: 'q43_3',
      text: 'How do customers and lessors react to a change of approval holder?',
      page: 3,
    },
    {
      id: 'q43_4',
      text: 'What are the common findings in a first CAA audit after separation?',
      page: 3,
    },
    {
      id: 'q43_5',
      text: 'What staffing does a stand-alone quality department need for a 300-person MRO?',
      page: 3,
    },
    {
      id: 'q43_6',
      text: 'Which IT systems (maintenance records, tooling, parts traceability) are hardest to stand up?',
      page: 4,
    },
  ],
  facts: [
    {
      id: 'f43_industry',
      label: 'Industry',
      value: 'Aircraft maintenance (MRO)',
      state: 'ok',
      page: 1,
    },
    { id: 'f43_geography', label: 'Geography', value: 'United Kingdom', state: 'ok', page: 1 },
    { id: 'f43_calls', label: 'Calls needed', value: '4–5 × 60 min', state: 'ok', page: 1 },
    { id: 'f43_deadline', label: 'Deadline', value: 'Before 6 Nov', state: 'ok', page: 1 },
    { id: 'f43_budget', label: 'Budget', value: null, state: 'missing', page: null },
  ],
  confirmations: [
    {
      id: 'c43_budget',
      factId: 'f43_budget',
      text: 'Budget not mentioned in the scope',
      proposal: null,
      state: 'open',
    },
  ],
  pages: [
    {
      page: 1,
      blocks: [
        block('p43_1a', 'heading', 'Scope: UK MRO carve-out readiness'),
        block('p43_1b', 'text', 'Prepared by Northgate Advisory for Xpert Network. October 2026.'),
        block(
          'p43_1c',
          'text',
          'We are advising a buyer on the carve-out of a UK maintenance, repair and overhaul business (approx. 300 staff, two hangars) from its airline parent.',
          'f43_industry',
        ),
        block('p43_1d', 'text', 'We would like 4–5 one-hour calls before 6 November.', 'f43_calls'),
      ],
    },
    {
      page: 2,
      blocks: [
        block('p43_2a', 'heading', 'Approvals and quality'),
        block(
          'p43_2b',
          'text',
          'The business operates under its parent’s EASA Part 145 and UK CAA approvals. The buyer needs to understand what it takes to hold these approvals independently.',
          'q43_1',
        ),
        block(
          'p43_2c',
          'text',
          'Quality, compliance and training are shared with the parent today; we want to know which functions are hardest to separate.',
          'q43_2',
        ),
      ],
    },
    {
      page: 3,
      blocks: [
        block('p43_3a', 'heading', 'Customers, audits and people'),
        block(
          'p43_3b',
          'text',
          'How customers and lessors react to a change of approval holder.',
          'q43_3',
        ),
        block('p43_3c', 'text', 'Typical findings in a first CAA audit after separation.', 'q43_4'),
        block(
          'p43_3d',
          'text',
          'The staffing a stand-alone quality department needs at this size.',
          'q43_5',
        ),
      ],
    },
    {
      page: 4,
      blocks: [
        block('p43_4a', 'heading', 'Systems'),
        block(
          'p43_4b',
          'text',
          'Maintenance records, tooling control and parts traceability systems are run by the parent group.',
          'q43_6',
        ),
        block(
          'p43_4c',
          'text',
          'Experts should be former quality or compliance leads with 10+ years in Part 145 maintenance, not employed by the target or its parent.',
        ),
      ],
    },
  ],
};

/** PRJ-1044: Priya Raman (Lakeview Consulting) — advanced packaging supply chain, from RFP.pdf. */
export const PRJ_1044: DraftProjectContent = {
  brief:
    'Lakeview Consulting is mapping the supply chain for advanced semiconductor packaging (CoWoS, fan-out, hybrid bonding) for a client weighing a capacity investment in Taiwan and Malaysia. They need 3 one-hour calls with former packaging operations and supply-chain leaders on capacity, bottlenecks and lead times through 2027. Ideally this month.',
  requirements: [
    { id: 'r44_ops', text: 'Former Director, advanced packaging operations (OSAT or foundry)' },
    { id: 'r44_supply', text: 'Substrates and materials supply chain' },
    { id: 'r44_taiwan', text: 'Worked with Taiwan or Malaysia packaging capacity' },
    { id: 'r44_years', text: '10+ yrs in semiconductor manufacturing' },
    { id: 'r44_left', text: 'Left their company less than 3 yrs ago' },
  ],
  questions: [
    {
      id: 'q44_1',
      text: 'How much CoWoS and fan-out capacity is coming online in Taiwan and Malaysia through 2027, and who is adding it?',
      page: 2,
    },
    {
      id: 'q44_2',
      text: 'Where are the bottlenecks today: substrates, equipment, or skilled labour?',
      page: 2,
    },
    {
      id: 'q44_3',
      text: 'What are current lead times for ABF substrates and how might they move?',
      page: 3,
    },
    {
      id: 'q44_4',
      text: 'How do OSATs and foundries split advanced packaging work, and is that changing?',
      page: 3,
    },
    {
      id: 'q44_5',
      text: 'What does it cost to build a new advanced packaging line, and how long does it take?',
      page: 4,
    },
  ],
  facts: [
    {
      id: 'f44_industry',
      label: 'Industry',
      value: 'Semiconductor packaging',
      state: 'ok',
      page: 1,
    },
    { id: 'f44_geography', label: 'Geography', value: 'Taiwan and Malaysia', state: 'ok', page: 1 },
    { id: 'f44_calls', label: 'Calls needed', value: '3 × 60 min', state: 'ok', page: 1 },
    {
      id: 'f44_deadline',
      label: 'Deadline',
      value: '“Ideally this month”',
      state: 'confirm',
      page: 1,
    },
    { id: 'f44_language', label: 'Language', value: 'English or Mandarin', state: 'ok', page: 4 },
  ],
  confirmations: [
    {
      id: 'c44_deadline',
      factId: 'f44_deadline',
      text: '“Ideally this month”: assume calls by 30 Oct?',
      proposal: '30 Oct',
      state: 'open',
    },
  ],
  pages: [
    {
      page: 1,
      blocks: [
        block('p44_1a', 'heading', 'RFP: Advanced packaging capacity, Taiwan and Malaysia'),
        block(
          'p44_1b',
          'text',
          'Lakeview Consulting, on behalf of a client weighing a capacity investment.',
          'f44_industry',
        ),
        block('p44_1c', 'text', 'Three one-hour calls, ideally this month.', 'f44_calls'),
      ],
    },
    {
      page: 2,
      blocks: [
        block('p44_2a', 'heading', 'Capacity and bottlenecks'),
        block(
          'p44_2b',
          'text',
          'New CoWoS and fan-out capacity in Taiwan and Malaysia through 2027, and who is adding it.',
          'q44_1',
        ),
        block(
          'p44_2c',
          'text',
          'Whether substrates, equipment or skilled labour constrain growth today.',
          'q44_2',
        ),
      ],
    },
    {
      page: 3,
      blocks: [
        block('p44_3a', 'heading', 'Materials and the OSAT–foundry split'),
        block('p44_3b', 'text', 'ABF substrate lead times and their direction.', 'q44_3'),
        block('p44_3c', 'text', 'How OSATs and foundries divide advanced packaging work.', 'q44_4'),
      ],
    },
    {
      page: 4,
      blocks: [
        block('p44_4a', 'heading', 'Economics and experts'),
        block('p44_4b', 'text', 'Cost and time to build a new advanced packaging line.', 'q44_5'),
        block(
          'p44_4c',
          'text',
          'Experts: former packaging operations or supply-chain leaders; English or Mandarin.',
          'f44_language',
        ),
      ],
    },
  ],
};
