import type { Meeting, Schedule, ScheduleProject } from '@/features/admin';
import { expertPerson } from './expertPeople';

/**
 * The PM's calendar for the demo: booked expert calls and held slots across the live projects,
 * placed relative to this week so there is always something on screen. Deterministic, so tests
 * and demos see the same meetings.
 */

type Seed = {
  project: ScheduleProject;
  client: { name: string; company: string; email: string; photoUrl: string | null };
  /** Day offset from this week's Monday, start hour (GMT), length in minutes, expert number. */
  calls: { day: number; hour: number; minutes: number; expert: number; held?: boolean }[];
};

const SEEDS: Seed[] = [
  {
    project: { id: 'PRJ-1039', name: 'Industrial automation, Germany', colour: 'blue' },
    client: {
      name: 'Tom Becker',
      company: 'Halden Group',
      email: 'tom.becker@halden.example',
      photoUrl: '/images/avatars/tom-becker.jpg',
    },
    calls: [
      { day: -4, hour: 10, minutes: 60, expert: 3901 },
      { day: 0, hour: 9, minutes: 60, expert: 3902 },
      { day: 1, hour: 14, minutes: 60, expert: 3916 },
      { day: 3, hour: 11, minutes: 45, expert: 3904 },
      { day: 8, hour: 15, minutes: 60, expert: 3905 },
    ],
  },
  {
    project: { id: 'PRJ-1041', name: 'Specialty coffee sourcing, GCC', colour: 'teal' },
    client: {
      name: 'Ayesha Rahman',
      company: 'Meridian Gulf Capital',
      email: 'ayesha.rahman@meridiangulf.example',
      photoUrl: '/images/avatars/ayesha-rahman.jpg',
    },
    calls: [
      { day: -2, hour: 13, minutes: 60, expert: 4101 },
      { day: 1, hour: 10, minutes: 30, expert: 4102 },
      { day: 2, hour: 15, minutes: 60, expert: 4103 },
      { day: 4, hour: 9, minutes: 60, expert: 4104 },
      { day: 9, hour: 12, minutes: 60, expert: 4105 },
    ],
  },
  {
    project: { id: 'PRJ-1040', name: 'Cold-chain capacity, UAE', colour: 'purple' },
    client: {
      name: 'Bilal Haddad',
      company: 'Haddad Hospitality',
      email: 'bilal@haddadhospitality.example',
      photoUrl: '/images/avatars/bilal-haddad.jpg',
    },
    calls: [
      { day: 1, hour: 14, minutes: 60, expert: 3917 },
      { day: 2, hour: 10, minutes: 60, expert: 4002, held: true },
      { day: 3, hour: 16, minutes: 60, expert: 4003, held: true },
      { day: 7, hour: 11, minutes: 60, expert: 4004 },
    ],
  },
  {
    project: { id: 'PRJ-1043', name: 'UK MRO carve-out, Part 145 readiness', colour: 'magenta' },
    client: {
      name: 'Amy Wang',
      company: 'Northgate Advisory',
      email: 'amy.wang@northgate.example',
      photoUrl: '/images/avatars/amy-wang-portrait.jpg',
    },
    calls: [
      { day: 4, hour: 9, minutes: 60, expert: 5001, held: true },
      { day: 8, hour: 13, minutes: 60, expert: 5001, held: true },
      { day: 10, hour: 10, minutes: 60, expert: 5002 },
    ],
  },
];

const ROLES = [
  'Former Head of Quality, Part 145 MRO',
  'Ex-Plant Director, automotive automation',
  'Former Green Coffee Buyer, GCC roaster',
  'Ex-Head of Logistics, cold-chain operator',
  'Former Operations Director, contract manufacturing',
  'Ex-Procurement Lead, food service',
] as const;

/** A Meet code shaped like Google's (abc-defg-hij), stable for a meeting id. */
function meetCode(seed: string): string {
  const letters = 'abcdefghijkmnopqrstuvwxyz';
  let h = 7;
  const out: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    h = (h * 31 + seed.charCodeAt(i % seed.length) + i) % 1_000_003;
    out.push(letters[h % letters.length] ?? 'a');
  }
  return `${out.slice(0, 3).join('')}-${out.slice(3, 7).join('')}-${out.slice(7).join('')}`;
}

/** Monday 00:00 GMT of the week that holds `now`. */
function weekStart(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - weekday);
  return start;
}

export function buildSchedule(now: Date): Schedule {
  const monday = weekStart(now);
  const meetings: Meeting[] = SEEDS.flatMap((seed) =>
    seed.calls.map((call, index) => {
      const start = new Date(monday);
      start.setUTCDate(start.getUTCDate() + call.day);
      start.setUTCHours(call.hour, 0, 0, 0);
      const end = new Date(start.getTime() + call.minutes * 60_000);
      const expert = expertPerson(`exp_${call.expert}`);
      const id = `mtg_${seed.project.id}_${index}`;
      return {
        id,
        kind: call.held ? ('held' as const) : ('booked' as const),
        projectId: seed.project.id,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        client: {
          name: seed.client.name,
          detail: seed.client.company,
          email: seed.client.email,
          photoUrl: seed.client.photoUrl,
        },
        expert: {
          name: expert.name,
          detail: ROLES[call.expert % ROLES.length] ?? ROLES[0],
          email: null,
          photoUrl: expert.photoUrl,
        },
        meetUrl: call.held ? null : `https://meet.google.com/${meetCode(id)}`,
      };
    }),
  );
  meetings.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { timeZone: 'GMT', projects: SEEDS.map((s) => s.project), meetings };
}
