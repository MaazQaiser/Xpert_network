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

/** PRJ-1043: Amy Wang (Northgate Advisory) — UK MRO carve-out, from Scope_v2.docx. */
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

/**
 * PRJ-1044: Priya Raman (Sintel) — soil & groundwater remediation market, BE / NL / DE.
 * Sintel means “cinder” or “ember” in Dutch.
 */
export const PRJ_1044: DraftProjectContent = {
  brief:
    'Commercial market assessment of soil and groundwater remediation in Belgium, the Netherlands, and Germany, focusing on in situ and on-site techniques (biological, chemical, thermal, pump & treat) including PFAS soil treatment. Research covers quantitative market sizing by country (2022 baseline), technique/service line, contaminant group (incl. PFAS), customer group, project characteristics and demand triggers; growth projection and drivers for 2022–2031 with regulatory scenario analysis (Flemish Soil Decree, Omgevingswet, BBodSchG, EU Soil Monitoring Directive, evolving PFAS limits); contract and commercial models; and competitive landscape, market shares, barriers to entry and purchasing criteria. About 15 expert interviews (~5 per country) at project-manager level and above across remediation contractors, environmental consultancies/specifiers, and customers. Deliverables: country and technique-level market size tables, growth scenarios, regulatory impact assessment, contract/pricing model taxonomy, cost drivers and typical margins, supplier matrix and procurement playbook. Experts should receive the research questionnaire ahead of each call.',
  requirements: [
    {
      id: 'r44_geo',
      text: 'Involved in in situ / on-site soil or groundwater remediation in BE, NL or DE (past 5 years)',
    },
    {
      id: 'r44_tech',
      text: 'Biological, chemical, thermal, pump & treat or PFAS soil treatment',
    },
    {
      id: 'r44_level',
      text: 'Project manager level and above: contractor, consultancy/specifier, or customer',
    },
    {
      id: 'r44_commercial',
      text: 'Pricing, negotiation or contracts for remediation projects above €250k (last 3 years)',
    },
    {
      id: 'r44_exclude',
      text: 'Do not contact: GreenSoil, WATR, Sensatec, Weidner, RWT Reeker, OKO-tech, Logisticon, ahu, Winkelnkemper',
    },
  ],
  questions: [
    {
      id: 'q44_1',
      text: 'Have you been directly involved in delivering or managing in situ or on-site soil/groundwater remediation projects (biological, chemical, thermal, pump & treat or PFAS treatment) in Belgium, the Netherlands or Germany within the past 5 years? If yes, please list typical project values and technologies used.',
      page: 3,
    },
    {
      id: 'q44_2',
      text: 'Have you been responsible for pricing, commercial negotiation, or drafting contracts (including risk-based contracts or liability takeover) for remediation projects above €250k in the last 3 years?',
      page: 3,
    },
    {
      id: 'q44_3',
      text: 'Can you provide quantitative estimates (annual spend, project volumes, or market share) for your organisation or the segment you cover in any of the three countries over the past 3 years? Please specify the basis for the estimate.',
      page: 3,
    },
    {
      id: 'q44_4',
      text: 'Have you advised, implemented or been accountable for compliance with soil/remediation regulations (e.g. Flemish Soil Decree, Omgevingswet, BBodSchG, PFAS limits) or for permitting/enforcement decisions in the past 5 years?',
      page: 3,
    },
    {
      id: 'q44_5',
      text: 'Do you have procurement or site ownership experience commissioning remediation (industrial site owner, brownfield developer or public authority) in these countries, and can you describe purchasing criteria, typical approval processes and budget ranges?',
      page: 4,
    },
  ],
  facts: [
    {
      id: 'f44_industry',
      label: 'Industry',
      value: 'Soil & groundwater remediation',
      state: 'ok',
      page: 1,
    },
    {
      id: 'f44_geography',
      label: 'Geography',
      value: 'Belgium, Netherlands, Germany',
      state: 'ok',
      page: 1,
    },
    {
      id: 'f44_calls',
      label: 'Interviews',
      value: '~15 (~5 per country)',
      state: 'ok',
      page: 1,
    },
    {
      id: 'f44_focus',
      label: 'Techniques',
      value: 'In situ / on-site + PFAS soil treatment',
      state: 'ok',
      page: 1,
    },
    {
      id: 'f44_horizon',
      label: 'Horizon',
      value: '2022 baseline → 2031 scenarios',
      state: 'ok',
      page: 2,
    },
    {
      id: 'f44_questionnaire',
      label: 'Fieldwork',
      value: 'Send questionnaire ahead of each call',
      state: 'ok',
      page: 4,
    },
    { id: 'f44_budget', label: 'Budget', value: null, state: 'missing', page: null },
  ],
  confirmations: [
    {
      id: 'c44_budget',
      factId: 'f44_budget',
      text: 'Budget / interview fee not stated in the brief',
      proposal: null,
      state: 'open',
    },
  ],
  pages: [
    {
      page: 1,
      blocks: [
        block('p44_1a', 'heading', 'Project brief: Soil & groundwater remediation (BE / NL / DE)'),
        block(
          'p44_1b',
          'text',
          'Prepared for Sintel (Dutch: “cinder” / “ember”). Commercial market assessment.',
        ),
        block(
          'p44_1c',
          'text',
          'Focus: in situ and on-site techniques (biological, chemical, thermal, pump & treat), including PFAS soil treatment.',
          'f44_focus',
        ),
        block(
          'p44_1d',
          'text',
          'Geography: Belgium, the Netherlands and Germany. About 15 expert interviews, roughly 5 per country.',
          'f44_calls',
        ),
      ],
    },
    {
      page: 2,
      blocks: [
        block('p44_2a', 'heading', 'Research areas: sizing and growth'),
        block(
          'p44_2b',
          'text',
          'Quantitative market sizing by country (2022 baseline), technique/service line, contaminant group (incl. PFAS), customer group, project characteristics and demand trigger.',
          'q44_1',
        ),
        block(
          'p44_2c',
          'text',
          'Growth projection and drivers for 2022–2031, with scenario analysis for Flemish Soil Decree, Omgevingswet, BBodSchG, EU Soil Monitoring Directive and evolving PFAS limits.',
          'q44_2',
        ),
      ],
    },
    {
      page: 3,
      blocks: [
        block('p44_3a', 'heading', 'Contracts, competition and screening'),
        block(
          'p44_3b',
          'text',
          'Contract and commercial models: procurement routes, pricing, cost/margin structures, risk-based contracts, liability takeover, warranties and common clauses.',
          'q44_3',
        ),
        block(
          'p44_3c',
          'text',
          'Competitive landscape and market shares, barriers to entry, procurement behaviour and purchasing criteria.',
          'q44_5',
        ),
        block(
          'p44_3d',
          'text',
          'Screening: direct delivery/management of in situ or on-site projects in BE/NL/DE in the past 5 years; pricing or contracts above €250k in the last 3 years; quantitative estimates for the segment covered.',
          'r44_commercial',
        ),
      ],
    },
    {
      page: 4,
      blocks: [
        block('p44_4a', 'heading', 'Participants, outputs and exclusions'),
        block(
          'p44_4b',
          'text',
          'Three groups: remediation contractors (large multi-disciplinary and in situ specialists), environmental consultancies/specifiers, and customers (industrial site owners, brownfield developers, public authorities).',
          'r44_level',
        ),
        block(
          'p44_4c',
          'text',
          'Deliverables: country and technique-level market size tables, growth scenarios, regulatory impact assessment, contract/pricing taxonomy, cost drivers and typical margins, supplier matrix and procurement playbook.',
        ),
        block(
          'p44_4d',
          'text',
          'Fieldwork: experts should receive the research questionnaire ahead of each call.',
          'f44_questionnaire',
        ),
        block(
          'p44_4e',
          'text',
          'Do not contact: GreenSoil Group; WATR Group; Sensatec GmbH; Weidner Wassertechnik; RWT Reeker Wassertechnik; OKO-tech; Logisticon Water Treatment; ahu GmbH; Winkelnkemper GmbH (all entities where noted).',
          'r44_exclude',
        ),
      ],
    },
  ],
};
