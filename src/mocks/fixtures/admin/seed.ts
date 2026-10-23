import type { Activity, InboxRequest, MailAccount, PipelineStep, Project } from '@/features/admin';
import {
  PRJ_1042_BRIEFS,
  PRJ_1042_FACTS,
  PRJ_1042_PAGES,
  PRJ_1042_QUESTIONS,
  PRJ_1042_REQUIREMENTS,
} from './prj1042';

export const PROJECTS_INBOX = 'projects@xpertnetwork.example';
export const PARTNERS_INBOX = 'partners@xpertnetwork.example';
export const PM_NAME = 'Palto Kersion';

export type SentMail = {
  id: string;
  projectId: string | null;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
};

const minutesAgo = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

const step = (label: string, at: string | null): PipelineStep => ({ label, done: at !== null, at });

// The two newest emails haven't been opened yet.
const UNREAD = new Set(['req_helix_ev', 'req_northgate_mro', 'req_kite_coldstorage']);

/** The mailboxes the AI watches. */
export function seedMailAccounts(now = new Date()): MailAccount[] {
  return [
    { address: PROJECTS_INBOX, provider: 'google', connectedAt: minutesAgo(now, 60 * 24 * 30) },
    { address: PARTNERS_INBOX, provider: 'microsoft', connectedAt: minutesAgo(now, 60 * 24 * 12) },
  ];
}

