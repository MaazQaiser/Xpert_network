import type { ClientOnboarding, ExpertOnboarding, Taxonomy } from '@/features/onboarding';
import { INDUSTRIES, REGIONS } from './entities';

const SEEDED_AT = '2026-09-02T09:00:00.000Z';

/** Pick lists for onboarding and settings, built on the goal-chat entities. */
export const TAXONOMY: Taxonomy = {
  industries: INDUSTRIES.map(({ id, label, detail }) => ({ id, label, detail })),
  regions: REGIONS.map(({ id, label, detail }) => ({ id, label, detail })),
  topics: [
    { id: 'tp_procurement', label: 'Procurement & sourcing' },
    { id: 'tp_suppliers', label: 'Supplier negotiation' },
    { id: 'tp_cold_chain', label: 'Cold-chain logistics' },
    { id: 'tp_lead_times', label: 'Import lead times & customs' },
    { id: 'tp_franchise_dev', label: 'Franchise development' },
    { id: 'tp_store_ops', label: 'Store operations' },
    { id: 'tp_menu_pricing', label: 'Menu & pricing' },
    { id: 'tp_site_selection', label: 'Site selection & real estate' },
    { id: 'tp_licensing', label: 'Licensing & regulation' },
    { id: 'tp_staffing', label: 'Staffing & labour costs' },
    { id: 'tp_consumer', label: 'Consumer demand & trends' },
    { id: 'tp_sales', label: 'Sales performance & unit economics' },
    { id: 'tp_competition', label: 'Competitive landscape' },
  ],
  languages: [
    { id: 'ln_en', label: 'English' },
    { id: 'ln_ar', label: 'Arabic' },
    { id: 'ln_ur', label: 'Urdu' },
    { id: 'ln_hi', label: 'Hindi' },
    { id: 'ln_fr', label: 'French' },
    { id: 'ln_tl', label: 'Tagalog' },
  ],
  countries: [
    { id: 'ct_ae', label: 'United Arab Emirates' },
    { id: 'ct_sa', label: 'Saudi Arabia' },
    { id: 'ct_qa', label: 'Qatar' },
    { id: 'ct_kw', label: 'Kuwait' },
    { id: 'ct_bh', label: 'Bahrain' },
    { id: 'ct_om', label: 'Oman' },
    { id: 'ct_eg', label: 'Egypt' },
    { id: 'ct_jo', label: 'Jordan' },
    { id: 'ct_pk', label: 'Pakistan' },
    { id: 'ct_in', label: 'India' },
    { id: 'ct_gb', label: 'United Kingdom' },
    { id: 'ct_other', label: 'Another country' },
  ],
};

export function newClientOnboarding(now = new Date()): ClientOnboarding {
  return {
    status: 'not_started',
    currentStep: 'about',
    about: { segment: null, jobTitle: '', organisation: '' },
    interests: { industryIds: [], regionIds: [] },
    firstGoal: null,
    updatedAt: now.toISOString(),
  };
}

export function newExpertOnboarding(now = new Date()): ExpertOnboarding {
  return {
    status: 'not_started',
    currentStep: 'basics',
    basics: null,
    work: null,
    expertise: null,
    compliance: null,
    submittedAt: null,
    decidedAt: null,
    decisionNote: null,
    updatedAt: now.toISOString(),
  };
}

/** Demo clients have finished onboarding. */
export const SEED_CLIENT_ONBOARDING: Record<string, ClientOnboarding> = {
  usr_ayesha: {
    status: 'complete',
    currentStep: 'goal',
    about: {
      segment: 'investor',
      jobTitle: 'Investment analyst',
      organisation: 'Meridian Gulf Capital',
    },
    interests: {
      industryIds: ['in_specialty_coffee', 'in_consumer_retail', 'in_grocery'],
      regionIds: ['rg_gcc', 'rg_ksa', 'rg_uae'],
    },
    firstGoal: 'invest',
    updatedAt: SEEDED_AT,
  },
  usr_bilal: {
    status: 'complete',
    currentStep: 'goal',
    about: { segment: 'operator', jobTitle: 'Franchise owner', organisation: 'Haddad Hospitality' },
    interests: {
      industryIds: ['in_specialty_coffee', 'in_fnb_franchising', 'in_cold_chain'],
      regionIds: ['rg_ksa', 'rg_riyadh'],
    },
    firstGoal: 'expand',
    updatedAt: SEEDED_AT,
  },
};

/** Sara is an approved expert (P2). */
export const SEED_EXPERT_ONBOARDING: Record<string, ExpertOnboarding> = {
  usr_sara: {
    status: 'approved',
    currentStep: 'submit',
    basics: {
      headline: 'Former supply-chain manager, F&B',
      yearsExperience: 14,
      countryId: 'ct_ae',
      linkedinUrl: 'https://www.linkedin.com/in/sara-almansouri',
    },
    work: {
      positions: [
        {
          id: 'pos_1',
          company: 'Gulf Brands Hospitality',
          title: 'Supply-chain manager, coffee & bakery',
          startYear: '2017',
          endYear: '2025',
        },
        {
          id: 'pos_2',
          company: 'Al Noor Foodservice Distribution',
          title: 'Procurement lead',
          startYear: '2011',
          endYear: '2017',
        },
      ],
    },
    expertise: {
      industryIds: ['in_specialty_coffee', 'in_fnb_franchising', 'in_cold_chain'],
      topicIds: ['tp_procurement', 'tp_suppliers', 'tp_cold_chain', 'tp_lead_times'],
      regionIds: ['rg_gcc', 'rg_ksa', 'rg_uae'],
      languageIds: ['ln_en', 'ln_ar'],
    },
    compliance: {
      employerPermission: 'not_employed',
      conflicts: 'Gulf Brands Hospitality (left in 2025)',
      isPublicOfficial: false,
      attestConfidentiality: true,
      attestInsider: true,
      attestAccuracy: true,
    },
    submittedAt: '2026-08-20T10:12:00.000Z',
    decidedAt: '2026-08-21T14:40:00.000Z',
    decisionNote: null,
    updatedAt: '2026-08-21T14:40:00.000Z',
  },
};

/** Shown to an expert when the toolbar rejects their application. */
export const DEMO_REJECTION_NOTE =
  'We couldn’t confirm your recent work history. Add your last two roles with dates, or link a LinkedIn profile that shows them, then resubmit.';
