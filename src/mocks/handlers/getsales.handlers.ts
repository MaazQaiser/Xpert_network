import { http, HttpResponse } from 'msw';
import {
  createSenderProfileInputSchema,
  sendLinkedinMessageInputSchema,
  type LinkedinConversation,
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