export function seedInbox(now = new Date()): Record<string, InboxRequest> {
  const t = (minutes: number) => minutesAgo(now, minutes);
  const requests: Omit<InboxRequest, 'read'>[] = [
    {
      id: 'req_helix_ev',
      from: { name: 'Sarah Lin', email: 'sarah.lin@helixcap.example' },
      company: 'Helix Capital Partners',
      to: PROJECTS_INBOX,
      subject: 'Expert calls needed — EV battery recycling, Europe',
      body: 'Hi team — we’re doing diligence on a European battery recycler. Please find attached our brief with the profiles we need and the questions we want covered. Ideally first calls next week.',
      receivedAt: t(18),
      status: 'brief_ready',
      attachment: {
        name: 'Project_Brief_EV_Recycling.pdf',
        kind: 'pdf',
        pages: 14,
        size: '2.4 MB',
        note: 'text layer found',
        progress: null,
      },
      steps: [
        step('Email received and sender matched to client “Helix Capital”', t(18)),
        step('Attachment saved to secure storage', t(18)),
        step('Text extracted from 14 pages (no OCR needed)', t(17)),
        step('Brief, requirements and 8 client questions extracted', t(16)),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: ['budget not stated in the doc', '“early next month” deadline is ambiguous'],
      autoReply: null,
      projectId: 'PRJ-1042',
    },
    {
      id: 'req_northgate_mro',
      from: { name: 'Omar Siddiqui', email: 'omar.siddiqui@northgate.example' },
      company: 'Northgate Advisory',
      to: PROJECTS_INBOX,
      subject: 'Looking for MRO / aviation compliance experts',
      body: 'Hello — we’re advising on a carve-out of an MRO business in the UK. Scope attached. We’d like 4–5 calls with former quality and compliance leads who know EASA Part 145.',
      receivedAt: t(29),
      status: 'reading',
      attachment: {
        name: 'Scope_v2.docx',
        kind: 'docx',
        pages: 6,
        size: '310 KB',
        note: null,
        progress: 60,
      },
      steps: [
        step('Email received and sender matched to client “Northgate Advisory”', t(29)),
        step('Attachment saved to secure storage', t(29)),
        step('Reading 6 pages', null),
        step('Extract brief, requirements and client questions', null),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: [],
      autoReply: null,
      projectId: null,
    },
    {
      id: 'req_lakeview_semis',
      from: { name: 'Priya Raman', email: 'priya.raman@lakeview.example' },
      company: 'Lakeview Consulting',
      to: PROJECTS_INBOX,
      subject: 'Need 3 experts: semiconductor supply chain',
      body: 'Hi, our RFP is attached (sorry, it’s a scan). We need 3 experts on advanced packaging capacity in Taiwan and Malaysia, ideally this month.',
      receivedAt: t(42),
      status: 'extracting',
      attachment: {
        name: 'RFP.pdf',
        kind: 'pdf',
        pages: 9,
        size: '5.8 MB',
        note: 'scanned, OCR running',
        progress: 35,
      },
      steps: [
        step('Email received and sender matched to client “Lakeview Consulting”', t(42)),
        step('Attachment saved to secure storage', t(42)),
        step('No text layer, so running OCR on 9 scanned pages', null),
        step('Extract brief, requirements and client questions', null),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: [],
      autoReply: null,
      projectId: null,
    },
    {
      id: 'req_brightline_cold',
      from: { name: 'James Okafor', email: 'j.okafor@brightlinepe.example' },
      company: 'Brightline PE',
      to: PROJECTS_INBOX,
      subject: 'Re: expert for cold-chain logistics',
      body: 'Following our call — can you find us someone on cold-chain logistics in the GCC? Happy to discuss.',
      receivedAt: t(65),
      status: 'needs_client_info',
      attachment: null,
      steps: [
        step('Email received and sender matched to client “Brightline PE”', t(65)),
        step('No attachment and not enough detail to draft a brief', t(65)),
        step('Sent an automatic reply asking for the brief', t(64)),
        step('Waiting for James to reply', null),
      ],
      confirmations: [],
      autoReply:
        'Hi James, thanks for getting in touch. To find the right expert, could you send your brief: the decision you’re making, the questions you want answered, the profile you have in mind, and when you need the calls? A document or a few lines in a reply both work. — Xpert Network',
      projectId: null,
    },
    {
      id: 'req_corvid_fintech',
      from: { name: 'Elena Duarte', email: 'elena@corvidpartners.example' },
      company: 'Corvid Partners',
      to: PROJECTS_INBOX,
      subject: 'Fintech payments — 5 calls this week',
      body: 'Requirements attached. We need 5 calls this week with people who’ve run merchant acquiring in Iberia.',
      receivedAt: t(60 * 26),
      status: 'cant_open',
      attachment: {
        name: 'Requirements.pdf',
        kind: 'pdf',
        pages: null,
        size: '1.1 MB',
        note: 'password-protected',
        progress: null,
      },
      steps: [
        step('Email received and sender matched to client “Corvid Partners”', t(60 * 26)),
        step('Attachment saved to secure storage', t(60 * 26)),
        step('The file is password-protected, so it wasn’t opened', t(60 * 26)),
        step('Ask Elena for an unlocked copy', null),
      ],
      confirmations: [],
      autoReply: null,
      projectId: null,
    },
    {
      id: 'req_halden_automation',
      from: { name: 'Tom Becker', email: 'tom.becker@halden.example' },
      company: 'Halden Group',
      to: PROJECTS_INBOX,
      subject: 'Industrial automation experts (Germany)',
      body: 'Criteria in the spreadsheet. We’re looking at robotics integrators serving German automotive suppliers.',
      receivedAt: t(60 * 27),
      status: 'converted',
      attachment: {
        name: 'Expert_criteria.xlsx',
        kind: 'xlsx',
        pages: null,
        size: '48 KB',
        note: '3 sheets',
        progress: null,
      },
      steps: [
        step('Email received and sender matched to client “Halden Group”', t(60 * 27)),
        step('Attachment saved to secure storage', t(60 * 27)),
        step('Criteria read from 3 sheets', t(60 * 27)),
        step('Brief, requirements and 6 client questions extracted', t(60 * 27)),
        step('Approved by Palto Kersion and converted to PRJ-1039', t(60 * 25)),
      ],
      confirmations: [],
      autoReply: null,
      projectId: 'PRJ-1039',
    },
    // A second connected mailbox, so the account switcher has somewhere to go.
    {
      id: 'req_kite_coldstorage',
      from: { name: 'Mei Tanaka', email: 'mei.tanaka@kitecap.example' },
      company: 'Kite Capital',
      to: PARTNERS_INBOX,
      subject: 'Brief: cold storage in Southeast Asia',
      body: 'Sharing the brief for our cold-storage deal in Vietnam and Thailand. We’d like 3 calls with former operators before the IC on the 6th.',
      receivedAt: t(41),
      status: 'extracting',
      attachment: {
        name: 'Kite_ColdStorage_Brief.pdf',
        kind: 'pdf',
        pages: 8,
        size: '1.6 MB',
        note: 'scanned, OCR running',
        progress: 35,
      },
      steps: [
        step('Email received and sender matched to client “Kite Capital”', t(41)),
        step('Attachment saved to secure storage', t(41)),
        step('Extracting text from 8 scanned pages', null),
        step('Extract brief, requirements and client questions', null),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: [],
      autoReply: null,
      projectId: null,
    },
    {
      id: 'req_arctic_partnership',
      from: { name: 'Daniel Weiss', email: 'd.weiss@arcticbridge.example' },
      company: 'Arctic Bridge Capital',
      to: PARTNERS_INBOX,
      subject: 'Expert calls for our portfolio teams',
      body: 'Could Xpert Network support our portfolio companies with expert calls next quarter? Happy to set up an intro.',
      receivedAt: t(60 * 30),
      status: 'needs_client_info',
      attachment: null,
      steps: [
        step('Email received and sender matched to client “Arctic Bridge Capital”', t(60 * 30)),
        step('No brief yet: this is a partnership enquiry', t(60 * 30)),
        step('Sent an automatic reply asking for a first brief', t(60 * 30)),
        step('Waiting for Daniel to reply', null),
      ],
      confirmations: [],
      autoReply:
        'Hi Daniel, thanks for reaching out. Happy to support your portfolio teams. To get started, could you send a first brief: the company, the decision, the questions and the expert profile? — Xpert Network',
      projectId: null,
    },
  ];
  return Object.fromEntries(
    requests.map((request) => [request.id, { ...request, read: !UNREAD.has(request.id) }]),
  );
}

let activitySeq = 0;
const activity = (at: string, actor: Activity['actor'], text: string): Activity => ({
  id: `act_seed_${(activitySeq += 1)}`,
  at,
  actor,
  text,
});

type ProjectSeed = Pick<Project, 'id' | 'name' | 'status' | 'client' | 'contact' | 'createdAt'> &
  Partial<Project>;

/** Projects other than PRJ-1042 only need enough to list and open. */
function makeProject(seed: ProjectSeed): Project {
  const brief = seed.brief ?? `${seed.client.name}: ${seed.name}.`;
  const requirements = seed.requirements ?? [];
  const questions = seed.questions ?? [];
  return {
    owner: PM_NAME,
    source: { requestId: null, fileName: null },
    approvedAt: null,
    version: 'v0.1',
    brief,
    requirements,
    questions,
    ai: { brief, requirements, questions },
    briefLength: 'standard',
    facts: [],
    confirmations: [],
    activity: [activity(seed.createdAt, 'ai', 'AI created project file v0.1')],
    document: { pageCount: 1, pages: [{ page: 1, blocks: [] }] },
    pendingExpertReviews: 0,
    ...seed,
  };
}

export function seedProjects(now = new Date()): Record<string, Project> {
  const t = (minutes: number) => minutesAgo(now, minutes);
  const brief = PRJ_1042_BRIEFS.standard[0];
  const projects: Project[] = [
    makeProject({
      id: 'PRJ-1042',
      name: 'EV battery recycling — Europe market diligence',
      status: 'draft',
      client: { id: 'cli_helix', name: 'Helix Capital Partners' },
      contact: { name: 'Sarah Lin', email: 'sarah.lin@helixcap.example' },
      source: { requestId: 'req_helix_ev', fileName: 'Project_Brief_EV_Recycling.pdf' },
      createdAt: t(16),
      brief,
      requirements: PRJ_1042_REQUIREMENTS,
      questions: PRJ_1042_QUESTIONS,
      ai: { brief, requirements: PRJ_1042_REQUIREMENTS, questions: PRJ_1042_QUESTIONS },
      facts: PRJ_1042_FACTS,
      confirmations: [
        {
          id: 'c_budget',
          factId: 'f_budget',
          text: 'Budget not mentioned in the document',
          proposal: null,
          state: 'open',
        },
        {
          id: 'c_deadline',
          factId: 'f_deadline',
          text: '“Early next month”: assume 2 Nov?',
          proposal: '2 Nov',
          state: 'open',
        },
      ],
      activity: [
        activity(t(16), 'ai', 'AI created project file v0.1'),
        activity(t(16), 'ai', 'AI matched sender to client Helix Capital'),
        activity(t(18), 'system', 'Email received'),
      ],
      document: { pageCount: PRJ_1042_PAGES.length, pages: PRJ_1042_PAGES },
    }),
    makeProject({
      id: 'PRJ-1041',
      name: 'Specialty coffee sourcing — GCC',
      status: 'matching',
      client: { id: 'cli_meridian', name: 'Meridian Gulf Capital' },
      contact: { name: 'Ayesha Rahman', email: 'ayesha.rahman@meridiangulf.example' },
      createdAt: t(60 * 50),
      approvedAt: t(60 * 49),
    }),
    makeProject({
      id: 'PRJ-1040',
      name: 'Cold-chain capacity — UAE',
      status: 'pitching',
      client: { id: 'cli_haddad', name: 'Haddad Hospitality' },
      contact: { name: 'Bilal Haddad', email: 'bilal@haddadhospitality.example' },
      createdAt: t(60 * 72),
      approvedAt: t(60 * 70),
      pendingExpertReviews: 4,
    }),
    makeProject({
      id: 'PRJ-1039',
      name: 'Industrial automation — Germany',
      status: 'matching',
      client: { id: 'cli_halden', name: 'Halden Group' },
      contact: { name: 'Tom Becker', email: 'tom.becker@halden.example' },
      source: { requestId: 'req_halden_automation', fileName: 'Expert_criteria.xlsx' },
      createdAt: t(60 * 27),
      approvedAt: t(60 * 25),
    }),
  ];
  return Object.fromEntries(projects.map((project) => [project.id, project]));
}
