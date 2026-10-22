import type {
  CustomRequest,
  Quote,
  RequestQuestion,
  RequestStatus,
} from '@/features/custom-requests';
import type { AnonymousExpert, LibraryItem } from '@/features/library';
import { addDays } from '@/shared/lib/dates';
import { LIBRARY_ITEMS } from './library';
import { REPORT_CONTENT, type MockReport, type MockSection } from './reportContent';

/** A request as stored: the client-facing record plus its owner. */
export type StoredRequest = CustomRequest & { ownerId: string };

/** Experts who join requests as recruiting progresses (anonymous to clients). */
export const EXPERT_POOL: AnonymousExpert[] = [
  { role: 'Former regional operations director, coffee chain', years: 15, region: 'KSA' },
  { role: 'Procurement lead, café group', years: 9, region: 'Riyadh' },
  { role: 'Former franchise development manager', years: 12, region: 'GCC' },
  { role: 'Mall leasing manager', years: 10, region: 'KSA' },
  { role: 'Former finance director, F&B retailer', years: 14, region: 'UAE' },
  { role: 'Cold-chain operations manager', years: 8, region: 'KSA' },
  { role: 'Former category manager, grocery', years: 11, region: 'KSA' },
  { role: 'Licensing consultant', years: 13, region: 'Riyadh' },
];

export function newRequest(input: {
  id: string;
  ownerId: string;
  briefId: string | null;
  title: string;
  objective: string | null;
  questions: RequestQuestion[];
  now: Date;
}): StoredRequest {
  const at = input.now.toISOString();
  return {
    id: input.id,
    ownerId: input.ownerId,
    briefId: input.briefId,
    title: input.title,
    objective: input.objective,
    status: 'quote_requested',
    questions: input.questions,
    quote: null,
    timeline: [{ status: 'quote_requested', at, note: null }],
    messages: [],
    progress: { interviewsDone: 0, interviewsPlanned: 0, experts: [], estimatedDelivery: null },
    delivery: null,
    declineReason: null,
    createdAt: at,
    updatedAt: at,
  };
}

/** Scope, price and timeline an analyst would quote (mock: rules of thumb). */
export function buildQuote(request: StoredRequest, now: Date, version = 1): Quote {
  const inScope = request.questions.slice(0, 6);
  const out = request.questions.slice(6);
  const experts = Math.min(6, Math.max(3, inScope.length));
  return {
    version,
    credits: 60 + inScope.length * 30,
    experts,
    etaDays: 10,
    questionIdsIn: inScope.map((q) => q.id),
    questionsOut: out.map((q) => ({
      questionId: q.id,
      reason: 'More than a 6-expert study can answer well. Ask for it as a follow-up.',
    })),
    includes: [
      `${experts} recorded interviews with vetted, anonymous experts`,
      'A written report answering each question, with quotes',
      '“Ask this report” Q&A on the result',
      'Exclusive to you for 12 months',
    ],
    validUntil: addDays(now, 7).toISOString(),
    issuedAt: now.toISOString(),
    revisionNote: null,
  };
}

const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * 3_600_000);

/** A seeded request walked through its timeline: one entry per status, oldest first. */
function seeded(
  base: Omit<Parameters<typeof newRequest>[0], 'briefId' | 'now'> & { createdAt: Date },
  steps: { status: RequestStatus; at: Date; note?: string }[],
  patch: (request: StoredRequest) => Partial<StoredRequest> = () => ({}),
): StoredRequest {
  const request = newRequest({ ...base, briefId: null, now: base.createdAt });
  const quotedAt = steps.find((s) => s.status === 'quote_ready')?.at;
  const last = steps.at(-1);
  const withTimeline: StoredRequest = {
    ...request,
    status: last?.status ?? request.status,
    quote: quotedAt ? buildQuote(request, quotedAt) : null,
    timeline: [
      ...request.timeline,
      ...steps.map((s) => ({ status: s.status, at: s.at.toISOString(), note: s.note ?? null })),
    ],
    updatedAt: (last?.at ?? base.createdAt).toISOString(),
  };
  return { ...withTimeline, ...patch(withTimeline) };
}

