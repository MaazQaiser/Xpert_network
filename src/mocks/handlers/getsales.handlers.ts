import { http, HttpResponse } from 'msw';
import {
  createSenderProfileInputSchema,
  sendLinkedinMessageInputSchema,
  type LinkedinConversation,
  type LinkedinProfile,
  type SenderProfile,
} from '@/features/admin';

/**
 * Tests only (wired in mocks/node.ts). In the browser the GetSales calls are not mocked: they
 * pass through to the PoC backend, which talks to the real GetSales API.
 */
const SEED: SenderProfile[] = [
  {
    uuid: '50181726-f022-4c23-8116-1c45e97f8a19',
    firstName: 'Ateeb',
    lastName: 'Ahmad',
    label: null,
    status: 'enabled',
    linkedinConnected: true,
    avatarUrl: null,
    createdAt: '2026-11-11T09:53:13.000Z',
  },
];

const CONVERSATIONS: LinkedinConversation[] = [
  {
    id: 'lead_hassan',
    lead: {
      uuid: 'lead_hassan',
      name: 'Hassan Islam',
      headline: 'Senior Software Engineer @Tkxel',
      company: 'Tkxel',
      linkedinUrl: 'https://www.linkedin.com/in/hassan-islam-3bbb98111',
      avatarUrl: 'https://cdn.example/hassan.jpg',
    },
    lastMessageAt: '2026-11-11T13:07:06.000Z',
    unread: 1,
    messages: [
      {
        uuid: 'm1',
        direction: 'sent',
        text: 'Hi Hassan, would you be open to a 30-minute paid call about ERP rollouts?',
        subject: null,
        sentAt: '2026-11-11T10:20:05.000Z',
        status: 'done',
        linkedinType: 'message',
        failReason: null,
        read: true,
      },
      {
        uuid: 'm2',
        direction: 'received',
        text: 'Sure, happy to help.',
        subject: null,
        sentAt: '2026-11-11T13:07:06.000Z',
        status: 'done',
        linkedinType: 'message',
        failReason: null,
        read: false,
      },
    ],
  },
  {
    id: 'lead_sana',
    lead: {
      uuid: 'lead_sana',
      name: 'Sana Mirza',
      headline: 'Procurement lead, GCC cafés',
      company: null,
      linkedinUrl: null,
      avatarUrl: null,
    },
    lastMessageAt: '2026-11-10T09:00:00.000Z',
    unread: 0,
    messages: [
      {
        uuid: 'm3',
        direction: 'sent',
        text: 'Hi Sana, quick question about café supply contracts.',
        subject: null,
        sentAt: '2026-11-10T09:00:00.000Z',
        status: 'failed',
        linkedinType: 'connection_note',
        failReason: 'Connection request limit reached',
        read: true,
      },
    ],
  },
];

/** People a LinkedIn link can point to, by handle. Hassan is a connection; Sana isn't. */
const PEOPLE: Record<string, LinkedinProfile> = {
  'hassan-islam-3bbb98111': {
    uuid: 'lead_hassan',
    name: 'Hassan Islam',
    headline: 'Senior Software Engineer @Tkxel',
    position: 'Senior Software Engineer',
    company: 'Tkxel',
    location: 'Lahore, Punjab, Pakistan',
    avatarUrl: 'https://cdn.example/hassan.jpg',
    linkedinUrl: 'https://www.linkedin.com/in/hassan-islam-3bbb98111',
    connections: 2510,
    followers: 2495,
    premium: true,
    openProfile: false,
    about: 'I build web apps with React and Node.',
    experience: [
      { position: 'Senior Software Engineer', company: 'Tkxel', start: '2024-03-01', end: null },
      {
        position: 'MERN Stack Developer',
        company: 'NexTek Solutions',
        start: '2022-01-01',
        end: '2024-02-01',
      },
    ],
    enriched: true,
    settled: true,
    connectedSenderUuids: ['50181726-f022-4c23-8116-1c45e97f8a19'],
    requestedSenderUuids: [],
  },
  'sana-mirza': {
    uuid: 'lead_sana',
    name: 'Sana Mirza',
    headline: 'Procurement lead, GCC cafés',
    position: null,
    company: null,
    location: null,
    avatarUrl: null,
    linkedinUrl: 'https://www.linkedin.com/in/sana-mirza',
    connections: null,
    followers: null,
    premium: false,
    openProfile: false,
    about: null,
    experience: [],
    enriched: true,
    settled: true,
    connectedSenderUuids: [],
    requestedSenderUuids: [],
  },
  'umar-sarwar': {
    uuid: 'lead_umar',
    name: 'Umar Sarwar',
    headline: 'SEO Team Lead @ Tkxel',
    position: null,
    company: null,
    location: null,
    avatarUrl: null,
    linkedinUrl: 'https://www.linkedin.com/in/umar-sarwar',
    connections: null,
    followers: null,
    premium: false,
    openProfile: false,
    about: null,
    experience: [],
    enriched: true,
    settled: true,
    connectedSenderUuids: [],
    requestedSenderUuids: ['50181726-f022-4c23-8116-1c45e97f8a19'],
  },
};

