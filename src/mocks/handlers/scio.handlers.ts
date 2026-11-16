import { http, HttpResponse } from 'msw';
import type { ScioConversation, ScioConversationDetail, ScioReply } from '@/features/admin';
import { extractMockRequirements } from './requirements.handlers';

/**
 * Scio, the Home chat agent, for tests only: the browser lets /api/scio through to the real
 * backend (ADR 0016). Answers are scripted. A message with "fail" in it ends in an error.
 */

type Chat = ScioConversationDetail;
let chats: Record<string, Chat> = {};

export function resetScio() {
  chats = {};
}

/** Seed a saved chat, as if it had been used before. */
export function seedScioChat(chat: Chat) {
  chats[chat.id] = structuredClone(chat);
}

const BRIEFS: ScioReply['blocks'] = [
  {
    kind: 'emails',
    items: [
      {
        requestId: 'brief_gcc_cafe',
        from: { name: 'Layla Haddad', email: 'layla.haddad@meridiancap.example' },
        company: 'Meridian Capital',
        subject: 'Experts needed: coffee franchise procurement in the GCC',
        receivedAt: '2026-11-16T07:00:00+00:00',
        attachment: null,
        reason: 'New brief',
        projectId: null,
        prompt: 'Open the brief from Meridian Capital',
        action: 'Open brief',
        extraAction: {
          label: 'Extract requirements',
          prompt: 'Extract the requirements from the Meridian Capital brief',
        },
      },
    ],
  },
];

function extractAnswer(message: string) {
  const requirements = extractMockRequirements();
  const text =
    'I pulled **5 requirements** from Meridian Capital’s brief and suggested 2 screening ' +
    'questions; 1 needs confirming.';
  return {
    steps: ['Extracting the requirements…'],
    text,
    reply: {
      id: `scio_extract_${message.length}`,
      text,
      links: [],
      basis: 'Sample briefs (demo mailbox)',
      blocks: [
        {
          kind: 'briefRequirements' as const,
          briefId: requirements.briefId,
          company: requirements.company,
          subject: requirements.subject,
          status: 'draft' as const,
          count: 4,
          toConfirm: 1,
          questions: requirements.questions.length,
          clientScreener: false,
        },
      ],
      chips: [],
    },
  };
}

/** Scio gets a people search ready for the café brief, for the PM to start. */
function findPeopleAnswer(message: string) {
  const text =
    'Here’s the people search for **Meridian Capital**. Nothing is searched or spent until ' +
    'you press Start.';
  return {
    steps: ['Getting the search ready…'],
    text,
    reply: {
      id: `scio_search_${message.length}`,
      text,
      links: [],
      basis: 'Meridian Capital’s accepted requirements and search plan',
      blocks: [
        {
          kind: 'searchConfirm' as const,
          briefId: 'brief_gcc_cafe',
          company: 'Meridian Capital',
          target: 2,
          groups: [],
          columns: [
            { id: 'col_1', label: 'Procurement leader', group: null },
            { id: 'col_2', label: 'In the GCC', group: null },
          ],
          exaBudget: 2,
          fullenrichCreditCap: 50,
          ready: true,
          blocker: null,
          preparedAt: new Date(Date.now() - 1000).toISOString(),
        },
      ],
      chips: [],
    },
  };
}

function answerTo(message: string): {
  steps: string[];
  text: string;
  reply: Omit<ScioReply, 'conversation'>;
} {
  if (/extract/i.test(message)) return extractAnswer(message);
  if (/find people/i.test(message)) return findPeopleAnswer(message);
  if (/brief/i.test(message)) {
    const text = 'There is **1 new brief** this week, from Meridian Capital.';
    return {
      steps: ['Checking new briefs…'],
      text,
      reply: {
        id: `scio_${Object.keys(chats).length}_${message.length}`,
        text,
        links: [],
        basis: 'Sample briefs (demo mailbox)',
        blocks: BRIEFS,
        chips: [
          { label: 'Open the coffee brief', prompt: 'Open the GCC coffee brief', href: null },
          { label: 'Draft a reply', prompt: 'Draft a reply to Meridian', href: null },
        ],
      },
    };
  }
  const text = `You asked: ${message}`;
  return {
    steps: [],
    text,
    reply: {
      id: `scio_${message.length}`,
      text,
      links: [],
      basis: '',
      blocks: [],
      chips: [],
    },
  };
}

const line = (event: unknown) => `${JSON.stringify(event)}\n`;

const notFound = () =>
  HttpResponse.json(
    { code: 'not_found', message: 'That chat doesn’t exist any more.' },
    { status: 404 },
  );

/** A saved chat's title, as the mock backend has it now. */
export function scioChatTitle(id: string): string | undefined {
  return chats[id]?.title;
}

export const scioHandlers = [
  // The mailbox Scio reads: its new-brief counts for Home.
  http.get('/api/mailbox/summary', () =>
    HttpResponse.json({ newToday: 3, newThisWeek: 6, source: 'Sample briefs (demo mailbox)' }),
  ),

  http.post('/api/scio/chat', async ({ request }) => {
    const { conversationId, message } = (await request.json()) as {
      conversationId: string;
      message: string;
    };
    const now = new Date().toISOString();
    const chat = (chats[conversationId] ??= {
      id: conversationId,
      title: 'New briefs this week',
      updatedAt: now,
      messages: [],
    });
    chat.messages.push({ role: 'user', text: message, result: null, createdAt: now });
    chat.updatedAt = now;

    const events: unknown[] = [];
    if (/fail/i.test(message)) {
      events.push({
        type: 'error',
        code: 'ai_unavailable',
        message: 'Scio couldn’t reach the AI service.',
      });
    } else {
      const { steps, text, reply } = answerTo(message);
      steps.forEach((label, index) => {
        events.push({ type: 'step', id: `step-${index}`, label, status: 'running' });
        events.push({
          type: 'step',
          id: `step-${index}`,
          label: 'Found 1 new brief',
          status: 'done',
        });
      });
      // Streamed a few words at a time.
      for (const word of text.match(/\S+\s*/g) ?? []) events.push({ type: 'token', text: word });
      const result: ScioReply = { ...reply, conversation: { id: chat.id, title: chat.title } };
      chat.messages.push({ role: 'assistant', text, result, createdAt: now });
      events.push({ type: 'done', result });
    }
    return new HttpResponse(events.map(line).join(''), {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }),

  http.get('/api/scio/conversations', () => {
    const list: ScioConversation[] = Object.values(chats)
      .filter((c) => c.messages.length > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
    return HttpResponse.json(list);
  }),

  http.patch('/api/scio/conversations/:id', async ({ params, request }) => {
    const chat = chats[String(params.id)];
    if (!chat) return notFound();
    const { title } = (await request.json()) as { title: string };
    chat.title = title.trim();
    return HttpResponse.json({ id: chat.id, title: chat.title, updatedAt: chat.updatedAt });
  }),

  http.delete('/api/scio/conversations/:id', ({ params }) => {
    const id = String(params.id);
    if (!chats[id]) return notFound();
    chats = Object.fromEntries(Object.entries(chats).filter(([key]) => key !== id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/scio/conversations/:id', ({ params }) => {
    const chat = chats[String(params.id)];
    return chat
      ? HttpResponse.json(chat)
      : HttpResponse.json(
          { code: 'not_found', message: 'That chat doesn’t exist any more.' },
          { status: 404 },
        );
  }),
];
