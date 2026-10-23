import type {
  AnswerQuality,
  ExpertResponse,
  MatchedExpert,
  Project,
  ResponsesResult,
  ResponseStatus,
} from '@/features/admin';

// Answers for PRJ-1042's eight screening questions, by question position, two voices each so
// experts don't read identically. Realistic content for usability tests (CLAUDE.md rule 11).
const ANSWER_BANK: string[][] = [
  [
    'Around 50–60 kt of EV packs reach end of life in the EU today; I’d expect 4–5× that by 2030.',
    'Today it’s mostly production scrap, not end-of-life packs. Real volume growth starts around 2028.',
  ],
  [
    'Mostly gigafactory scrap. A few large traders control the flow into Germany and Poland.',
    'Black mass comes from scrap first, packs second. Three or four aggregators set the price.',
  ],
  [
    'Hydro gets 90%+ recovery on Li, Ni, Co but needs scale to be cost-competitive.',
    'Pyro is cheaper to run but loses lithium; hydro wins once you pass ~20 kt a year.',
  ],
  [
    'The recycled-content targets lock in demand from 2031; OEMs are already signing offtakes.',
    'Targets help, but the real driver is OEMs wanting a traceable, local supply.',
  ],
  [
    'Two or three integrated players lead; most others are pre-processors selling black mass.',
    'The leaders compete on recovery rate and on long feedstock contracts, not on price.',
  ],
  [
    'OEMs mostly pay per tonne with a metals-linked rebate; contracts run three to five years.',
    'Pricing is a gate fee plus a share of recovered metal value, renegotiated yearly.',
  ],
  [
    'Feedstock consistency and permitting timelines were the two things that slowed us most.',
    'Scaling a plant is about permits and steady feed. The chemistry is the easy part.',
  ],
  [
    'Asian players bring cheap capital and process know-how; expect joint ventures, not greenfield.',
    'They’ll enter through partnerships with European OEMs rather than building alone.',
  ],
];

const SUMMARIES: Record<AnswerQuality, string> = {
  strong: 'Deep, specific answers on market size, recovery costs and scaling risks.',
  good: 'Solid answers on supply and recovery; lighter on pricing and competitors.',
  weak: 'Broad, general answers with few specifics from direct experience.',
};

/** The same expert always gets the same status and answers (deterministic for demos and tests). */
function hash(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

/** The answer an expert gave to one question (same text the screening answers screen shows). */
export function answerFor(expertId: string, questionIndex: number): string | null {
  const bank = ANSWER_BANK[questionIndex % ANSWER_BANK.length] ?? [];
  return bank[(hash(expertId) + questionIndex) % bank.length] ?? null;
}

function statusFor(index: number): ResponseStatus {
  // Most experts answer; every fifth is still going, the next one hasn't opened it yet.
  if (index % 6 === 4) return 'in_progress';
  if (index % 6 === 5) return 'not_opened';
  return 'answered';
}

function qualityFor(expert: MatchedExpert): { quality: AnswerQuality; score: number } {
  if (expert.matchPercent >= 93) return { quality: 'strong', score: 92 };
  if (expert.matchPercent >= 90) return { quality: 'good', score: 74 };
  return { quality: 'weak', score: 38 };
}

/** Screen 08: how each expert who was sent the screening questions has responded. */
export function buildResponses(
  project: Project,
  sentExperts: MatchedExpert[],
  sentAt: string | null,
  now: Date,
): ResponsesResult {
  const questions = project.questions;
  const responses: ExpertResponse[] = sentExperts.map((expert, index) => {
    const status = statusFor(index);
    const seed = hash(expert.id);
    const reached =
      status === 'answered'
        ? questions.length - (seed % 3 === 0 ? 1 : 0)
        : status === 'in_progress'
          ? Math.ceil(questions.length / 2)
          : 0;
    const { quality, score } = qualityFor(expert);
    const answered = status === 'answered';
    return {
      expertId: expert.id,
      label: expert.label,
      role: expert.role,
      status,
      answeredCount: reached,
      quality: answered ? quality : null,
      qualityScore: answered ? score : null,
      aiPick: false,
      submittedAt: answered
        ? new Date(now.getTime() - (index + 1) * 37 * 60_000).toISOString()
        : null,
      summary: answered ? SUMMARIES[quality] : null,
      answers: questions.map((question, qIndex) => {
        const bank = ANSWER_BANK[qIndex % ANSWER_BANK.length] ?? [];
        return {
          questionId: question.id,
          question: question.text,
          answer: qIndex < reached ? (bank[(seed + qIndex) % bank.length] ?? null) : null,
        };
      }),
    };
  });

  // The AI moves forward the best answered experts (strong first), up to five.
  const rank: Record<AnswerQuality, number> = { strong: 0, good: 1, weak: 2 };
  const picks = responses
    .filter((r) => r.status === 'answered' && r.quality !== 'weak')
    .sort((a, b) => rank[a.quality ?? 'weak'] - rank[b.quality ?? 'weak'])
    .slice(0, 5)
    .map((r) => r.expertId);
  for (const response of responses) response.aiPick = picks.includes(response.expertId);

  const answeredCount = responses.filter((r) => r.status === 'answered').length;
  return {
    projectId: project.id,
    sentAt,
    closesAt: sentAt ? new Date(new Date(sentAt).getTime() + 3 * 86_400_000).toISOString() : null,
    questionCount: questions.length,
    aiNote:
      picks.length > 0
        ? `AI picked ${picks.length} of the ${answeredCount} experts who answered. Together they cover the client’s questions with the strongest, most specific answers.`
        : null,
    responses,
  };
}
