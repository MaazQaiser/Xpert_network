import type {
  AuditEntry,
  ClientRecord,
  ExpertRecord,
  TeamMember,
  TrashEntry,
} from '@/features/admin';
import { PM_NAME } from './seed';

export function seedClients(): Record<string, ClientRecord> {
  const clients: ClientRecord[] = [
    {
      id: 'cli_helix',
      name: 'Helix Capital Partners',
      type: 'Investment firm',
      domains: ['helixcap.example'],
      contacts: [
        { name: 'Sarah Lin', email: 'sarah.lin@helixcap.example', role: 'Partner' },
        { name: 'Mark Huang', email: 'mark.huang@helixcap.example', role: 'Associate' },
      ],
      activeProjects: 1,
      anonymiseExperts: true,
      owner: PM_NAME,
    },
    {
      id: 'cli_northgate',
      name: 'Northgate Advisory',
      type: 'Advisory',
      domains: ['northgate.example'],
      contacts: [
        { name: 'Omar Siddiqui', email: 'omar.siddiqui@northgate.example', role: 'Director' },
      ],
      activeProjects: 1,
      anonymiseExperts: true,
      owner: PM_NAME,
    },
    {
      id: 'cli_meridian',
      name: 'Meridian Growth',
      type: 'PE',
      domains: ['meridian.example'],
      contacts: [{ name: 'Priya Shah', email: 'priya.shah@meridian.example', role: 'VP' }],
      activeProjects: 0,
      anonymiseExperts: false,
      owner: PM_NAME,
    },
    {
      id: 'cli_atlas',
      name: 'Atlas Industrial',
      type: 'Corporate development',
      domains: ['atlasind.example'],
      contacts: [
        { name: 'James Okonkwo', email: 'j.okonkwo@atlasind.example', role: 'Head of Corp Dev' },
      ],
      activeProjects: 0,
      anonymiseExperts: true,
      owner: 'Amira Hassan',
    },
    {
      id: 'cli_bright',
      name: 'Brightfield Ventures',
      type: 'Venture',
      domains: ['brightfield.example'],
      contacts: [{ name: 'Elena Rossi', email: 'elena@brightfield.example', role: 'Partner' }],
      activeProjects: 0,
      anonymiseExperts: true,
      owner: PM_NAME,
    },
  ];
  return Object.fromEntries(clients.map((c) => [c.id, c]));
}

export function seedExpertDirectory(): Record<string, ExpertRecord> {
  const experts: ExpertRecord[] = [
    {
      id: 'exp_4821',
      displayId: 'Expert #4821',
      name: 'Hidden until booked',
      role: 'Former VP Operations, EU battery recycler',
      country: 'DE',
      tags: ['battery recycling', 'plant ops', 'EU'],
      rate: 500,
      compliance: 'complete',
      source: 'network',
      lastEngaged: '2026-09-12',
    },
    {
      id: 'exp_3307',
      displayId: 'Expert #3307',
      name: 'Hidden until booked',
      role: 'Former Head of Feedstock Procurement',
      country: 'PL',
      tags: ['feedstock', 'black mass'],
      rate: 450,
      compliance: 'complete',
      source: 'network',
      lastEngaged: '2026-08-01',
    },
    {
      id: 'exp_sara',
      displayId: 'Expert #1190',
      name: 'Sara Novak',
      role: 'Hydrometallurgy plant director (retired)',
      country: 'FI',
      tags: ['hydro', 'plant'],
      rate: 420,
      compliance: 'complete',
      source: 'network',
      lastEngaged: null,
    },
    {
      id: 'exp_out_1',
      displayId: 'Applicant · Katarzyna',
      name: 'Katarzyna Wójcik',
      role: 'Plant manager, battery recycling',
      country: 'PL',
      tags: ['outreach', 'plant'],
      rate: 480,
      compliance: 'pending',
      source: 'outreach',
      lastEngaged: null,
    },
  ];
  return Object.fromEntries(experts.map((e) => [e.id, e]));
}

export function seedTeam(): Record<string, TeamMember> {
  const members: TeamMember[] = [
    {
      id: 'tm_paltu',
      name: PM_NAME,
      email: 'paltu@xpertnetwork.example',
      openProjects: 4,
      bookedProjects: 2,
      avgHoursToBrief: 1.4,
      active: true,
    },
    {
      id: 'tm_amira',
      name: 'Amira Hassan',
      email: 'amira@xpertnetwork.example',
      openProjects: 3,
      bookedProjects: 5,
      avgHoursToBrief: 2.1,
      active: true,
    },
    {
      id: 'tm_jon',
      name: 'Jon Reeves',
      email: 'jon@xpertnetwork.example',
      openProjects: 1,
      bookedProjects: 0,
      avgHoursToBrief: null,
      active: false,
    },
  ];
  return Object.fromEntries(members.map((m) => [m.id, m]));
}

export function seedAudit(now = new Date()): AuditEntry[] {
  const t = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  return [
    {
      id: 'aud_1',
      at: t(18),
      actor: 'AI',
      action: 'Extracted brief for PRJ-1042 from Helix email',
      projectId: 'PRJ-1042',
    },
    {
      id: 'aud_2',
      at: t(10),
      actor: PM_NAME,
      action: 'Opened project file PRJ-1042',
      projectId: 'PRJ-1042',
    },
    {
      id: 'aud_3',
      at: t(5),
      actor: 'System',
      action: 'Demo store loaded',
      projectId: null,
    },
  ];
}

export function seedTrash(now = new Date()): Record<string, TrashEntry> {
  const deletedAt = new Date(now.getTime() - 3 * 24 * 60 * 60_000).toISOString();
  const expiresAt = new Date(now.getTime() + 27 * 24 * 60 * 60_000).toISOString();
  const entry: TrashEntry = {
    id: 'trash_1',
    kind: 'project',
    label: 'PRJ-0991 · Archived pilot',
    deletedAt,
    expiresAt,
    daysLeft: 27,
  };
  return { [entry.id]: entry };
}
