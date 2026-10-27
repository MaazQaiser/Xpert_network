import type { Subject } from '@/features/goal-chat';

/**
 * Launch content: F&B franchising in the Gulf and consumer retail companies for investors
 * (PRODUCT_PLAN §14 q7 defaults). Companies are fictional.
 */
export const COMPANIES: Subject[] = [
  {
    id: 'co_qahwa_house',
    kind: 'company',
    label: 'Qahwa House',
    detail: 'Specialty coffee chain · KSA, UAE · 140 stores',
  },
  {
    id: 'co_qahwa_lane',
    kind: 'company',
    label: 'Qahwa Lane Roasters',
    detail: 'Coffee roaster & wholesaler · UAE',
  },
  {
    id: 'co_darb_retail',
    kind: 'company',
    label: 'Darb Retail Group',
    detail: 'Fashion & home retail · UAE, Qatar',
  },
  {
    id: 'co_sahm_grocers',
    kind: 'company',
    label: 'Sahm Grocers',
    detail: 'Supermarket chain · KSA · 85 stores',
  },
  {
    id: 'co_bayt_burger',
    kind: 'company',
    label: 'Bayt Burger',
    detail: 'QSR franchise · GCC · 60 outlets',
  },
  { id: 'co_tamr_co', kind: 'company', label: 'Tamr & Co.', detail: 'Dates & confectionery · KSA' },
];

export const REGIONS: (Subject & { parentId: string | null })[] = [
  {
    id: 'rg_gcc',
    kind: 'region',
    label: 'GCC',
    detail: 'Gulf Cooperation Council',
    parentId: null,
  },
  {
    id: 'rg_ksa',
    kind: 'region',
    label: 'Saudi Arabia',
    detail: 'Country · GCC',
    parentId: 'rg_gcc',
  },
  {
    id: 'rg_riyadh',
    kind: 'region',
    label: 'Riyadh',
    detail: 'City · Saudi Arabia',
    parentId: 'rg_ksa',
  },
  {
    id: 'rg_jeddah',
    kind: 'region',
    label: 'Jeddah',
    detail: 'City · Saudi Arabia',
    parentId: 'rg_ksa',
  },
  {
    id: 'rg_eastern',
    kind: 'region',
    label: 'Eastern Province',
    detail: 'Region · Saudi Arabia',
    parentId: 'rg_ksa',
  },
  {
    id: 'rg_uae',
    kind: 'region',
    label: 'United Arab Emirates',
    detail: 'Country · GCC',
    parentId: 'rg_gcc',
  },
  { id: 'rg_dubai', kind: 'region', label: 'Dubai', detail: 'City · UAE', parentId: 'rg_uae' },
  {
    id: 'rg_abu_dhabi',
    kind: 'region',
    label: 'Abu Dhabi',
    detail: 'City · UAE',
    parentId: 'rg_uae',
  },
  { id: 'rg_qatar', kind: 'region', label: 'Qatar', detail: 'Country · GCC', parentId: 'rg_gcc' },
  { id: 'rg_kuwait', kind: 'region', label: 'Kuwait', detail: 'Country · GCC', parentId: 'rg_gcc' },
];

export const INDUSTRIES: Subject[] = [
  {
    id: 'in_specialty_coffee',
    kind: 'industry',
    label: 'Specialty coffee',
    detail: 'F&B · cafés and roasters',
  },
  {
    id: 'in_qsr',
    kind: 'industry',
    label: 'Quick-service restaurants',
    detail: 'F&B · fast food and franchising',
  },
  {
    id: 'in_fnb_franchising',
    kind: 'industry',
    label: 'F&B franchising',
    detail: 'F&B · multi-unit franchise operators',
  },
  {
    id: 'in_grocery',
    kind: 'industry',
    label: 'Grocery retail',
    detail: 'Consumer retail · supermarkets',
  },
  {
    id: 'in_consumer_retail',
    kind: 'industry',
    label: 'Consumer retail',
    detail: 'Fashion, home and lifestyle',
  },
  {
    id: 'in_cold_chain',
    kind: 'industry',
    label: 'Cold-chain logistics',
    detail: 'Logistics · chilled and frozen',
  },
];

export const TIMEFRAMES: Subject[] = [
  { id: 'tf_last_3y', kind: 'timeframe', label: 'Last 3 years', detail: '2023–2026' },
  { id: 'tf_next_12m', kind: 'timeframe', label: 'Next 12 months', detail: 'Oct 2026 to Oct 2027' },
  { id: 'tf_next_3y', kind: 'timeframe', label: 'Next 3 years', detail: '2026–2029' },
];

export const ALL_SUBJECTS: Subject[] = [
  ...COMPANIES,
  ...REGIONS.map(({ parentId: _parentId, ...subject }) => subject),
  ...INDUSTRIES,
  ...TIMEFRAMES,
];

/** Region ids from the given region up to the GCC root, e.g. Riyadh → [riyadh, ksa, gcc]. */
export function regionAncestry(regionId: string): string[] {
  const chain: string[] = [];
  let current = REGIONS.find((r) => r.id === regionId);
  while (current) {
    chain.push(current.id);
    current = current.parentId ? REGIONS.find((r) => r.id === current?.parentId) : undefined;
  }
  return chain;
}

export function regionLabel(regionId: string): string {
  return REGIONS.find((r) => r.id === regionId)?.label ?? regionId;
}
