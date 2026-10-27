import type { LibraryItem } from '@/features/library';

const PROVENANCE =
  'Built from recorded expert interviews, checked by Xpert Network analysts, and anonymised after the commissioning client’s exclusivity period ended.';

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib_gcc_coffee_2026',
    title: 'GCC specialty coffee 2026: growth, pricing and competition',
    summary:
      'How the Gulf specialty coffee market is growing, who is winning share, and how chains price against each other, from 9 operators, roasters and landlords.',
    category: { industry: 'Food & beverage', subIndustry: 'Specialty coffee' },
    regionIds: ['rg_ksa', 'rg_uae', 'rg_gcc'],
    companyIds: ['co_qahwa_house', 'co_qahwa_lane'],
    priceCredits: 180,
    expertCount: 9,
    experts: [
      { role: 'Former regional director, coffee chain', years: 14, region: 'KSA' },
      { role: 'Green coffee importer', years: 11, region: 'UAE' },
      { role: 'Mall leasing manager', years: 9, region: 'KSA' },
    ],
    toc: [
      { id: 's1', title: 'Market size and growth by country', topics: ['market-size'] },
      {
        id: 's2',
        title: 'Competitive landscape and share shifts',
        topics: ['competition', 'local-competition'],
      },
      { id: 's3', title: 'Pricing ladders and average ticket', topics: ['pricing'] },
      {
        id: 's4',
        title: 'Customer perception of leading brands',
        topics: ['brand-perception', 'consumer-trends'],
      },
    ],
    publishedAt: '2026-08-12',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_qahwa_ops',
    title: 'Qahwa House: store economics and growth, from former managers',
    summary:
      'Store-level sales trajectory, unit economics and operational risks at Qahwa House, from 6 former area managers and suppliers.',
    category: { industry: 'Food & beverage', subIndustry: 'Specialty coffee' },
    regionIds: ['rg_ksa', 'rg_uae'],
    companyIds: ['co_qahwa_house'],
    priceCredits: 240,
    expertCount: 6,
    experts: [
      { role: 'Former area manager', years: 8, region: 'KSA' },
      { role: 'Former finance business partner', years: 10, region: 'UAE' },
      { role: 'Dairy supplier account lead', years: 12, region: 'KSA' },
    ],
    toc: [
      { id: 's1', title: 'Store-level sales trajectory 2023–2026', topics: ['sales-trend'] },
      {
        id: 's2',
        title: 'Unit economics: ticket, footfall, margin ranges',
        topics: ['unit-economics'],
      },
      { id: 's3', title: 'New stores vs. like-for-like growth', topics: ['growth-drivers'] },
      { id: 's4', title: 'Operational and supplier risks', topics: ['operational-risk'] },
    ],
    publishedAt: '2026-06-30',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_riyadh_cafe_supply',
    title: 'Supplying a café in Riyadh: suppliers, lead times and costs',
    summary:
      'Who supplies coffee, dairy and equipment to Riyadh cafés, how long things take, and what a fit-out really costs, from 7 operators and suppliers.',
    category: { industry: 'Food & beverage', subIndustry: 'F&B franchising' },
    regionIds: ['rg_riyadh'],
    companyIds: [],
    priceCredits: 150,
    expertCount: 7,
    experts: [
      { role: 'Procurement manager, café group', years: 9, region: 'Riyadh' },
      { role: 'Espresso equipment distributor', years: 15, region: 'KSA' },
      { role: 'Fit-out contractor', years: 12, region: 'Riyadh' },
    ],
    toc: [
      { id: 's1', title: 'Supplier landscape: coffee, dairy, bakery', topics: ['suppliers'] },
      { id: 's2', title: 'Lead times for equipment and fit-out', topics: ['lead-times'] },
      { id: 's3', title: 'Fit-out and opening costs for 80–150 m² cafés', topics: ['setup-costs'] },
      { id: 's4', title: 'Central vs. local procurement models', topics: ['procurement-model'] },
    ],
    publishedAt: '2026-09-04',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_ksa_fnb_licensing',
    title: 'Opening an F&B outlet in Saudi Arabia: licences and timelines',
    summary:
      'The licences, permits and inspections needed to open a café or restaurant in KSA, with realistic timelines from 5 consultants and operators.',
    category: { industry: 'Food & beverage', subIndustry: 'Regulation' },
    regionIds: ['rg_ksa'],
    companyIds: [],
    priceCredits: 90,
    expertCount: 5,
    experts: [
      { role: 'Licensing consultant', years: 11, region: 'KSA' },
      { role: 'Former municipality inspector', years: 16, region: 'Riyadh' },
    ],
    toc: [
      { id: 's1', title: 'Licence and permit checklist', topics: ['licensing'] },
      {
        id: 's2',
        title: 'Typical approval timelines by city',
        topics: ['licensing', 'lead-times'],
      },
      { id: 's3', title: 'Recent regulatory changes', topics: ['regulation'] },
    ],
    publishedAt: '2026-07-18',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_dubai_rents',
    title: 'Dubai high-street and mall rents for F&B, 2026',
    summary:
      'Rent ranges, fit-out contributions and lease terms for F&B units across Dubai locations.',
    category: { industry: 'Real estate', subIndustry: 'Retail leasing' },
    regionIds: ['rg_dubai'],
    companyIds: [],
    priceCredits: 80,
    expertCount: 4,
    experts: [{ role: 'Retail leasing broker', years: 13, region: 'Dubai' }],
    toc: [
      { id: 's1', title: 'Rent ranges by district and mall tier', topics: ['rent'] },
      { id: 's2', title: 'Lease terms and fit-out contributions', topics: ['rent', 'setup-costs'] },
    ],
    publishedAt: '2026-05-22',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_gcc_franchise_models',
    title: 'Franchising in Gulf F&B: fees, royalties and procurement',
    summary:
      'How master franchisees structure fees, royalties and central procurement across the GCC, from 8 franchise operators.',
    category: { industry: 'Food & beverage', subIndustry: 'F&B franchising' },
    regionIds: ['rg_gcc'],
    companyIds: ['co_bayt_burger'],
    priceCredits: 160,
    expertCount: 8,
    experts: [
      { role: 'Master franchisee, QSR', years: 17, region: 'GCC' },
      { role: 'Franchise development director', years: 12, region: 'UAE' },
    ],
    toc: [
      { id: 's1', title: 'Fee and royalty benchmarks', topics: ['franchise-fees'] },
      {
        id: 's2',
        title: 'Central procurement and approved suppliers',
        topics: ['procurement-model', 'suppliers'],
      },
      { id: 's3', title: 'Unit growth playbooks', topics: ['growth-drivers'] },
    ],
    publishedAt: '2026-04-09',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_ksa_saudisation',
    title: 'Saudisation in retail and F&B: quotas, costs and compliance',
    summary: 'What Nitaqat quotas mean for store staffing, wage costs and hiring timelines.',
    category: { industry: 'Cross-industry', subIndustry: 'Workforce' },
    regionIds: ['rg_ksa'],
    companyIds: [],
    priceCredits: 70,
    expertCount: 5,
    experts: [{ role: 'HR director, retail group', years: 15, region: 'KSA' }],
    toc: [
      { id: 's1', title: 'Quota bands for F&B and retail', topics: ['staffing', 'regulation'] },
      { id: 's2', title: 'Wage and hiring cost benchmarks', topics: ['staffing'] },
    ],
    publishedAt: '2026-03-15',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_ksa_grocery',
    title: 'Saudi grocery retail: share shifts and private label, 2024–2026',
    summary:
      'Which grocers are gaining share, how private label is changing margins, and what suppliers expect next.',
    category: { industry: 'Consumer retail', subIndustry: 'Grocery' },
    regionIds: ['rg_ksa'],
    companyIds: ['co_sahm_grocers'],
    priceCredits: 200,
    expertCount: 7,
    experts: [{ role: 'Former category director', years: 13, region: 'KSA' }],
    toc: [
      { id: 's1', title: 'Market share shifts', topics: ['competition', 'market-size'] },
      { id: 's2', title: 'Private label and pricing', topics: ['pricing'] },
      { id: 's3', title: 'Sahm Grocers: sales momentum', topics: ['sales-trend'] },
    ],
    publishedAt: '2026-08-28',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_ksa_cold_chain',
    title: 'Cold-chain logistics for dairy and fresh food in KSA',
    summary:
      'Providers, lead times and failure points in chilled distribution for cafés and grocers.',
    category: { industry: 'Logistics', subIndustry: 'Cold chain' },
    regionIds: ['rg_ksa'],
    companyIds: [],
    priceCredits: 120,
    expertCount: 6,
    experts: [{ role: 'Cold-chain operations manager', years: 10, region: 'KSA' }],
    toc: [
      { id: 's1', title: 'Provider landscape', topics: ['suppliers'] },
      { id: 's2', title: 'Delivery windows and lead times', topics: ['lead-times'] },
      { id: 's3', title: 'Common failure points', topics: ['operational-risk'] },
    ],
    publishedAt: '2026-02-11',
    provenance: PROVENANCE,
  },
  {
    id: 'lib_uae_retail',
    title: 'UAE consumer retail: footfall and spending, 2026',
    summary:
      'Footfall, basket size and category trends across UAE malls, with a view on Darb Retail Group.',
    category: { industry: 'Consumer retail', subIndustry: 'Fashion & home' },
    regionIds: ['rg_uae'],
    companyIds: ['co_darb_retail'],
    priceCredits: 130,
    expertCount: 6,
    experts: [{ role: 'Former merchandising head', years: 12, region: 'UAE' }],
    toc: [
      { id: 's1', title: 'Footfall and spend trends', topics: ['consumer-trends'] },
      {
        id: 's2',
        title: 'Darb Retail Group: trading update',
        topics: ['sales-trend', 'competition'],
      },
    ],
    publishedAt: '2026-09-20',
    provenance: PROVENANCE,
  },
];