/**
 * Each client has requests across the F4 lifecycle so the list, tracker and delivered report
 * can be tried without the goal chat. Ayesha's Qahwa House quote stays her most recent open
 * request, so the toolbar's request scenarios act on it first.
 */
export function seedRequests(now = new Date()): Record<string, StoredRequest> {
  const requests: StoredRequest[] = [
    seeded(
      {
        id: 'req_qahwa_pipeline',
        ownerId: 'usr_ayesha',
        title: 'Qahwa House: store pipeline and competitive response',
        objective:
          'Decide whether to join Qahwa House’s next funding round by judging how sustainable its store growth is.',
        questions: [
          {
            id: 'rq1',
            text: 'How have Qahwa House sales trended over the last 3 years?',
            topic: 'sales-trend',
          },
          {
            id: 'rq2',
            text: 'Which competitors are gaining share from Qahwa House, and why?',
            topic: 'competition',
          },
          {
            id: 'rq3',
            text: 'How do new stores perform against the established estate?',
            topic: 'growth-drivers',
          },
          {
            id: 'rq4',
            text: 'What are the main operational and supplier risks?',
            topic: 'operational-risk',
          },
        ],
        createdAt: addDays(now, -1),
      },
      [{ status: 'quote_ready', at: hoursAgo(now, 3) }],
    ),
    seeded(
      {
        id: 'req_jeddah_cold_chain',
        ownerId: 'usr_ayesha',
        title: 'Cold-chain capacity for café groups in Jeddah',
        objective:
          'Check whether a portfolio café group can supply 40 Jeddah stores from one central kitchen.',
        questions: [
          {
            id: 'rq1',
            text: 'Who supplies chilled dairy and bakery to café chains in Jeddah today?',
            topic: 'suppliers',
          },
          {
            id: 'rq2',
            text: 'How long does it take to commission a central kitchen with cold storage?',
            topic: 'lead-times',
          },
          {
            id: 'rq3',
            text: 'Do chains centralise procurement or let stores buy locally?',
            topic: 'procurement-model',
          },
        ],
        createdAt: hoursAgo(now, 9),
      },
      [],
    ),
    seeded(
      {
        id: 'req_riyadh_mall_leasing',
        ownerId: 'usr_ayesha',
        title: 'Riyadh mall leasing terms for specialty coffee',
        objective:
          'Stress-test the rent assumptions in a café roll-out plan across Riyadh’s tier-1 malls.',
        questions: [
          {
            id: 'rq1',
            text: 'What rent and service charges do tier-1 Riyadh malls ask of café tenants?',
            topic: 'rent',
          },
          {
            id: 'rq2',
            text: 'How much fit-out contribution do landlords give new F&B tenants?',
            topic: 'setup-costs',
          },
          {
            id: 'rq3',
            text: 'Which malls are adding F&B space in the next two years?',
            topic: 'growth-drivers',
          },
          {
            id: 'rq4',
            text: 'How long do mall approvals and handovers take?',
            topic: 'licensing',
          },
          {
            id: 'rq5',
            text: 'What turnover-rent clauses are now standard?',
            topic: 'pricing',
          },
        ],
        createdAt: addDays(now, -12),
      },
      [
        { status: 'quote_ready', at: addDays(now, -11) },
        { status: 'accepted', at: addDays(now, -10), note: '210 credits held' },
        { status: 'recruiting', at: addDays(now, -9) },
        { status: 'interviews', at: addDays(now, -6), note: '1 of 5 interviews done' },
      ],
      () => ({
        progress: {
          interviewsDone: 3,
          interviewsPlanned: 5,
          experts: EXPERT_POOL.slice(2, 7),
          estimatedDelivery: addDays(now, 4).toISOString(),
        },
        updatedAt: hoursAgo(now, 30).toISOString(),
      }),
    ),
    seeded(
      {
        id: 'req_gcc_coffee_pricing',
        ownerId: 'usr_ayesha',
        title: 'GCC coffee chains: pricing power and market share',
        objective:
          'Size the specialty coffee market in KSA and the UAE and see which chains can raise prices.',
        questions: [
          {
            id: 'rq1',
            text: 'How big is the specialty coffee market in KSA and the UAE?',
            topic: 'market-size',
          },
          {
            id: 'rq2',
            text: 'Which chains have raised prices in the last year without losing traffic?',
            topic: 'pricing',
          },
          {
            id: 'rq3',
            text: 'Which brands are winning share from international chains?',
            topic: 'competition',
          },
        ],
        createdAt: addDays(now, -34),
      },
      [
        { status: 'quote_ready', at: addDays(now, -33) },
        { status: 'accepted', at: addDays(now, -32), note: '150 credits held' },
        { status: 'recruiting', at: addDays(now, -31) },
        { status: 'interviews', at: addDays(now, -28), note: '1 of 3 interviews done' },
        { status: 'analysis', at: addDays(now, -23), note: 'All interviews done' },
        { status: 'delivered', at: addDays(now, -20) },
      ],
      (request) => ({
        progress: {
          interviewsDone: 3,
          interviewsPlanned: 3,
          experts: EXPERT_POOL.slice(0, 3),
          estimatedDelivery: addDays(now, -20).toISOString(),
        },
        delivery: {
          reportId: `cus_${request.id}`,
          partial: false,
          refundCredits: 0,
          rating: 5,
        },
      }),
    ),
    seeded(
      {
        id: 'req_dubai_cloud_kitchens',
        ownerId: 'usr_ayesha',
        title: 'Dubai cloud kitchens: licensing and delivery economics',
        objective: 'Judge whether a delivery-only brand can break even in Dubai within a year.',
        questions: [
          {
            id: 'rq1',
            text: 'Which licences does a delivery-only kitchen need in Dubai?',
            topic: 'licensing',
          },
          {
            id: 'rq2',
            text: 'What do Dubai cloud kitchen units rent for?',
            topic: 'rent',
          },
        ],
        createdAt: addDays(now, -19),
      },
      [
        { status: 'quote_ready', at: addDays(now, -18) },
        { status: 'expired', at: addDays(now, -11) },
      ],
    ),
    seeded(
      {
        id: 'req_riyadh_fitout',
        ownerId: 'usr_bilal',
        title: 'Fit-out costs for a second café in Riyadh',
        objective: 'Budget the fit-out and opening of a 120 m² franchise café in north Riyadh.',
        questions: [
          {
            id: 'rq1',
            text: 'What does fit-out cost for a 100–150 m² café in Riyadh?',
            topic: 'setup-costs',
          },
          {
            id: 'rq2',
            text: 'How long do equipment orders take to arrive?',
            topic: 'lead-times',
          },
          {
            id: 'rq3',
            text: 'Which suppliers do franchisees use for coffee and bakery?',
            topic: 'suppliers',
          },
          {
            id: 'rq4',
            text: 'Which permits do I need before opening, and how long do they take?',
            topic: 'licensing',
          },
        ],
        createdAt: addDays(now, -5),
      },
      [
        { status: 'quote_ready', at: addDays(now, -4) },
        { status: 'accepted', at: addDays(now, -3), note: '180 credits held' },
        { status: 'recruiting', at: addDays(now, -2) },
      ],
      () => ({
        progress: {
          interviewsDone: 0,
          interviewsPlanned: 4,
          experts: EXPERT_POOL.slice(0, 2),
          estimatedDelivery: addDays(now, 7).toISOString(),
        },
      }),
    ),
    seeded(
      {
        id: 'req_ksa_delivery_apps',
        ownerId: 'usr_bilal',
        title: 'Delivery app commissions for cafés in KSA',
        objective: 'Decide which delivery apps to list on and what commission to negotiate.',
        questions: [
          {
            id: 'rq1',
            text: 'What commission do the main delivery apps charge independent cafés?',
            topic: 'pricing',
          },
          {
            id: 'rq2',
            text: 'Which apps drive the most café orders in Riyadh?',
            topic: 'competition',
          },
          {
            id: 'rq3',
            text: 'How do cafés price menu items on apps versus in store?',
            topic: 'pricing',
          },
        ],
        createdAt: addDays(now, -16),
      },
      [
        { status: 'quote_ready', at: addDays(now, -15) },
        { status: 'accepted', at: addDays(now, -15), note: '150 credits held' },
        { status: 'recruiting', at: addDays(now, -14) },
        { status: 'interviews', at: addDays(now, -11), note: '1 of 3 interviews done' },
        { status: 'analysis', at: addDays(now, -3), note: 'All interviews done' },
      ],
      () => ({
        progress: {
          interviewsDone: 3,
          interviewsPlanned: 3,
          experts: EXPERT_POOL.slice(4, 7),
          estimatedDelivery: addDays(now, 2).toISOString(),
        },
      }),
    ),
    seeded(
      {
        id: 'req_dubai_second_branch',
        ownerId: 'usr_bilal',
        title: 'Dubai high-street rents for a second branch',
        objective: 'Pick the district for a second branch with rent under 15% of forecast sales.',
        questions: [
          {
            id: 'rq1',
            text: 'What do F&B units rent for on Dubai’s main high streets?',
            topic: 'rent',
          },
          {
            id: 'rq2',
            text: 'What fit-out and opening costs should I expect in Dubai?',
            topic: 'setup-costs',
          },
          {
            id: 'rq3',
            text: 'Which districts are seeing new café openings?',
            topic: 'growth-drivers',
          },
          {
            id: 'rq4',
            text: 'How long does a Dubai F&B trade licence take?',
            topic: 'licensing',
          },
        ],
        createdAt: addDays(now, -41),
      },
      [
        { status: 'quote_ready', at: addDays(now, -40) },
        { status: 'accepted', at: addDays(now, -39), note: '180 credits held' },
        { status: 'recruiting', at: addDays(now, -38) },
        { status: 'interviews', at: addDays(now, -35), note: '1 of 4 interviews done' },
        { status: 'analysis', at: addDays(now, -29), note: 'All interviews done' },
        {
          status: 'delivered',
          at: addDays(now, -26),
          note: '3 of 4 interviews; 45 credits refunded',
        },
      ],
      (request) => ({
        progress: {
          interviewsDone: 3,
          interviewsPlanned: 4,
          experts: EXPERT_POOL.slice(1, 4),
          estimatedDelivery: addDays(now, -26).toISOString(),
        },
        delivery: {
          reportId: `cus_${request.id}`,
          partial: true,
          refundCredits: 45,
          rating: null,
        },
      }),
    ),
    seeded(
      {
        id: 'req_kuwait_franchise',
        ownerId: 'usr_bilal',
        title: 'Franchising into Kuwait: partners and market size',
        objective: 'See whether Kuwait is worth a master-franchise deal in the next 18 months.',
        questions: [
          {
            id: 'rq1',
            text: 'How big is Kuwait’s café market and how fast is it growing?',
            topic: 'market-size',
          },
          {
            id: 'rq2',
            text: 'Which local groups take on master franchises?',
            topic: 'competition',
          },
        ],
        createdAt: addDays(now, -24),
      },
      [
        { status: 'quote_ready', at: addDays(now, -23) },
        { status: 'declined', at: addDays(now, -22), note: 'Too expensive' },
      ],
      () => ({ declineReason: 'Too expensive' }),
    ),
  ];
  return Object.fromEntries(requests.map((r) => [r.id, r]));
}

