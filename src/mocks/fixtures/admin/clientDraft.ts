import type {
  ClientDraft,
  ClientExpert,
  ClientSettings,
  MatchedExpert,
  Project,
  TimeSlot,
} from '@/features/admin';
import { answerFor } from './responses';
import { expertPerson } from './expertPeople';

// Short topics for PRJ-1042's eight client questions; other projects fall back to "Question N".
const PRJ_1042_TOPICS = [
  'Market size',
  'Black mass supply',
  'Recovery costs',
  'EU regulation',
  'Leading players',
  'OEM pricing',
  'Scaling risks',
  'Asian entrants',
];

const COUNTRY: Record<string, string> = { DE: 'DE', PL: 'PL', SE: 'SE', BE: 'BE', FR: 'FR' };

/** Reply-by choices: the next three working days at 17:00 GMT. */
function replyByOptions(from: Date): string[] {
  const options: string[] = [];
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (options.length < 3) {
    day.setUTCDate(day.getUTCDate() + 1);
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) {
      const at = new Date(day);
      at.setUTCHours(17, 0, 0, 0);
      options.push(at.toISOString());
    }
  }
  return options;
}

/** Screen 10: the AI-drafted email to the client with the chosen experts and their times. */
export function buildClientDraft(
  project: Project,
  chosen: { expert: MatchedExpert; slots: TimeSlot[] }[],
  matchedCount: number,
  holdSlots: boolean,
  now: Date,
): ClientDraft {
  const topics = project.questions.map(
    (_, index) =>
      (project.id === 'PRJ-1042' ? PRJ_1042_TOPICS[index] : undefined) ?? `Question ${index + 1}`,
  );
  const count = chosen.length;
  // Questions are spread round-robin so every question is covered by at least one expert.
  const experts: ClientExpert[] = chosen.map(({ expert, slots }, index) => {
    const covers = topics.map((_, q) => q).filter((q) => count > 0 && q % count === index);
    const firstQuestion = covers[0] ?? 0;
    return {
      expertId: expert.id,
      letter: String.fromCharCode(65 + index),
      label: expert.label,
      ...expertPerson(expert.id),
      role: expert.role,
      years: expert.years,
      country: COUNTRY[expert.country] ?? expert.country,
      quote: answerFor(expert.id, firstQuestion) ?? 'Answered the screening questions in depth.',
      bestFor: covers.map((q) => topics[q] ?? `Question ${q + 1}`),
      covers,
      rateHint: expert.rateHint,
      slots,
    };
  });
  const first = project.contact.name.split(' ')[0] ?? project.contact.name;
  const options = replyByOptions(now);
  const settings: ClientSettings = {
    hideNames: true,
    includeSummary: true,
    pickUpToTwo: true,
    showRates: false,
    replyBy: options[0] ?? now.toISOString(),
  };
  return {
    projectId: project.id,
    to: { name: project.contact.name, email: project.contact.email },
    subject: `${count} experts for ${project.name.split(' — ')[0]} — pick 1 or 2`,
    intro: `Hi ${first} — we screened ${matchedCount} matches and these ${count} answered your questions best. Each one is free for a 60-minute call next week. Pick 1 or 2 and we’ll book it.`,
    experts,
    questionTopics: topics,
    settings,
    replyByOptions: options,
    holdSlots,
    savedAt: null,
    sentAt: null,
  };
}
