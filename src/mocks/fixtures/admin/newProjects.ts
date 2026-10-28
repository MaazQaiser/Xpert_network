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

/**
 * PRJ-1043: Amy Wang (Northgate Advisory). A retainer: 1–2 expert calls a month on Medline,
 * Henry Schein and Owens & Minor; this month and next, ERP and EDI integration with health
 * systems. From Retainer_Brief_ERP_EDI_Integration.docx.
 */
export const PRJ_1043: DraftProjectContent = {
  brief:
    'Northgate Advisory runs competitive intelligence for a medical distributor client on a retainer and wants 1–2 expert interviews a month. The target companies stay the same, in priority order: Medline Industries, Henry Schein (medical, not dental) and Owens & Minor. For this month and next the topic is ERP integration and electronic connectivity: how these distributors structure, implement and price ERP and EDI integrations with health system customers, and how mature their API capabilities are. Experts are former employees with hands-on eProcurement, EDI, API or customer-onboarding integration work, ideally people who owned integration projects and can speak to whether customers were charged. U.S.-based with U.S. health system experience; left within the last 12 months (up to 18 considered). 60-minute recorded telephone interviews.',
  requirements: [
    { id: 'r43_company', text: 'Ex-Medline, Henry Schein (medical) or Owens & Minor' },
    { id: 'r43_hands_on', text: 'Hands-on EDI, eProcurement, API or onboarding work' },
    { id: 'r43_customer', text: 'Customer-facing integrations, not internal IT' },
    { id: 'r43_commercial', text: 'Can speak to integration pricing' },
    { id: 'r43_recency', text: 'Left within 12 months (up to 18)' },
    { id: 'r43_us', text: 'U.S.-based, with U.S. health system experience' },
  ],
  questions: [
    {
      id: 'q43_1',
      text: 'How do Medline, Henry Schein and Owens & Minor structure their integration teams, and who owns customer-facing EDI and eProcurement work?',
      page: 2,
    },
    {
      id: 'q43_2',
      text: 'How is an ERP or EDI integration with a health system implemented, from kickoff to go-live, and how long does it take?',
      page: 2,
    },
    {
      id: 'q43_3',
      text: 'Which ERPs and connectivity channels (direct EDI, GHX, punch-out, API) do health system customers use most?',
      page: 2,
    },
    {
      id: 'q43_4',
      text: 'Are health systems charged for integrations, and how is that priced or bundled into the distribution contract?',
      page: 3,
    },
    {
      id: 'q43_5',
      text: 'How mature are each distributor’s API capabilities compared with EDI, and what do customers use them for?',
      page: 3,
    },
    {
      id: 'q43_6',
      text: 'Where do integration projects most often stall or fail, and what does that cost the distributor?',
      page: 3,
    },
  ],
  facts: [
    {
      id: 'f43_industry',
      label: 'Industry',
      value: 'Medical supply distribution',
      state: 'ok',
      page: 1,
    },
    {
      id: 'f43_targets',
      label: 'Target companies',
      value: 'Medline, Henry Schein (medical), Owens & Minor',
      state: 'ok',
      page: 1,
    },
    { id: 'f43_geography', label: 'Geography', value: 'United States', state: 'ok', page: 3 },
    {
      id: 'f43_calls',
      label: 'Calls needed',
      value: '1–2 a month × 60 min, by phone, recorded',
      state: 'ok',
      page: 1,
    },
    {
      id: 'f43_recency',
      label: 'Recency',
      value: 'Left ≤ 12 months (up to 18)',
      state: 'ok',
      page: 3,
    },
    { id: 'f43_budget', label: 'Interview fee', value: null, state: 'missing', page: null },
  ],
  confirmations: [
    {
      id: 'c43_budget',
      factId: 'f43_budget',
      text: 'Interview fee not mentioned in the brief',
      proposal: null,
      state: 'open',
    },
  ],
  pages: [
    {
      page: 1,
      blocks: [
        block('p43_1a', 'heading', 'Retainer brief: medical distributors'),
        block('p43_1b', 'text', 'Prepared by Northgate Advisory for Xpert Network.'),
        block(
          'p43_1c',
          'text',
          'We conduct competitive intelligence research for a medical distributor client under a retainer agreement, and we’re hoping to schedule 1–2 primary research interviews each month to supplement that work.',
          'f43_calls',
        ),
        block(
          'p43_1d',
          'text',
          'Research topics may shift month to month, but the target companies are largely consistent: Medline Industries, Henry Schein, and Owens & Minor, in that order of priority.',
          'f43_targets',
        ),
      ],
    },
    {
      page: 2,
      blocks: [
        block('p43_2a', 'heading', 'This month and next: ERP integration and connectivity'),
        block(
          'p43_2b',
          'text',
          'We’re looking to understand how these medical distributors structure, implement, and price ERP and EDI integrations with health system customers, and how mature their API capabilities are.',
          'q43_2',
        ),
        block(
          'p43_2c',
          'text',
          'We’re looking for former employees with direct, hands-on involvement in eProcurement integration, EDI operations, API development or management, or customer implementation and onboarding for electronic connectivity. The ideal candidate owned or was closely involved in integration projects.',
          'q43_1',
        ),
        block(
          'p43_2d',
          'text',
          'Likely titles: IT Manager or Director, Partner Integration (Medline’s EDI and eProcurement team); eCommerce Project Manager with eProcurement, EDI or API focus; Technical Product Manager, Enterprise Integration Services; Manager or Director, Digital Supply Chain Solutions (Owens & Minor); eProcurement Operations Specialist or Manager, U.S. Medical (Henry Schein).',
          'q43_3',
        ),
      ],
    },
    {
      page: 3,
      blocks: [
        block('p43_3a', 'heading', 'Notes'),
        block(
          'p43_3b',
          'text',
          'For Henry Schein candidates, we are focused exclusively on their medical distribution business, not dental.',
        ),
        block(
          'p43_3c',
          'text',
          'Prioritize candidates with direct involvement in customer-facing integration work, not just internal IT or infrastructure roles.',
          'q43_6',
        ),
        block(
          'p43_3d',
          'text',
          'Candidates who can speak to the commercial side, whether and how customers were charged for integrations, are especially valuable.',
          'q43_4',
        ),
        block(
          'p43_3e',
          'text',
          'U.S.-based candidates with U.S. health system experience preferred.',
          'f43_geography',
        ),
        block(
          'p43_3f',
          'text',
          'Format: 60-minute telephone interviews, recorded. Recency: left within the last 12 months strongly preferred; up to 18 months considered.',
          'f43_recency',
        ),
        block(
          'p43_3g',
          'text',
          'We would also like to understand how mature their API capabilities are.',
          'q43_5',
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
