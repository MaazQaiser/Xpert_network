import type { Activity, InboxRequest, MailAccount, PipelineStep, Project } from '@/features/admin';
import {
  PRJ_1042_BRIEFS,
  PRJ_1042_FACTS,
  PRJ_1042_PAGES,
  PRJ_1042_QUESTIONS,
  PRJ_1042_REQUIREMENTS,
} from './prj1042';
import { PRJ_1043, PRJ_1044, type DraftProjectContent } from './newProjects';

export const PROJECTS_INBOX = 'projects@xpertnetwork.example';
export const PARTNERS_INBOX = 'partners@xpertnetwork.example';
export const PM_NAME = 'Umer';

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
const UNREAD = new Set(['req_ridgeline_audio', 'req_northgate_mro', 'req_kite_coldstorage']);

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
      id: 'req_ridgeline_audio',
      from: { name: 'Jenna Cho', email: 'jenna.cho@ridgelineinsights.example' },
      company: 'Ridgeline Consumer Insights',
      to: PROJECTS_INBOX,
      subject: 'Feasibility and quote: sports headphones research, North America',
      body: 'Hi team, we’re starting research on sports headphones in North America and would like you to check feasibility and send a quote. The brief attached has the participants we need (thru-hikers and trail runners in the US) and what we want to learn. Interviews would be AI-assisted, 50–60 minutes.',
      receivedAt: t(18),
      status: 'brief_ready',
      attachment: {
        name: 'Sports_Headphones_NA_Brief.pdf',
        kind: 'pdf',
        pages: 14,
        size: '2.4 MB',
        note: 'text layer found',
        progress: null,
      },
      steps: [
        step('Email received and sender matched to client “Ridgeline Consumer Insights”', t(18)),
        step('Attachment saved to secure storage', t(18)),
        step('Text extracted from 14 pages (no OCR needed)', t(17)),
        step('Brief, requirements and 8 client questions extracted', t(16)),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: ['no budget: they want a quote', 'no timeline in the brief'],
      autoReply: null,
      projectId: 'PRJ-1042',
    },
    {
      id: 'req_northgate_mro',
      from: { name: 'Amy Wang', email: 'amy.wang@northgate.example' },
      company: 'Northgate Advisory',
      to: PROJECTS_INBOX,
      subject: 'Looking for MRO / aviation compliance experts',
      body: 'Hello, we’re advising on a carve-out of an MRO business in the UK. Scope attached. We’d like 4–5 calls with former quality and compliance leads who know EASA Part 145.',
      receivedAt: t(29),
      status: 'brief_ready',
      attachment: {
        name: 'Scope_v2.docx',
        kind: 'docx',
        pages: 4,
        size: '310 KB',
        note: 'text layer found',
        progress: null,
      },
      steps: [
        step('Email received and sender matched to client “Northgate Advisory”', t(29)),
        step('Attachment saved to secure storage', t(29)),
        step('Text extracted from 4 pages', t(28)),
        step('Brief, requirements and 6 client questions extracted', t(27)),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: ['budget not stated in the scope'],
      autoReply: null,
      projectId: 'PRJ-1043',
    },
    {
      id: 'req_lakeview_semis',
      from: { name: 'Priya Raman', email: 'priya.raman@sintel.example' },
      company: 'Sintel',
      to: PROJECTS_INBOX,
      subject: 'Market study: soil & groundwater remediation (BE / NL / DE)',
      body: 'Hi, Sintel needs a commercial market assessment of in situ and on-site soil/groundwater remediation in Belgium, the Netherlands and Germany, including PFAS. Brief attached: ~15 expert interviews (~5 per country), questionnaire ahead of each call, and a do-not-contact list. Please review and quote.',
      receivedAt: t(42),
      status: 'brief_ready',
      attachment: {
        name: 'Sintel_Remediation_Market_Brief.pdf',
        kind: 'pdf',
        pages: 4,
        size: '1.2 MB',
        note: 'text layer found',
        progress: null,
      },
      steps: [
        step('Email received and sender matched to client “Sintel”', t(42)),
        step('Attachment saved to secure storage', t(42)),
        step('Text extracted from 4 pages', t(40)),
        step('Brief, requirements and 5 client questions extracted', t(38)),
        step('Waiting for your review before matching experts', null),
      ],
      confirmations: ['budget / interview fee not stated in the brief'],
      autoReply: null,
      projectId: 'PRJ-1044',
    },
    {
      id: 'req_brightline_cold',
      from: { name: 'James Okafor', email: 'j.okafor@brightlinepe.example' },
      company: 'Brightline PE',
      to: PROJECTS_INBOX,
      subject: 'Re: expert for cold-chain logistics',
      body: 'Following our call, can you find us someone on cold-chain logistics in the GCC? Happy to discuss.',
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
        'Hi James, thanks for getting in touch. To find the right expert, could you send your brief: the decision you’re making, the questions you want answered, the profile you have in mind, and when you need the calls? A document or a few lines in a reply both work. Thanks, the Xpert Network team',
      projectId: null,
    },
    {
      id: 'req_corvid_fintech',
      from: { name: 'Elena Duarte', email: 'elena@corvidpartners.example' },
      company: 'Corvid Partners',
      to: PROJECTS_INBOX,
      subject: 'Fintech payments: 5 calls this week',
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
        step('Approved by Umer and converted to PRJ-1039', t(60 * 25)),
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
        'Hi Daniel, thanks for reaching out. Happy to support your portfolio teams. To get started, could you send a first brief: the company, the decision, the questions and the expert profile? Thanks, the Xpert Network team',
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

/** A full AI-drafted project file (brief, profile, questions, facts, source document). */
function draftProject(content: DraftProjectContent, seed: ProjectSeed): Project {
  const { brief, requirements, questions } = content;
  return makeProject({
    ...seed,
    brief,
    requirements,
    questions,
    ai: { brief, requirements, questions },
    facts: content.facts,
    confirmations: content.confirmations,
    activity: [
      activity(seed.createdAt, 'ai', 'AI created project file v0.1'),
      activity(seed.createdAt, 'ai', `AI matched sender to client ${seed.client.name}`),
    ],
    document: { pageCount: content.pages.length, pages: content.pages },
  });
}

export function seedProjects(now = new Date()): Record<string, Project> {
  const t = (minutes: number) => minutesAgo(now, minutes);
  const brief = PRJ_1042_BRIEFS.standard[0];
  const projects: Project[] = [
    makeProject({
      id: 'PRJ-1042',
      name: 'Sports headphones, North America outdoor research',
      status: 'draft',
      client: { id: 'cli_ridgeline', name: 'Ridgeline Consumer Insights' },
      contact: { name: 'Jenna Cho', email: 'jenna.cho@ridgelineinsights.example' },
      source: { requestId: 'req_ridgeline_audio', fileName: 'Sports_Headphones_NA_Brief.pdf' },
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
          text: 'They ask for a quote; no budget given',
          proposal: null,
          state: 'open',
        },
        {
          id: 'c_deadline',
          factId: 'f_deadline',
          text: 'No timeline in the brief: aim to finish by 13 Nov?',
          proposal: '13 Nov',
          state: 'open',
        },
      ],
      activity: [
        activity(t(16), 'ai', 'AI created project file v0.1'),
        activity(t(16), 'ai', 'AI matched sender to client Ridgeline Consumer Insights'),
        activity(t(18), 'system', 'Email received'),
      ],
      document: { pageCount: PRJ_1042_PAGES.length, pages: PRJ_1042_PAGES },
    }),
    draftProject(PRJ_1043, {
      id: 'PRJ-1043',
      name: 'UK MRO carve-out, Part 145 readiness',
      status: 'draft',
      client: { id: 'cli_northgate', name: 'Northgate Advisory' },
      contact: { name: 'Amy Wang', email: 'amy.wang@northgate.example' },
      source: { requestId: 'req_northgate_mro', fileName: 'Scope_v2.docx' },
      createdAt: t(27),
      pendingExpertReviews: 2,
    }),
    draftProject(PRJ_1044, {
      id: 'PRJ-1044',
      name: 'Soil & groundwater remediation, BE / NL / DE',
      status: 'draft',
      client: { id: 'cli_sintel', name: 'Sintel' },
      contact: { name: 'Priya Raman', email: 'priya.raman@sintel.example' },
      source: {
        requestId: 'req_lakeview_semis',
        fileName: 'Sintel_Remediation_Market_Brief.pdf',
      },
      createdAt: t(38),
      pendingExpertReviews: 2,
    }),
    makeProject({
      id: 'PRJ-1041',
      name: 'Specialty coffee sourcing, GCC',
      status: 'matching',
      client: { id: 'cli_meridian', name: 'Meridian Gulf Capital' },
      contact: { name: 'Ayesha Rahman', email: 'ayesha.rahman@meridiangulf.example' },
      createdAt: t(60 * 50),
      approvedAt: t(60 * 49),
    }),
    makeProject({
      id: 'PRJ-1040',
      name: 'Cold-chain capacity, UAE',
      status: 'pitching',
      client: { id: 'cli_haddad', name: 'Haddad Hospitality' },
      contact: { name: 'Bilal Haddad', email: 'bilal@haddadhospitality.example' },
      createdAt: t(60 * 72),
      approvedAt: t(60 * 70),
    }),
    makeProject({
      id: 'PRJ-1039',
      name: 'Industrial automation, Germany',
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