let profiles: SenderProfile[] = [...SEED];
let conversations: LinkedinConversation[] = structuredClone(CONVERSATIONS);

export function resetSenderProfiles() {
  profiles = [...SEED];
  conversations = structuredClone(CONVERSATIONS);
}

export const getsalesHandlers = [
  http.get('/api/getsales/sender-profiles', () => HttpResponse.json(profiles)),

  // The seeded sender has two threads; any other sender has none yet.
  http.get('/api/getsales/sender-profiles/:uuid/conversations', ({ params }) =>
    HttpResponse.json(params.uuid === SEED[0]?.uuid ? conversations : []),
  ),

  // A connection request with a note, for someone who isn't a connection yet.
  http.post('/api/getsales/sender-profiles/:uuid/leads/:leadUuid/connect', async ({ request }) => {
    const { note } = (await request.json()) as { note: string };
    if (!note.trim() || note.length > 300) {
      return HttpResponse.json(
        { code: 'validation_error', message: 'Keep the note to 300 characters.' },
        { status: 422 },
      );
    }
    return HttpResponse.json({ flowUuid: 'flow_1', status: 'queued' }, { status: 201 });
  }),

  // A LinkedIn link from the Home chat: the person behind it.
  http.post('/api/getsales/leads/lookup', async ({ request }) => {
    const { linkedinUrl } = (await request.json()) as { linkedinUrl: string };
    const handle = /linkedin\.com\/in\/([^/?#\s]+)/i.exec(linkedinUrl)?.[1];
    if (!handle) {
      return HttpResponse.json(
        { code: 'validation_error', message: 'That isn’t a LinkedIn profile link.' },
        { status: 422 },
      );
    }
    const person = PEOPLE[handle];
    if (!person) {
      return HttpResponse.json(
        { code: 'getsales_error', message: 'LinkedIn messaging isn’t responding.' },
        { status: 502 },
      );
    }
    return HttpResponse.json(person);
  }),

  http.get('/api/getsales/leads/:uuid', ({ params }) => {
    const person = Object.values(PEOPLE).find((p) => p.uuid === params.uuid);
    return person
      ? HttpResponse.json(person)
      : HttpResponse.json({ code: 'not_found', message: 'Gone.' }, { status: 404 });
  }),

  // Opening a thread marks the lead's replies read up to the given time.
  http.post(
    '/api/getsales/sender-profiles/:uuid/leads/:leadUuid/read',
    async ({ params, request }) => {
      const { until } = (await request.json()) as { until: string };
      conversations = conversations.map((c) =>
        c.lead.uuid === params.leadUuid
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((msg) =>
                msg.direction === 'received' && (msg.sentAt ?? '') <= until
                  ? { ...msg, read: true }
                  : msg,
              ),
            }
          : c,
      );
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // GetSales queues the message; it shows as in progress until LinkedIn delivers it.
  http.post(
    '/api/getsales/sender-profiles/:uuid/leads/:leadUuid/messages',
    async ({ params, request }) => {
      const parsed = sendLinkedinMessageInputSchema.safeParse(await request.json());
      if (!parsed.success) {
        return HttpResponse.json(
          { code: 'validation_error', message: 'Write a message first.' },
          { status: 422 },
        );
      }
      const message = {
        uuid: `m_${Date.now()}`,
        direction: 'sent' as const,
        text: parsed.data.text,
        subject: null,
        sentAt: null,
        status: 'in_progress' as const,
        linkedinType: 'message' as const,
        failReason: null,
        read: true,
      };
      // A resend that goes through hides the failed copy, as the backend does.
      conversations = conversations.map((c) =>
        c.lead.uuid === params.leadUuid
          ? {
              ...c,
              messages: [
                ...c.messages.filter(
                  (m) => !(m.status === 'failed' && m.text.trim() === message.text),
                ),
                message,
              ],
            }
          : c,
      );
      return HttpResponse.json(message, { status: 201 });
    },
  ),

  http.post('/api/getsales/sender-profiles', async ({ request }) => {
    const parsed = createSenderProfileInputSchema
      .extend({ label: createSenderProfileInputSchema.shape.label.nullable() })
      .safeParse(await request.json());
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the fields.',
        },
        { status: 422 },
      );
    }
    const profile: SenderProfile = {
      uuid: `sp_${profiles.length + 1}`,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      label: parsed.data.label,
      status: 'enabled',
      linkedinConnected: false,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    profiles = [...profiles, profile];
    return HttpResponse.json(profile, { status: 201 });
  }),
];
