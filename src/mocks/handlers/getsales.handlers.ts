import { http, HttpResponse } from 'msw';
import {
  createSenderProfileInputSchema,
  sendLinkedinMessageInputSchema,
  senderScheduleSchema,
  type LinkedinConversation,
  type LinkedinProfile,
  listFollowUpInputSchema,
  type ListFollowUp,
  type ListMember,
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
    linkedinSchedule: {
      timezone: 'Asia/Karachi',
      timeblocks: [1, 2, 3, 4, 5].map((dow) => ({ dow, min: 540, max: 1080 })),
    },
  },
];

const ALL_DAY_EVERY_DAY = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({ dow, min: 0, max: 1439 }));

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

function listMember(
  uuid: string,
  name: string,
  position: string,
  connection: ListMember['connection'],
): ListMember {
  return {
    lead: {
      uuid,
      name,
      headline: `${position} @ Tkxel`,
      company: 'Tkxel',
      linkedinUrl: `https://www.linkedin.com/in/${uuid}`,
      avatarUrl: null,
    },
    position,
    location: 'Lahore, Punjab, Pakistan',
    connection,
  };
}

let profiles: SenderProfile[] = structuredClone(SEED);
let conversations: LinkedinConversation[] = structuredClone(CONVERSATIONS);
let followUps: Record<string, ListFollowUp> = {};
// Senders whose "I have logged in" has been pressed: the next session check finds them connected.
let checking = new Set<string>();

export function resetSenderProfiles() {
  profiles = structuredClone(SEED);
  conversations = structuredClone(CONVERSATIONS);
  followUps = {};
  checking = new Set();
}

