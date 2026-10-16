import type {
  Interview,
  InterviewMode,
  SectionSummary,
  TranscriptEntry,
  TurnInput,
} from '@/features/interviews';
import { createId } from '@/shared/lib/id';
import type { GuideSection } from '../../fixtures/calls';

/** Where the interviewer is in its guide. */
export type Cursor = {
  section: number;
  question: number;
  /** The current question's follow-up has been asked. */
  followedUp: boolean;
};

/** The interview plus server-only state: owner, guide position and the answers so far. */
export type StoredInterview = Interview & {
  ownerId: string;
  cursor: Cursor;
  /** Expert answers per section, used to draft the review summaries. */
  notes: Record<string, string[]>;
};

const MIN_WORDS = 12;

/** A precise figure ("SAR 41.75", "exactly 18%", "our internal number") rather than a range. */
const EXACT_FIGURE =
  /\b(exactly|precisely|internal (figure|number|data)|confidential)\b|(\b(sar|aed|usd)\s?|\$)\d[\d,]*\.\d+|\d[\d,]*\.\d+\s?(m|mn|million|bn|k|%|percent)\b/i;
const RANGE =
  /\d\s*(-|–|to)\s*\d|\b(between|around|roughly|about|approximately|estimate|ballpark)\b/i;

export function isExactFigure(text: string): boolean {
  return EXACT_FIGURE.test(text) && !RANGE.test(text);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function entry(
  speaker: TranscriptEntry['speaker'],
  kind: TranscriptEntry['kind'],
  text: string,
  sectionId: string,
): TranscriptEntry {
  return { id: createId('tr'), speaker, kind, text, sectionId, at: new Date().toISOString() };
}

export function sectionsFor(guide: GuideSection[]): Interview['sections'] {
  return guide.map((section, index) => ({
    id: section.id,
    title: section.title,
    status: index === 0 ? 'active' : 'todo',
    answered: 0,
    total: section.questions.length,
  }));
}

/** First words once the expert starts: hello, how it works, the first question. */
export function openingTurn(
  interview: StoredInterview,
  guide: GuideSection[],
  mode: InterviewMode,
): TranscriptEntry[] {
  const first = guide[0];
  const question = first?.questions[0];
  if (!first || !question) return [];
  const how =
    mode === 'voice'
      ? 'I’ll read each question aloud; answer in your own words and press Done when you’ve finished.'
      : 'Type your answers in your own words; short notes are fine, I’ll ask if I need more.';
  return [
    entry(
      'ai',
      'greeting',
      `Hello, and thanks for joining. I’m the Xpert Network interviewer. We’ll go through ${guide.length} short sections on “${interview.topic}”. ${how} You can skip any question, and please don’t share confidential figures — ranges and estimates are perfect.`,
      first.id,
    ),
    entry('ai', 'question', question.text, first.id),
  ];
}

export type TurnOutcome = {
  /** New transcript entries, expert first; the AI ones are streamed to the client. */
  entries: TranscriptEntry[];
  /** True once the last section is done. */
  finished: boolean;
};

/** One expert turn: answer, skip or decline as confidential. Mutates `interview`. */
export function takeTurn(
  interview: StoredInterview,
  guide: GuideSection[],
  input: Pick<TurnInput, 'action' | 'text'>,
): TurnOutcome {
  const section = guide[interview.cursor.section];
  const question = section?.questions[interview.cursor.question];
  if (!section || !question) return { entries: [], finished: true };
  const entries: TranscriptEntry[] = [];
  const text = input.text.trim();

  if (input.action === 'answer') {
    // Compliance deflection: keep the exact figure out of the record and ask for a range.
    if (isExactFigure(text)) {
      entries.push(
        entry('expert', 'removed', 'Shared an exact figure — removed from the record.', section.id),
        entry(
          'ai',
          'deflection',
          'Thank you — I’ve left that exact figure out of the record, because it may be confidential. Could you give a range or a rough estimate instead? Something like “between 30 and 40 riyals a kilo” is ideal.',
          section.id,
        ),
      );
      return { entries, finished: false };
    }
    entries.push(entry('expert', 'answer', text, section.id));
    interview.notes[section.id] = [...(interview.notes[section.id] ?? []), text];
    if (wordCount(text) < MIN_WORDS && !interview.cursor.followedUp) {
      interview.cursor.followedUp = true;
      entries.push(entry('ai', 'follow_up', question.followUp, section.id));
      return { entries, finished: false };
    }
  } else if (input.action === 'skip') {
    entries.push(entry('expert', 'skipped', `Skipped: ${text || 'no reason given'}`, section.id));
  } else {
    entries.push(entry('expert', 'confidential', 'Can’t answer — confidential.', section.id));
    entries.push(
      entry('ai', 'acknowledgement', 'No problem at all — we’ll leave that one.', section.id),
    );
  }

  return { entries: [...entries, ...advance(interview, guide)], finished: isFinished(interview) };
}

function isFinished(interview: StoredInterview): boolean {
  return interview.sections.every((s) => s.status === 'done' || s.status === 'skipped');
}

/** Moves to the next question or section and returns what the AI says next. */
function advance(interview: StoredInterview, guide: GuideSection[]): TranscriptEntry[] {
  const out: TranscriptEntry[] = [];
  const section = guide[interview.cursor.section];
  const meta = interview.sections[interview.cursor.section];
  if (!section || !meta) return out;
  meta.answered = Math.min(meta.total, meta.answered + 1);
  interview.cursor.followedUp = false;

  const nextQuestion = section.questions[interview.cursor.question + 1];
  if (nextQuestion) {
    interview.cursor.question += 1;
    out.push(entry('ai', 'question', nextQuestion.text, section.id));
    return out;
  }

  meta.status = 'done';
  const nextSection = guide[interview.cursor.section + 1];
  const nextMeta = interview.sections[interview.cursor.section + 1];
  if (!nextSection || !nextMeta) {
    out.push(
      entry(
        'ai',
        'section_complete',
        `That covers ${section.title.toLowerCase()} — and that’s everything. Thank you. Next you’ll see a short summary of each section to check before you submit.`,
        section.id,
      ),
    );
    return out;
  }
  interview.cursor = { section: interview.cursor.section + 1, question: 0, followedUp: false };
  nextMeta.status = 'active';
  out.push(
    entry(
      'ai',
      'section_complete',
      `Thanks — that covers ${section.title.toLowerCase()}. Next: ${nextSection.title.toLowerCase()}.`,
      section.id,
    ),
    entry('ai', 'question', nextSection.questions[0]?.text ?? '', nextSection.id),
  );
  return out;
}

/** The question currently waiting for an answer, for resuming after a pause or a drop. */
export function currentQuestion(interview: StoredInterview, guide: GuideSection[]) {
  const section = guide[interview.cursor.section];
  const question = section?.questions[interview.cursor.question];
  return section && question
    ? { section, text: interview.cursor.followedUp ? question.followUp : question.text }
    : null;
}

function firstSentence(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence;
}

/** Draft summaries for review: one per section, from the expert's own words. */
export function draftSummaries(
  interview: StoredInterview,
  guide: GuideSection[],
): SectionSummary[] {
  return guide
    .filter((section) => {
      const meta = interview.sections.find((s) => s.id === section.id);
      return meta && (meta.status === 'done' || meta.answered > 0 || meta.status === 'active');
    })
    .map((section) => {
      const notes = interview.notes[section.id] ?? [];
      const aiText = notes.length
        ? `On ${section.title.toLowerCase()}, the expert said: ${notes.map(firstSentence).join(' ')}`
        : `No answers were recorded for ${section.title.toLowerCase()}.`;
      return { sectionId: section.id, aiText, text: aiText, isEdited: false };
    });
}

/** Splits text into word-sized tokens for streaming. */
export function tokens(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}
