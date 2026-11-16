import { http, HttpResponse } from 'msw';
import type { Search, SearchEvent, SearchPerson, SearchStatus } from '@/features/admin';

/**
 * People searches, for tests only: the browser lets /api/searches through to the real backend
 * (ADR 0016). Each search plays a script: the first stream that connects starts it, every
 * stream gets a snapshot then each change, and it ends with `done`.
 */

type Step = Extract<SearchEvent, { type: 'person' | 'progress' }>;

export type SearchScript = {
  /** The search as it starts: columns, groups, target; no people yet. */
  base: Pick<Search, 'columns' | 'groups' | 'target' | 'progress' | 'cost'>;
  steps: Step[];
  /** How it ends when nobody presses Stop. */
  end: { status: Exclude<SearchStatus, 'running'>; note: string | null };
  /** Pause before this step (or, at `steps.length`, before ending) until Stop is pressed. */
  waitForStopBefore?: number;
  /** Time between steps. */
  stepMs?: number;
};

type Entry = {
  search: Search;
  conversationId: string | null;
  script: SearchScript;
  started: boolean;
  stopRequested: boolean;
  listeners: Set<(event: SearchEvent) => void>;
  wake: () => void;
};

const STEP_MS = 40;

const person = (fields: Partial<SearchPerson> & Pick<SearchPerson, 'id' | 'name'>) =>
  ({
    linkedinUrl: null,
    email: null,
    phone: null,
    title: null,
    company: null,
    location: null,
    source: 'fullenrich',
    sourceUrl: null,
    verdicts: {},
    isMatch: false,
    profileGroup: null,
    hasContact: true,
    addedAt: '2026-11-16T10:00:00+00:00',
    ...fields,
  }) satisfies SearchPerson;

const match = (reason: string, references: string[] = []) => ({
  verdict: 'match' as const,
  reason,
  references,
});

/** The café brief: two procurement leaders in the GCC, one from each source. */
export const CAFE_SEARCH: SearchScript = {
  base: {
    target: 2,
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
    progress: { matches: 0, byGroup: [], done: false, analysed: 0 },
    cost: { exaDollars: 0, fullenrichCredits: 0, fullenrichDollars: 0, totalDollars: 0 },
  },
  steps: [
    {
      type: 'person',
      person: person({
        id: 'p_omar',
        name: 'Omar Khalid',
        title: 'Head of Procurement',
        company: 'Brew Lane Coffee',
        location: 'Dubai, United Arab Emirates',
        linkedinUrl: 'https://www.linkedin.com/in/omar-khalid-procurement',
        verdicts: {
          col_1: match('Head of Procurement for a café chain.'),
          col_2: match('Based in Dubai.'),
        },
        isMatch: true,
      }),
    },
    {
      type: 'progress',
      progress: { matches: 1, byGroup: [], done: false, analysed: 20 },
      cost: { exaDollars: 0.1, fullenrichCredits: 5, fullenrichDollars: 0.24, totalDollars: 0.34 },
      status: 'running',
      note: null,
    },
    {
      type: 'person',
      person: person({
        id: 'p_reem',
        name: 'Reem Al-Saud',
        title: 'Procurement Director',
        company: 'Arabica House',
        location: 'Riyadh, Saudi Arabia',
        source: 'exa',
        sourceUrl: 'https://arabicahouse.example/team',
        email: 'reem@arabicahouse.example',
        verdicts: {
          col_1: match('Leads procurement at Arabica House.', [
            'https://arabicahouse.example/team',
          ]),
          col_2: match('Works from the Riyadh head office.'),
        },
        isMatch: true,
      }),
    },
    {
      type: 'progress',
      progress: { matches: 2, byGroup: [], done: true, analysed: 41 },
      cost: { exaDollars: 1.3, fullenrichCredits: 12.5, fullenrichDollars: 0.6, totalDollars: 1.9 },
      status: 'running',
      note: null,
    },
  ],
  end: { status: 'found', note: null },
};

let script: SearchScript = CAFE_SEARCH;
let entries: Record<string, Entry> = {};
let nextId = 1;

/** The script the next search plays (tests). */
export function scriptSearch(next: SearchScript) {
  script = next;
}

export function resetSearches() {
  for (const entry of Object.values(entries)) {
    entry.stopRequested = true;
    entry.wake();
  }
  entries = {};
  script = CAFE_SEARCH;
  nextId = 1;
}

