import type { AnonymousExpert, Chart, ReportSection } from '@/features/library';

/** Section content plus the words the scripted Q&A engine matches questions against. */
export type MockSection = ReportSection & { keywords: string[] };

export type MockReport = {
  updatedAt: string;
  updateNote: string | null;
  readMinutes: number;
  sampleChart: Chart;
  sections: MockSection[];
};

const expert = (role: string, years: number, region: string): AnonymousExpert => ({
  role,
  years,
  region,
});

const fig = (label: string, value: string, note: string | null = null) => ({ label, value, note });

/**
 * Report bodies for the library fixtures (src/mocks/fixtures/library.ts). Companies and
 * figures are fictional but internally consistent, so usability tests feel real.
 */
export const REPORT_CONTENT: Record<string, MockReport> = {
  lib_riyadh_cafe_supply: {
    updatedAt: '2026-09-04',
    updateNote: null,
    readMinutes: 18,
    sampleChart: {
      title: 'Typical lead time by item, Riyadh (weeks)',
      unit: 'weeks',
      points: [
        { label: 'Espresso machine', value: 10 },
        { label: 'Grinders', value: 6 },
        { label: 'Fit-out', value: 9 },
        { label: 'Furniture', value: 7 },
        { label: 'Green coffee', value: 3 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Supplier landscape: coffee, dairy, bakery',
        summary:
          'Most Riyadh cafés buy coffee from 3–4 local roasters, dairy from two national brands, and bakery from central kitchens or wholesale bakeries.',
        body: [
          'Experts describe a concentrated supply base. Four Riyadh roasters supply roughly two thirds of independent and small-chain cafés; larger chains roast in-house or import roasted beans from the UAE. Switching roasters is common in the first year as operators tune flavour and price.',
          'Dairy is effectively a two-supplier market for cafés, with barista-grade milk priced 12–18% above retail equivalents. Bakery is the most fragmented category: new operators usually start with a wholesale bakery and move to a central kitchen once they pass four or five sites.',
        ],
        figures: [
          fig('Roasters supplying most cafés', '4', 'about two thirds of independents'),
          fig('Barista milk premium', '12–18%', 'over retail milk'),
          fig('Typical bakery lead time', '24–48 h', 'wholesale orders'),
        ],
        chart: null,
        quotes: [
          {
            id: 'q1',
            text: 'Everyone starts with the roaster who visits them first. By month nine, half have switched — usually over consistency, not price.',
            expert: expert('Procurement manager, café group', 9, 'Riyadh'),
          },
        ],
        keywords: [
          'supplier',
          'suppliers',
          'roaster',
          'coffee',
          'dairy',
          'milk',
          'bakery',
          'buy',
          'source',
          'sourcing',
          'vendor',
        ],
      },
      {
        id: 's2',
        title: 'Lead times for equipment and fit-out',
        summary:
          'Plan 10–12 weeks for espresso equipment and 8–10 weeks for fit-out; ordering equipment before the lease is signed is the most common way operators save a month.',
        body: [
          'Imported espresso machines are the long pole: distributors quote 8–12 weeks from order to installation, longer before Ramadan and in Q4. Grinders and refrigeration usually arrive within 6 weeks.',
          'Fit-out typically takes 8–10 weeks once permits are in hand. Experts warn that municipality approvals for signage and façade changes add 2–4 weeks if they are not filed in parallel with the fit-out drawings.',
        ],
        figures: [
          fig('Espresso machine', '8–12 weeks', 'order to installation'),
          fig('Fit-out', '8–10 weeks', 'after permits'),
          fig('Signage approval', '+2–4 weeks', 'if filed late'),
        ],
        chart: {
          title: 'Typical lead time by item, Riyadh (weeks)',
          unit: 'weeks',
          points: [
            { label: 'Espresso machine', value: 10 },
            { label: 'Grinders', value: 6 },
            { label: 'Fit-out', value: 9 },
            { label: 'Furniture', value: 7 },
            { label: 'Green coffee', value: 3 },
          ],
        },
        quotes: [
          {
            id: 'q2',
            text: 'The machine is never the problem you plan for. It is the customs paperwork and the electrician who has to upgrade the supply.',
            expert: expert('Espresso equipment distributor', 15, 'KSA'),
          },
        ],
        keywords: [
          'lead time',
          'lead times',
          'how long',
          'weeks',
          'timeline',
          'delay',
          'equipment',
          'machine',
          'espresso',
          'fit-out',
          'fitout',
          'install',
          'opening date',
        ],
      },
      {
        id: 's3',
        title: 'Fit-out and opening costs for 80–150 m² cafés',
        summary:
          'An 80–150 m² café costs SAR 0.9–1.6 million to open, with fit-out about half of the total and equipment about a fifth.',
        body: [
          'Across the operators interviewed, opening budgets ranged from SAR 0.9 million for an 80 m² high-street unit to SAR 1.6 million for a 150 m² mall unit. Fit-out (SAR 3,500–5,500 per m²) is the largest line, followed by equipment and pre-opening costs.',
          'Mall landlords increasingly offer fit-out contributions of SAR 500–1,000 per m² for recognised brands, which experts say is worth negotiating before agreeing on base rent.',
        ],
        figures: [
          fig('Total opening cost', 'SAR 0.9–1.6m', '80–150 m²'),
          fig('Fit-out', 'SAR 3,500–5,500 / m²', null),
          fig('Landlord contribution', 'SAR 500–1,000 / m²', 'brands, malls'),
        ],
        chart: {
          title: 'Opening budget split, 120 m² café (%)',
          unit: '%',
          points: [
            { label: 'Fit-out', value: 48 },
            { label: 'Equipment', value: 21 },
            { label: 'Pre-opening & staff', value: 14 },
            { label: 'Deposits & fees', value: 10 },
            { label: 'Contingency', value: 7 },
          ],
        },
        quotes: [
          {
            id: 'q3',
            text: 'If your contractor quotes under 3,500 a square metre, ask what they left out. Usually it is the MEP work.',
            expert: expert('Fit-out contractor', 12, 'Riyadh'),
          },
        ],
        keywords: [
          'cost',
          'costs',
          'budget',
          'price',
          'expensive',
          'capex',
          'investment',
          'sar',
          'how much',
          'fit-out',
          'square metre',
          'opening cost',
          'landlord',
        ],
      },
      {
        id: 's4',
        title: 'Central vs. local procurement models',
        summary:
          'Operators below five sites buy locally; above that, a central buyer and a small warehouse typically cut cost of goods by 3–5 points.',
        body: [
          'Small operators rely on supplier deliveries direct to store. Experts see the switch to central procurement happen between five and eight sites, when a dedicated buyer and a shared dry-goods store start to pay back.',
          'Franchisees of international brands usually must buy from approved suppliers, which limits local savings but simplifies quality control.',
        ],
        figures: [
          fig('Switch point', '5–8 sites', null),
          fig('COGS saving', '3–5 pts', 'after centralising'),
        ],
        chart: null,
        quotes: [
          {
            id: 'q4',
            text: 'At six stores we hired one buyer and saved her salary in three months on milk alone.',
            expert: expert('Procurement manager, café group', 9, 'Riyadh'),
          },
        ],
        keywords: [
          'procurement',
          'central',
          'centralise',
          'warehouse',
          'franchise',
          'approved suppliers',
          'cogs',
          'margin',
          'scale',
        ],
      },
    ],
  },

  lib_qahwa_ops: {
    updatedAt: '2026-06-30',
    updateNote: null,
    readMinutes: 22,
    sampleChart: {
      title: 'Qahwa House average weekly sales per store (SAR ’000)',
      unit: 'SAR ’000',
      points: [
        { label: '2023', value: 61 },
        { label: '2024', value: 66 },
        { label: '2025', value: 64 },
        { label: 'H1 2026', value: 59 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Store-level sales trajectory 2023–2026',
        summary:
          'Average weekly sales per store rose to SAR 66k in 2024, then slipped to about SAR 59k in H1 2026 as new stores opened in weaker locations.',
        body: [
          'Former area managers describe strong 2023–2024 trading driven by delivery and new drinks. From 2025 the average store weakened: like-for-like sales were roughly flat, but the 30-plus stores opened since 2024 trade 15–25% below the network average.',
          'In the UAE, sales held up better than in KSA, helped by mall locations and higher tourist footfall.',
        ],
        figures: [
          fig('Peak weekly sales / store', 'SAR 66k', '2024'),
          fig('H1 2026 weekly sales / store', 'SAR 59k', null),
          fig('New stores vs. network', '−15 to −25%', 'opened since 2024'),
        ],
        chart: {
          title: 'Average weekly sales per store (SAR ’000)',
          unit: 'SAR ’000',
          points: [
            { label: '2023', value: 61 },
            { label: '2024', value: 66 },
            { label: '2025', value: 64 },
            { label: 'H1 2026', value: 59 },
          ],
        },
        quotes: [
          {
            id: 'q1',
            text: 'The old stores are fine. The problem is we opened forty in two years and half of them are in the wrong street.',
            expert: expert('Former area manager', 8, 'KSA'),
          },
        ],
        keywords: [
          'sales',
          'revenue',
          'trend',
          'trajectory',
          'growth',
          'declining',
          'decline',
          'performance',
          'trading',
          'like-for-like',
          'lfl',
          'weekly',
        ],
      },
      {
        id: 's2',
        title: 'Unit economics: ticket, footfall, margin ranges',
        summary:
          'Average ticket is SAR 27–31; mature stores earn 18–22% store-level margin, new stores 8–12%.',
        body: [
          'The average ticket has risen about 9% since 2023, mostly through price increases rather than more items per order. Footfall per store fell slightly over the same period.',
          'Experts estimate mature stores at 18–22% store-level EBITDA margin. Newer stores, carrying higher rents and lower sales, sit at 8–12% and some are loss-making in their first year.',
        ],
        figures: [
          fig('Average ticket', 'SAR 27–31', null),
          fig('Mature store margin', '18–22%', 'store-level EBITDA'),
          fig('New store margin', '8–12%', 'first two years'),
        ],
        chart: null,
        quotes: [
          {
            id: 'q2',
            text: 'Price did the heavy lifting. Customers are paying more per visit but coming slightly less often.',
            expert: expert('Former finance business partner', 10, 'UAE'),
          },
        ],
        keywords: [
          'margin',
          'margins',
          'profit',
          'profitability',
          'ebitda',
          'ticket',
          'basket',
          'footfall',
          'unit economics',
          'economics',
          'price',
        ],
      },
      {
        id: 's3',
        title: 'New stores vs. like-for-like growth',
        summary:
          'Nearly all 2025–2026 sales growth came from new stores; like-for-like growth was flat to slightly negative.',
        body: [
          'Experts attribute about 90% of revenue growth since 2025 to new openings. Like-for-like sales were between −2% and +1% depending on region.',
          'Opening pace slowed in 2026 as management focused on closing or relocating the weakest units.',
        ],
        figures: [
          fig('Growth from new stores', '≈ 90%', 'since 2025'),
          fig('Like-for-like', '−2% to +1%', '2025–2026'),
        ],
        chart: null,
        quotes: [],
        keywords: [
          'new stores',
          'openings',
          'expansion',
          'like-for-like',
          'lfl',
          'growth',
          'store count',
          'pipeline',
        ],
      },
      {
        id: 's4',
        title: 'Operational and supplier risks',
        summary:
          'The main risks are dependence on one dairy supplier, staff turnover above 60% a year, and slower openings tying up capital.',
        body: [
          'One dairy supplier provides most of the milk; a 2025 price rise of 11% went straight to margin. Barista turnover is high, which experts link to inconsistent drinks in newer stores.',
          'Former managers also flag that relocating weak stores is expensive, with break fees and new fit-out costs.',
        ],
        figures: [
          fig('Staff turnover', '> 60% a year', 'baristas'),
          fig('2025 dairy price rise', '11%', null),
        ],
        chart: null,
        quotes: [
          {
            id: 'q3',
            text: 'We had one milk supplier for 140 stores. When they raised prices we just had to take it.',
            expert: expert('Dairy supplier account lead', 12, 'KSA'),
          },
        ],
        keywords: [
          'risk',
          'risks',
          'problem',
          'problems',
          'concern',
          'downside',
          'supplier',
          'dairy',
          'staff',
          'turnover',
          'operational',
        ],
      },
    ],
  },

  lib_gcc_coffee_2026: {
    updatedAt: '2026-08-12',
    updateNote: null,
    readMinutes: 20,
    sampleChart: {
      title: 'Specialty coffee market growth, 2025–2026 (%)',
      unit: '%',
      points: [
        { label: 'KSA', value: 14 },
        { label: 'UAE', value: 9 },
        { label: 'Qatar', value: 7 },
        { label: 'Kuwait', value: 6 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Market size and growth by country',
        summary:
          'Saudi Arabia is the fastest-growing specialty coffee market in the Gulf at about 14% a year; the UAE grows about 9%.',
        body: [
          'Experts size the GCC specialty coffee market at roughly USD 3.1 billion in 2026. Saudi Arabia accounts for just over half and is growing fastest, helped by new mixed-use districts and a young population.',
          'Growth in the UAE is steadier, with more premium formats and drive-through openings outside Dubai.',
        ],
        figures: [
          fig('GCC market, 2026', '≈ USD 3.1bn', null),
          fig('KSA growth', '≈ 14% a year', null),
          fig('UAE growth', '≈ 9% a year', null),
        ],
        chart: {
          title: 'Market growth 2025–2026 (%)',
          unit: '%',
          points: [
            { label: 'KSA', value: 14 },
            { label: 'UAE', value: 9 },
            { label: 'Qatar', value: 7 },
            { label: 'Kuwait', value: 6 },
          ],
        },
        quotes: [],
        keywords: [
          'market size',
          'size',
          'growth',
          'how big',
          'market',
          'country',
          'saudi',
          'ksa',
          'uae',
          'demand',
        ],
      },
      {
        id: 's2',
        title: 'Competitive landscape and share shifts',
        summary:
          'Local chains such as Qahwa House are taking share from international brands, especially in Saudi Arabia.',
        body: [
          'International chains still lead in malls and airports, but experts see local chains winning on price and on local tastes. Qahwa House is the largest local chain in KSA by store count.',
          'Independent specialty cafés remain strong in Riyadh and Jeddah, though rising rents are pushing some into partnerships with roasters.',
        ],
        figures: [fig('Largest local chain, KSA', 'Qahwa House', '≈ 140 stores')],
        chart: null,
        quotes: [
          {
            id: 'q1',
            text: 'Five years ago the international brands set the price. Now the local chains do, and the internationals follow.',
            expert: expert('Former regional director, coffee chain', 14, 'KSA'),
          },
        ],
        keywords: [
          'competition',
          'competitive',
          'competitor',
          'competitors',
          'share',
          'market share',
          'rivals',
          'qahwa',
          'chains',
          'brands',
          'position',
        ],
      },
      {
        id: 's3',
        title: 'Pricing ladders and average ticket',
        summary:
          'A flat white costs SAR 16–22 at local chains and SAR 21–27 at international chains; average tickets are rising mainly through price.',
        body: [
          'Experts mapped price ladders across 12 chains. Local chains price 15–20% below international brands on core drinks but have closed the gap on seasonal specials.',
        ],
        figures: [
          fig('Flat white, local chains', 'SAR 16–22', null),
          fig('Flat white, international', 'SAR 21–27', null),
        ],
        chart: null,
        quotes: [],
        keywords: ['price', 'pricing', 'prices', 'ticket', 'expensive', 'cheap', 'menu'],
      },
      {
        id: 's4',
        title: 'Customer perception of leading brands',
        summary:
          'Customers see local chains as better value and more local; international brands still win on consistency.',
        body: [
          'Landlords and operators report that younger customers in KSA increasingly prefer local brands, while office workers in the UAE still favour international chains for consistency and loyalty programmes.',
        ],
        figures: [],
        chart: null,
        quotes: [
          {
            id: 'q2',
            text: 'When a local brand opens next to an international one in our mall, the local one has the queue.',
            expert: expert('Mall leasing manager', 9, 'KSA'),
          },
        ],
        keywords: [
          'brand',
          'brands',
          'perception',
          'customers',
          'consumer',
          'loyalty',
          'reputation',
          'preference',
        ],
      },
    ],
  },

  lib_ksa_fnb_licensing: {
    updatedAt: '2026-07-18',
    updateNote: null,
    readMinutes: 9,
    sampleChart: {
      title: 'Typical licensing timeline by city (weeks)',
      unit: 'weeks',
      points: [
        { label: 'Riyadh', value: 7 },
        { label: 'Jeddah', value: 8 },
        { label: 'Dammam', value: 6 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Licence and permit checklist',
        summary:
          'A new café needs a commercial registration, a municipality licence, civil defence approval and a food establishment permit.',
        body: [
          'Consultants list five core approvals: commercial registration, municipality (Balady) licence, civil defence safety certificate, food establishment permit, and signage approval. Most can be filed online, but inspections are in person.',
        ],
        figures: [fig('Core approvals', '5', null)],
        chart: null,
        quotes: [],
        keywords: [
          'licence',
          'license',
          'permit',
          'permits',
          'approval',
          'approvals',
          'registration',
          'balady',
          'civil defence',
          'regulation',
          'legal',
        ],
      },
      {
        id: 's2',
        title: 'Typical approval timelines by city',
        summary: 'Expect 6–8 weeks end to end, longest in Jeddah because of inspection backlogs.',
        body: [
          'Filing approvals in parallel with fit-out is the main way operators avoid delays. Inspection slots in Jeddah were the most frequent bottleneck in 2026.',
        ],
        figures: [fig('End-to-end licensing', '6–8 weeks', null)],
        chart: {
          title: 'Typical licensing timeline (weeks)',
          unit: 'weeks',
          points: [
            { label: 'Riyadh', value: 7 },
            { label: 'Jeddah', value: 8 },
            { label: 'Dammam', value: 6 },
          ],
        },
        quotes: [
          {
            id: 'q1',
            text: 'Book the civil defence inspection the day your fire system is in. Waiting a week costs you three.',
            expert: expert('Licensing consultant', 11, 'Riyadh'),
          },
        ],
        keywords: ['how long', 'timeline', 'weeks', 'delay', 'lead time', 'inspection', 'city'],
      },
      {
        id: 's3',
        title: 'Recent regulatory changes',
        summary: 'Recent changes moved most filings online and tightened signage rules in Riyadh.',
        body: [
          'Experts note that the 2025 move to unified online filing cut paperwork, while new Riyadh signage guidelines require Arabic-first lettering and pre-approval of illuminated signs.',
        ],
        figures: [],
        chart: null,
        quotes: [],
        keywords: ['change', 'changes', 'new rules', 'regulation', 'signage', 'online'],
      },
    ],
  },

  lib_dubai_rents: {
    updatedAt: '2026-05-22',
    updateNote: null,
    readMinutes: 8,
    sampleChart: {
      title: 'F&B rent by location (AED per sq ft per year)',
      unit: 'AED',
      points: [
        { label: 'Prime mall', value: 520 },
        { label: 'Community mall', value: 260 },
        { label: 'High street', value: 310 },
        { label: 'Business district', value: 380 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Rent ranges by district and mall tier',
        summary:
          'Prime mall F&B units rent for AED 450–600 per sq ft a year; community malls for AED 220–300.',
        body: [
          'Leasing managers describe a wide spread between prime and community malls. High-street units in Jumeirah and City Walk sit in between, with turnover rent clauses common.',
        ],
        figures: [
          fig('Prime mall', 'AED 450–600 / sq ft', 'per year'),
          fig('Community mall', 'AED 220–300 / sq ft', 'per year'),
        ],
        chart: null,
        quotes: [],
        keywords: [
          'rent',
          'rents',
          'lease',
          'cost',
          'mall',
          'district',
          'location',
          'sq ft',
          'aed',
        ],
      },
      {
        id: 's2',
        title: 'Lease terms and fit-out contributions',
        summary:
          'Five-year terms with 2–3 rent-free months and fit-out contributions are standard for brands.',
        body: [
          'Landlords offer 2–3 rent-free months for fit-out and contributions of AED 50–150 per sq ft for recognised brands. Turnover rent of 8–12% above a base is common in prime malls.',
        ],
        figures: [
          fig('Rent-free period', '2–3 months', null),
          fig('Turnover rent', '8–12%', 'prime malls'),
        ],
        chart: null,
        quotes: [
          {
            id: 'q1',
            text: 'Everything is negotiable except the turnover clause in the top malls.',
            expert: expert('Retail leasing director', 13, 'Dubai'),
          },
        ],
        keywords: [
          'lease',
          'terms',
          'rent-free',
          'fit-out',
          'contribution',
          'turnover rent',
          'negotiate',
          'landlord',
        ],
      },
    ],
  },

  lib_gcc_franchise_models: {
    updatedAt: '2026-04-09',
    updateNote: null,
    readMinutes: 14,
    sampleChart: {
      title: 'Royalty rates in GCC F&B franchising (% of sales)',
      unit: '%',
      points: [
        { label: 'Coffee', value: 6 },
        { label: 'QSR', value: 5 },
        { label: 'Casual dining', value: 4.5 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Fee and royalty benchmarks',
        summary:
          'Master franchise fees range from USD 250k to 1.5m; royalties are 4–7% of sales plus a 1–2% marketing levy.',
        body: [
          'Operators describe royalties of 5–7% for coffee and QSR brands and slightly lower for casual dining. Development schedules with penalties for missed openings are standard.',
        ],
        figures: [fig('Royalty', '4–7% of sales', null), fig('Marketing levy', '1–2%', null)],
        chart: null,
        quotes: [],
        keywords: [
          'fee',
          'fees',
          'royalty',
          'royalties',
          'franchise',
          'cost',
          'master franchise',
          'levy',
        ],
      },
      {
        id: 's2',
        title: 'Central procurement and approved suppliers',
        summary:
          'Most brands require approved suppliers; savings come from regional logistics rather than prices.',
        body: [
          'Franchisees buy key ingredients from brand-approved suppliers, often through a regional distributor. Experts say the biggest savings come from consolidating deliveries, not renegotiating unit prices.',
        ],
        figures: [],
        chart: null,
        quotes: [],
        keywords: [
          'procurement',
          'suppliers',
          'approved',
          'supply chain',
          'logistics',
          'distributor',
        ],
      },
      {
        id: 's3',
        title: 'Unit growth playbooks',
        summary:
          'Successful master franchisees open a flagship, then expand into community malls and drive-throughs.',
        body: [
          'Growth playbooks start with one high-visibility flagship, followed by smaller formats. Bayt Burger is cited as an example of drive-through-led growth in KSA.',
        ],
        figures: [],
        chart: null,
        quotes: [],
        keywords: [
          'growth',
          'expansion',
          'playbook',
          'openings',
          'format',
          'drive-through',
          'bayt burger',
        ],
      },
    ],
  },

  lib_ksa_saudisation: {
    updatedAt: '2026-03-15',
    updateNote: null,
    readMinutes: 7,
    sampleChart: {
      title: 'Required Saudi share of staff by band (%)',
      unit: '%',
      points: [
        { label: 'Low green', value: 18 },
        { label: 'Mid green', value: 24 },
        { label: 'High green', value: 30 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Quota bands for F&B and retail',
        summary:
          'Small cafés need roughly 18–30% Saudi staff to stay in a green Nitaqat band, depending on size.',
        body: [
          'Experts explain how Nitaqat bands depend on company size and activity. Café groups with 10–49 staff typically need 18–30% Saudi nationals.',
        ],
        figures: [fig('Saudi share for green band', '18–30%', '10–49 staff')],
        chart: null,
        quotes: [],
        keywords: ['saudisation', 'nitaqat', 'quota', 'staff', 'hiring', 'regulation', 'nationals'],
      },
      {
        id: 's2',
        title: 'Wage and hiring cost benchmarks',
        summary: 'Saudi baristas earn SAR 4,500–6,000 a month; hiring takes 3–5 weeks.',
        body: [
          'Wages for Saudi baristas and shift leads have risen 8–10% since 2024. Hiring support programmes can subsidise part of the first year’s wages.',
        ],
        figures: [fig('Saudi barista wage', 'SAR 4,500–6,000 / month', null)],
        chart: null,
        quotes: [],
        keywords: ['wage', 'wages', 'salary', 'cost', 'hiring', 'staff', 'barista', 'labour'],
      },
    ],
  },

  lib_ksa_grocery: {
    updatedAt: '2026-08-28',
    updateNote: null,
    readMinutes: 16,
    sampleChart: {
      title: 'Saudi grocery market share, 2026 (%)',
      unit: '%',
      points: [
        { label: 'Leader A', value: 21 },
        { label: 'Sahm Grocers', value: 9 },
        { label: 'Leader B', value: 14 },
        { label: 'Others', value: 56 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Market share shifts',
        summary:
          'Discount and mid-size grocers gained about 2 points of share since 2024; hypermarkets lost ground.',
        body: [
          'Experts describe a shift from hypermarkets to neighbourhood supermarkets and discounters. Sahm Grocers holds about 9% share, up from 8% in 2024.',
        ],
        figures: [fig('Sahm Grocers share', '≈ 9%', 'up from 8% in 2024')],
        chart: null,
        quotes: [],
        keywords: ['share', 'market share', 'competition', 'competitors', 'market', 'hypermarket'],
      },
      {
        id: 's2',
        title: 'Private label and pricing',
        summary:
          'Private label is about 12% of sales and carries 6–10 points more margin than brands.',
        body: [
          'Suppliers say grocers are pushing private label in staples, which pressures branded suppliers on price and promotions.',
        ],
        figures: [fig('Private label share of sales', '≈ 12%', null)],
        chart: null,
        quotes: [],
        keywords: ['private label', 'pricing', 'price', 'margin', 'brands', 'promotion'],
      },
      {
        id: 's3',
        title: 'Sahm Grocers: sales momentum',
        summary:
          'Sahm Grocers grew sales about 7% in 2025, mostly from new stores in the Eastern Province.',
        body: [
          'Former employees describe steady like-for-like growth of 2–3% and an active opening programme, with execution risks in fresh food.',
        ],
        figures: [fig('2025 sales growth', '≈ 7%', null)],
        chart: null,
        quotes: [
          {
            id: 'q1',
            text: 'The new Eastern Province stores are doing better than Riyadh did at the same age.',
            expert: expert('Former regional operations manager', 11, 'KSA'),
          },
        ],
        keywords: ['sahm', 'sales', 'growth', 'trend', 'momentum', 'performance', 'stores'],
      },
    ],
  },

  lib_ksa_cold_chain: {
    updatedAt: '2026-02-11',
    updateNote: null,
    readMinutes: 11,
    sampleChart: {
      title: 'Delivery lead time for chilled goods (days)',
      unit: 'days',
      points: [
        { label: 'Riyadh', value: 1 },
        { label: 'Jeddah', value: 2 },
        { label: 'Secondary cities', value: 3 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Provider landscape',
        summary:
          'Three national 3PLs handle most chilled distribution; regional players fill gaps in secondary cities.',
        body: [
          'Cafés and grocers mostly rely on national third-party logistics providers with refrigerated fleets, while dairy brands run their own trucks.',
        ],
        figures: [fig('National chilled 3PLs', '3', null)],
        chart: null,
        quotes: [],
        keywords: [
          'provider',
          'providers',
          'logistics',
          '3pl',
          'cold chain',
          'supplier',
          'suppliers',
          'distribution',
        ],
      },
      {
        id: 's2',
        title: 'Delivery windows and lead times',
        summary: 'Next-day chilled delivery is standard in Riyadh; secondary cities take 2–3 days.',
        body: [
          'Experts recommend two delivery windows a day for high-volume cafés to keep milk stock low.',
        ],
        figures: [fig('Riyadh chilled delivery', 'Next day', null)],
        chart: null,
        quotes: [],
        keywords: ['lead time', 'delivery', 'how long', 'days', 'window', 'schedule'],
      },
      {
        id: 's3',
        title: 'Common failure points',
        summary: 'Temperature breaks happen most at store receiving, not in transit.',
        body: [
          'Experts say most spoilage happens when deliveries wait at the back door during busy hours. Simple receiving checklists cut waste noticeably.',
        ],
        figures: [],
        chart: null,
        quotes: [
          {
            id: 'q1',
            text: 'The truck is cold. The loading bay at 2pm in July is not.',
            expert: expert('Cold-chain operations manager', 10, 'KSA'),
          },
        ],
        keywords: ['risk', 'risks', 'failure', 'spoilage', 'waste', 'problem', 'temperature'],
      },
    ],
  },

  lib_uae_retail: {
    updatedAt: '2026-10-10',
    updateNote: 'Section 2 now includes Darb Retail Group’s Q3 2026 trading figures.',
    readMinutes: 12,
    sampleChart: {
      title: 'UAE mall footfall vs. 2025 (%)',
      unit: '%',
      points: [
        { label: 'Q1', value: 3 },
        { label: 'Q2', value: 5 },
        { label: 'Q3', value: 4 },
      ],
    },
    sections: [
      {
        id: 's1',
        title: 'Footfall and spend trends',
        summary: 'Mall footfall is up 3–5% on 2025 while average spend per visit is flat.',
        body: [
          'Experts see growth in visits driven by tourism and population growth, but shoppers are spending about the same per visit, with more spent on food and leisure than on fashion.',
        ],
        figures: [fig('Mall footfall', '+3–5%', 'vs. 2025'), fig('Spend per visit', 'Flat', null)],
        chart: {
          title: 'Mall footfall vs. 2025 (%)',
          unit: '%',
          points: [
            { label: 'Q1', value: 3 },
            { label: 'Q2', value: 5 },
            { label: 'Q3', value: 4 },
          ],
        },
        quotes: [],
        keywords: [
          'footfall',
          'spend',
          'spending',
          'consumer',
          'customers',
          'trend',
          'trends',
          'mall',
        ],
      },
      {
        id: 's2',
        title: 'Darb Retail Group: trading update',
        summary:
          'Darb Retail Group’s Q3 2026 sales rose about 6%, led by home rather than fashion.',
        body: [
          'Former employees describe a shift in mix towards home furnishings, which grew double digits, while fashion was flat. Margins improved slightly on fewer markdowns.',
        ],
        figures: [fig('Q3 2026 sales growth', '≈ 6%', null)],
        chart: null,
        quotes: [
          {
            id: 'q1',
            text: 'Home carried the quarter. Fashion just held its ground.',
            expert: expert('Former category manager', 9, 'UAE'),
          },
        ],
        keywords: [
          'darb',
          'sales',
          'trading',
          'growth',
          'competition',
          'performance',
          'results',
          'q3',
        ],
      },
    ],
  },
};
