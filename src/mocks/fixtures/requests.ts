import type { CustomRequest, Quote, RequestQuestion } from '@/features/custom-requests';
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

/** Ayesha has a quote waiting, so the accept flow can be tried without the goal chat. */
export function seedRequests(now = new Date()): Record<string, StoredRequest> {
  const created = addDays(now, -2);
  const request = newRequest({
    id: 'req_qahwa_pipeline',
    ownerId: 'usr_ayesha',
    briefId: null,
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
    now: created,
  });
  const quoted = addDays(created, 1);
  return {
    [request.id]: {
      ...request,
      status: 'quote_ready',
      quote: buildQuote(request, quoted),
      timeline: [
        ...request.timeline,
        { status: 'quote_ready', at: quoted.toISOString(), note: null },
      ],
      updatedAt: quoted.toISOString(),
    },
  };
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