function create(briefId: string, conversationId: string | null, played: SearchScript): Entry {
  const id = `search_${nextId++}`;
  const entry: Entry = {
    search: {
      ...structuredClone(played.base),
      id,
      briefId,
      status: 'running',
      note: null,
      people: [],
      startedAt: new Date().toISOString(),
      endedAt: null,
    },
    conversationId,
    script: played,
    started: false,
    stopRequested: false,
    listeners: new Set(),
    wake: () => undefined,
  };
  entries[id] = entry;
  return entry;
}

/** A running search, as if Start had been pressed; it plays when its stream connects (tests). */
export function seedSearch(played: SearchScript = script, briefId = 'brief_gcc_cafe'): string {
  return create(briefId, null, played).search.id;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function apply(search: Search, step: Step) {
  if (step.type === 'person') {
    const at = search.people.findIndex((p) => p.id === step.person.id);
    if (at === -1) search.people.push(step.person);
    else search.people[at] = step.person;
  } else {
    Object.assign(search, {
      progress: step.progress,
      cost: step.cost,
      status: step.status,
      note: step.note,
      analysed: step.progress.analysed,
    });
  }
}

async function play(entry: Entry) {
  const emit = (event: SearchEvent) => entry.listeners.forEach((listener) => listener(event));
  const { steps, end, waitForStopBefore, stepMs = STEP_MS } = entry.script;
  const untilStopped = () => new Promise<void>((resolve) => (entry.wake = resolve));
  for (const [index, step] of steps.entries()) {
    if (index === waitForStopBefore && !entry.stopRequested) await untilStopped();
    if (entry.stopRequested) break;
    await wait(stepMs);
    if (entry.stopRequested) break;
    apply(entry.search, step);
    emit(structuredClone(step));
  }
  // Waiting "before" the step after the last one holds it running until Stop.
  if (waitForStopBefore === steps.length && !entry.stopRequested) await untilStopped();
  if (entries[entry.search.id] !== entry) return;
  const ending = entry.stopRequested ? { status: 'stopped' as const, note: null } : end;
  Object.assign(entry.search, { ...ending, endedAt: new Date().toISOString() });
  emit({ type: 'done', search: structuredClone(entry.search) });
}

const line = (event: unknown) => new TextEncoder().encode(`${JSON.stringify(event)}\n`);

const notFound = () =>
  HttpResponse.json({ code: 'not_found', message: 'That search doesn’t exist.' }, { status: 404 });

export const searchHandlers = [
  http.post('/api/searches', async ({ request }) => {
    const { briefId, conversationId } = (await request.json()) as {
      briefId: string;
      conversationId?: string | null;
    };
    const running = Object.values(entries).some(
      (e) => e.search.briefId === briefId && e.search.status === 'running',
    );
    if (running) {
      return HttpResponse.json(
        { code: 'already_running', message: 'A search is already running for this brief.' },
        { status: 409 },
      );
    }
    const entry = create(briefId, conversationId ?? null, script);
    return HttpResponse.json({ id: entry.search.id }, { status: 201 });
  }),

  http.get('/api/searches', ({ request }) => {
    const briefId = new URL(request.url).searchParams.get('briefId');
    const list = Object.values(entries)
      .map((e) => e.search)
      .filter((s) => s.briefId === briefId)
      .reverse()
      .map((s) => ({
        id: s.id,
        status: s.status,
        target: s.target,
        matches: s.progress.matches,
        startedAt: s.startedAt,
      }));
    return HttpResponse.json(list);
  }),

  http.get('/api/searches/:id', ({ params }) => {
    const entry = entries[String(params.id)];
    return entry ? HttpResponse.json(entry.search) : notFound();
  }),

  http.post('/api/searches/:id/stop', ({ params }) => {
    const entry = entries[String(params.id)];
    if (!entry) return notFound();
    entry.stopRequested = true;
    entry.wake();
    return new HttpResponse(null, { status: 202 });
  }),

  http.get('/api/searches/:id/stream', ({ params }) => {
    const entry = entries[String(params.id)];
    if (!entry) return notFound();
    let listener: ((event: SearchEvent) => void) | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(line({ type: 'snapshot', search: entry.search }));
        if (entry.search.status !== 'running') {
          controller.enqueue(line({ type: 'done', search: entry.search }));
          controller.close();
          return;
        }
        listener = (event) => {
          try {
            controller.enqueue(line(event));
            if (event.type === 'done') controller.close();
          } catch {
            // The reader went away.
          }
        };
        entry.listeners.add(listener);
        if (!entry.started) {
          entry.started = true;
          void play(entry);
        }
      },
      cancel() {
        if (listener) entry.listeners.delete(listener);
      },
    });
    return new HttpResponse(body, { headers: { 'Content-Type': 'application/x-ndjson' } });
  }),
];