/** Reports for seeded delivered requests, keyed by report id, so they open in the F3 viewer. */
export function seedCustomReports(
  requests: Record<string, StoredRequest>,
): Record<string, { ownerId: string; item: LibraryItem; content: MockReport }> {
  return Object.fromEntries(
    Object.values(requests).flatMap((request) => {
      if (!request.delivery) return [];
      const experts = request.progress.experts.slice(0, request.progress.interviewsDone);
      const { item, content } = buildCustomReport(request, experts, new Date(request.updatedAt));
      return [[item.id, { ownerId: request.ownerId, item, content }]];
    }),
  );
}

/** Scripted analyst replies to questions about a quote (prototype). */
export function scriptedReply(text: string): string {
  const q = text.toLowerCase();
  if (/cheaper|price|budget|cost|expensive|discount/.test(q)) {
    return 'We can reduce the scope to 4 experts for about 15% less, with the same questions answered at less depth. Say the word and we’ll send a revised quote.';
  }
  if (/how long|time|faster|sooner|deadline|quick|urgent/.test(q)) {
    return 'The fastest we can do is 7 working days with 4 experts. Interviews usually start within 2 days of acceptance.';
  }
  if (/expert|who|background|qualif/.test(q)) {
    return 'We recruit former operators, suppliers and landlords who worked in the market in the last 3 years. You’ll see each expert’s role, experience and region — never their name.';
  }
  return 'Thanks — an analyst will reply within one working day. (Prototype: this is a scripted reply.)';
}

