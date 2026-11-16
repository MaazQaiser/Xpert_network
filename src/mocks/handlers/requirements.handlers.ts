import { http, HttpResponse } from 'msw';
import type { BriefRequirements, RequirementsEdits, ScreeningQuestion } from '@/features/admin';

/**
 * Briefs' requirements, for tests only: the browser lets /api/requirements through to the real
 * backend (ADR 0016). Scio's scripted "extract" answer (scio.handlers) stores a draft here.
 */

const AI_DRAFT: BriefRequirements['sections'] = [
  {
    key: 'who',
    title: 'Who we need',
    items: [
      {
        id: 'req_who',
        text: 'Procurement or supply chain leaders, manager level or above',
        source: 'Procurement, sourcing or supply chain leaders (manager level or above)',
        sourceFound: true,
      },
    ],
  },
  {
    key: 'must_have',
    title: 'Must have',
    items: [
      {
        id: 'req_gcc',
        text: 'Based in the GCC',
        source: 'Based in the UAE, Saudi Arabia, Qatar, Kuwait, Oman or Bahrain',
        sourceFound: true,
      },
      {
        id: 'req_years',
        text: 'At least 7 years in procurement',
        source: 'At least 7 years in procurement',
        sourceFound: false,
      },
    ],
  },
  { key: 'nice_to_have', title: 'Nice to have', items: [] },
  {
    key: 'exclude',
    title: 'Exclude',
    items: [
      {
        id: 'req_brandx',
        text: 'Current Brand X employees',
        source: 'Please exclude current employees of Brand X',
        sourceFound: true,
      },
    ],
  },
  { key: 'quotas', title: 'Quotas', items: [] },
  { key: 'logistics', title: 'Logistics', items: [] },
  {
    key: 'to_confirm',
    title: 'To confirm',
    items: [{ id: 'req_dates', text: 'Which dates next week?', source: null, sourceFound: false }],
  },
];

/** The email has no screener, so the AI suggests questions for what only asking can tell. */
const AI_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'q_openings',
    text: 'Have you been involved in opening new café or F&B locations?',
    answerType: 'single',
    options: [
      { text: 'Yes, in the last 3 years', disqualifies: false },
      { text: 'Yes, more than 3 years ago', disqualifies: false },
      { text: 'No', disqualifies: false },
    ],
    condition: null,
    note: null,
    origin: 'ai',
    source: 'Ideally involved in opening new locations or supplier setup for new markets',
    sourceFound: true,
  },
  {
    id: 'q_sourcing',
    text: 'Which of these have you sourced or negotiated directly?',
    answerType: 'multi',
    options: [
      { text: 'Green coffee', disqualifies: false },
      { text: 'Dairy', disqualifies: false },
      { text: 'None of these', disqualifies: true },
    ],
    condition: null,
    note: null,
    origin: 'ai',
    source: 'green coffee and dairy sourcing costs',
    sourceFound: true,
  },
];

/** The search plan made from the café brief: two profile filters, one web search, two columns. */
const PLAN: NonNullable<BriefRequirements['plan']> = {
  routes: [
    { requirementId: 'req_who', route: 'filter', questions: [] },
    { requirementId: 'req_gcc', route: 'filter', questions: [] },
    { requirementId: 'req_years', route: 'screening', questions: [] },
    { requirementId: 'req_brandx', route: 'screening', questions: [] },
    { requirementId: 'req_dates', route: 'none', questions: [] },
  ],
  columns: [
    {
      id: 'col_1',
      requirementId: 'req_who',
      label: 'Procurement leader',
      route: 'filter',
      group: null,
      counts: true,
    },
    {
      id: 'col_2',
      requirementId: 'req_gcc',
      label: 'In the GCC',
      route: 'filter',
      group: null,
      counts: true,
    },
  ],
  groups: [],
  filters: [
    {
      field: 'current_position_seniority_level',
      values: ['Manager', 'Head', 'Director', 'VP'],
      exclude: false,
      min: null,
      max: null,
      covers: ['req_who'],
    },
    {
      field: 'person_locations',
      values: ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain'],
      exclude: false,
      min: null,
      max: null,
      covers: ['req_gcc'],
    },
  ],
  queries: [
    {
      query: 'Coffee and café franchise operators with outlets across the GCC',
      purpose: 'companies',
      covers: ['req_who', 'req_gcc'],
    },
  ],
};