const PROXY_COUNTRIES = [
  { code: 'DE', name: 'Germany' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

const senderNotFound = () =>
  HttpResponse.json(
    { code: 'not_found', message: 'That sender isn’t in GetSales any more.' },
    { status: 404 },
  );

const noBrowser = () =>
  HttpResponse.json(
    { code: 'no_browser', message: 'Choose a proxy country for this sender first.' },
    { status: 409 },
  );

const updateProfile = (updated: SenderProfile) => {
  profiles = profiles.map((p) => (p.uuid === updated.uuid ? updated : p));
  return updated;
};

const FOLLOW_UP_OFF: ListFollowUp = {
  enabled: false,
  questions: [],
  message: '',
  enabledAt: null,
  sentCount: 0,
};

export const getsalesHandlers = [
  http.get('/api/getsales/sender-profiles', () => HttpResponse.json(profiles)),

  // Connecting LinkedIn: proxy country, then sign in in the cloud browser, then the check.
  http.get('/api/getsales/proxy-countries', () => HttpResponse.json(PROXY_COUNTRIES)),

  http.put('/api/getsales/sender-profiles/:uuid/linkedin/proxy', ({ params }) => {
    const profile = profiles.find((p) => p.uuid === params.uuid);
    if (!profile) return senderNotFound();
    return HttpResponse.json(updateProfile({ ...profile, cloudBrowser: true }));
  }),

  http.post('/api/getsales/sender-profiles/:uuid/linkedin/sign-in', ({ params }) => {
    const profile = profiles.find((p) => p.uuid === params.uuid);
    if (!profile) return senderNotFound();
    if (!profile.cloudBrowser) return noBrowser();
    // The prototype has no cloud browser to show.
    return HttpResponse.json({ url: 'about:blank' });
  }),

  http.post('/api/getsales/sender-profiles/:uuid/linkedin/check', ({ params }) => {
    const profile = profiles.find((p) => p.uuid === params.uuid);
    if (!profile) return senderNotFound();
    if (!profile.cloudBrowser) return noBrowser();
    checking.add(profile.uuid);
    return HttpResponse.json({ state: 'checking', issue: null });
  }),

  http.get('/api/getsales/sender-profiles/:uuid/linkedin/session', ({ params }) => {
    const profile = profiles.find((p) => p.uuid === params.uuid);
    if (!profile) return senderNotFound();
    if (!profile.cloudBrowser) return noBrowser();
    if (!checking.has(profile.uuid) && !profile.linkedinConnected) {
      return HttpResponse.json({ state: 'signed_out', issue: null });
    }
    checking.delete(profile.uuid);
    updateProfile({
      ...profile,
      linkedinConnected: true,
      linkedinState: 'ok',
      linkedinIssue: null,
    });
    return HttpResponse.json({ state: 'connected', issue: null });
  }),

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
  // A project's GetSales list: three people, one of each connection state.
  http.get('/api/getsales/lists/:uuid', ({ params }) =>
    HttpResponse.json({
      uuid: params.uuid,
      name: 'Xpert PoC test',
      members: [
        listMember('lead_hassan', 'Hassan Islam', 'Senior Software Engineer', 'connected'),
        listMember('lead_sahar', 'Sahar A', 'Senior Manager User Experience', 'requested'),
        listMember('lead_zain', 'Zain Shiraz', 'AI Engineer', 'not_connected'),
      ],
    }),
  ),

  // Off until turned on; the message mirrors the server's wording.
  http.get('/api/getsales/lists/:uuid/follow-up', ({ params }) =>
    HttpResponse.json(followUps[params.uuid as string] ?? FOLLOW_UP_OFF),
  ),

  http.put('/api/getsales/lists/:uuid/follow-up', async ({ params, request }) => {
    const input = listFollowUpInputSchema.safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { code: 'validation_error', message: 'Check the questions.' },
        { status: 422 },
      );
    }
    const { enabled, questions } = input.data;
    if (enabled && questions.length === 0) {
      return HttpResponse.json(
        { code: 'validation_error', message: 'Add a screening question first.' },
        { status: 422 },
      );
    }
    const previous = followUps[params.uuid as string] ?? FOLLOW_UP_OFF;
    const saved: ListFollowUp = {
      enabled,
      questions,
      message: questions.length
        ? `Thanks, great to hear! Here's the short questionnaire. Reply here whenever it suits you; a few lines per question is plenty.\n\n${questions
            .map((q, i) => `${i + 1}. ${q}`)
            .join('\n')}`
        : '',
      enabledAt: enabled ? (previous.enabledAt ?? new Date().toISOString()) : null,
      sentCount: previous.sentCount,
    };
    followUps[params.uuid as string] = saved;
    return HttpResponse.json(saved);
  }),

  // Nothing has happened in the seeded threads beyond their messages.
  http.get('/api/getsales/sender-profiles/:uuid/leads/:leadUuid/activity', () =>
    HttpResponse.json([]),
  ),

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
      linkedinSchedule: { timezone: 'Asia/Karachi', timeblocks: ALL_DAY_EVERY_DAY },
    };
    profiles = [...profiles, profile];
    return HttpResponse.json(profile, { status: 201 });
  }),

  // Disconnect: the sender stays, signed out of LinkedIn.
  http.delete('/api/getsales/sender-profiles/:uuid/linkedin', ({ params }) => {
    const profile = profiles.find((p) => p.uuid === params.uuid);
    if (!profile) {
      return HttpResponse.json(
        { code: 'not_found', message: 'That sender isn’t in GetSales any more.' },
        { status: 404 },
      );
    }
    const updated: SenderProfile = {
      ...profile,
      linkedinConnected: false,
      linkedinState: 'not_connected',
      linkedinIssue: null,
      cloudBrowser: false,
    };
    profiles = profiles.map((p) => (p.uuid === updated.uuid ? updated : p));
    return HttpResponse.json(updated);
  }),

  http.put('/api/getsales/sender-profiles/:uuid/schedule', async ({ params, request }) => {
    const parsed = senderScheduleSchema.safeParse(await request.json());
    const profile = profiles.find((p) => p.uuid === params.uuid);
    if (!profile) {
      return HttpResponse.json(
        { code: 'not_found', message: 'That sender isn’t in GetSales any more.' },
        { status: 404 },
      );
    }
    if (!parsed.success || parsed.data.timeblocks.length === 0) {
      return HttpResponse.json(
        { code: 'validation_error', message: 'Turn on at least one day.' },
        { status: 422 },
      );
    }
    const updated = { ...profile, linkedinSchedule: parsed.data };
    profiles = profiles.map((p) => (p.uuid === updated.uuid ? updated : p));
    return HttpResponse.json(updated);
  }),
];
