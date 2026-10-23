import type { Availability, ExpertAvailability, MatchedExpert, Project } from '@/features/admin';

const HOURS = [9, 10, 11, 13, 14, 15, 16];

function hash(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

/** The next `count` working days after `from` (UTC dates). */
function workingDays(from: Date, count: number): Date[] {
  const days: Date[] = [];
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (days.length < count) {
    day.setUTCDate(day.getUTCDate() + 1);
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(new Date(day));
  }
  return days;
}

/** "Former VP Operations, EU battery recycler" → "VP Operations": what the client sees. */
function shortRole(role: string): string {
  return (
    role
      .split(',')[0]
      ?.replace(/^(Former|Ex-|Retired)\s*/i, '')
      .trim() || role
  );
}

/** Screen 09: the chosen experts' offered call times (deterministic for demos and tests). */
export function buildAvailability(
  project: Project,
  experts: MatchedExpert[],
  askedAt: string,
  sentToClientAt: string | null,
): Availability {
  const days = workingDays(new Date(askedAt), 5);
  const rows: ExpertAvailability[] = experts.map((expert, index) => {
    const seed = hash(expert.id);
    const slots = [0, 1].map((n) => {
      const day = days[(seed + n * 2) % days.length] ?? new Date(askedAt);
      const hour = HOURS[(seed + n * 3) % HOURS.length] ?? 10;
      const start = new Date(day);
      start.setUTCHours(hour, 0, 0, 0);
      return { id: `${expert.id}_slot_${n}`, startsAt: start.toISOString() };
    });
    slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      expertId: expert.id,
      label: expert.label,
      role: expert.role,
      clientLabel: `Expert ${String.fromCharCode(65 + index)} · ${shortRole(expert.role)}`,
      status: 'confirmed',
      // One expert still has to sign the compliance form, so the PM can resend it.
      complianceSigned: index !== 3,
      slots,
    };
  });
  return {
    projectId: project.id,
    askedAt,
    timeZone: 'GMT',
    clientName: project.contact.name,
    experts: rows,
    sentToClientAt,
  };
}