const BRIEF = {
  briefId: 'brief_gcc_cafe',
  company: 'Meridian Capital',
  attachment: null,
  subject: 'Experts needed: coffee franchise procurement in the GCC',
  summary: '3-5 GCC café procurement leaders for 60-minute calls next week',
};

let saved: Record<string, BriefRequirements> = {};
let drafts: Record<string, Pick<BriefRequirements, 'sections' | 'questions'>> = {};
let nextId = 1;

export function resetRequirements() {
  saved = {};
  drafts = {};
  nextId = 1;
}

/** Put a brief's requirements in place, as if they had been extracted (tests). */
export function seedRequirements(requirements: BriefRequirements) {
  saved[requirements.briefId] = structuredClone(requirements);
  drafts[requirements.briefId] = {
    sections: structuredClone(requirements.sections),
    questions: structuredClone(requirements.questions),
  };
}

/** Scio "extracts" the café brief: its draft, as the backend would save it. */
export function extractMockRequirements(): BriefRequirements {
  const now = new Date().toISOString();
  const requirements: BriefRequirements = {
    ...BRIEF,
    status: 'draft',
    edited: false,
    sections: structuredClone(AI_DRAFT),
    questions: structuredClone(AI_QUESTIONS),
    updatedAt: now,
    acceptedAt: null,
    icpCount: 5,
    planStatus: 'ready',
    planCurrent: true,
    plan: structuredClone(PLAN),
  };
  drafts[BRIEF.briefId] = {
    sections: structuredClone(AI_DRAFT),
    questions: structuredClone(AI_QUESTIONS),
  };
  saved[BRIEF.briefId] = requirements;
  return requirements;
}

const notFound = () =>
  HttpResponse.json(
    { code: 'not_found', message: 'These requirements haven’t been extracted yet.' },
    { status: 404 },
  );

export const requirementsHandlers = [
  http.get('/api/requirements/:id', ({ params }) => {
    const found = saved[String(params.id)];
    return found ? HttpResponse.json(found) : notFound();
  }),

  http.put('/api/requirements/:id', async ({ params, request }) => {
    const found = saved[String(params.id)];
    if (!found) return notFound();
    const edits = (await request.json()) as RequirementsEdits;
    const known = new Map(found.sections.flatMap((s) => s.items).map((i) => [i.id, i]));
    found.sections = found.sections.map((section) => {
      const edit = edits.sections.find((s) => s.key === section.key);
      return {
        ...section,
        items: (edit?.items ?? []).map((item) => {
          const before = item.id ? known.get(item.id) : undefined;
          return before
            ? { ...before, text: item.text }
            : { id: `req_new_${nextId++}`, text: item.text, source: null, sourceFound: false };
        }),
      };
    });
    if (edits.questions) {
      const before = new Map(found.questions.map((q) => [q.id, q]));
      found.questions = edits.questions.map((edit) => {
        const previous = edit.id ? before.get(edit.id) : undefined;
        return {
          ...edit,
          id: previous?.id ?? `q_new_${nextId++}`,
          origin: previous?.origin ?? 'pm',
          source: previous?.source ?? null,
          sourceFound: previous?.sourceFound ?? false,
        };
      });
    }
    if (edits.icpCount !== undefined) found.icpCount = edits.icpCount;
    // The mock's plan is remade at once, so it's never out of date.
    Object.assign(found, {
      edited: true,
      status: 'draft',
      acceptedAt: null,
      updatedAt: new Date().toISOString(),
      planStatus: 'ready',
      planCurrent: true,
    });
    return HttpResponse.json(found);
  }),

  http.post('/api/requirements/:id/accept', ({ params }) => {
    const found = saved[String(params.id)];
    if (!found) return notFound();
    Object.assign(found, { status: 'accepted', acceptedAt: new Date().toISOString() });
    return HttpResponse.json(found);
  }),

  http.post('/api/requirements/:id/revert', ({ params }) => {
    const id = String(params.id);
    const found = saved[id];
    if (!found) return notFound();
    Object.assign(found, {
      sections: structuredClone(drafts[id]?.sections ?? AI_DRAFT),
      questions: structuredClone(drafts[id]?.questions ?? AI_QUESTIONS),
      edited: false,
      status: 'draft',
      acceptedAt: null,
    });
    return HttpResponse.json(found);
  }),
];