/** The first library section whose topic matches the question's topic. */
function sectionForTopic(topic: string): MockSection | null {
  for (const item of LIBRARY_ITEMS) {
    const toc = item.toc.find((s) => s.topics.includes(topic));
    const section = toc
      ? REPORT_CONTENT[item.id]?.sections.find((s) => s.id === toc.id)
      : undefined;
    if (section) return section;
  }
  return null;
}

/** The delivered custom report: one section per question, built from matching expert findings. */
export function buildCustomReport(
  request: StoredRequest,
  experts: AnonymousExpert[],
  now: Date,
): { item: LibraryItem; content: MockReport } {
  const inScope = request.questions.filter(
    (q) => request.quote?.questionIdsIn.includes(q.id) ?? true,
  );
  const sections: MockSection[] = inScope.map((question, index) => {
    const source = sectionForTopic(question.topic);
    return {
      id: `s${index + 1}`,
      title: question.text,
      summary:
        source?.summary ??
        'Experts agreed this needs local data: the interview notes below set out what to check and who to ask.',
      body: source?.body ?? [],
      figures: source?.figures ?? [],
      chart: source?.chart ?? null,
      quotes: source?.quotes ?? [],
      keywords: [...(source?.keywords ?? []), question.topic],
    };
  });
  const id = `cus_${request.id}`;
  const firstChart = sections.find((s) => s.chart)?.chart;
  return {
    item: {
      id,
      title: request.title,
      summary: request.objective ?? 'Custom research answering your brief’s questions.',
      category: { industry: 'Custom research', subIndustry: 'Exclusive to you' },
      regionIds: [],
      companyIds: [],
      priceCredits: request.quote?.credits ?? 1,
      expertCount: experts.length,
      experts,
      toc: sections.map((s) => ({ id: s.id, title: s.title, topics: s.keywords.slice(-1) })),
      publishedAt: now.toISOString().slice(0, 10),
      provenance: `Commissioned by you. Built from ${experts.length} recorded expert interviews and checked by Xpert Network analysts. Exclusive to you for 12 months.`,
    },
    content: {
      updatedAt: now.toISOString().slice(0, 10),
      updateNote: null,
      readMinutes: 6 + sections.length * 3,
      sampleChart: firstChart ?? {
        title: 'Interviews completed',
        unit: 'interviews',
        points: [{ label: 'Experts', value: experts.length }],
      },
      sections,
    },
  };
}
