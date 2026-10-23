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
    'Three overnight hikes since May, the longest on the PCT in August. I’ve attached my Gaia GPS route map.',
    'Eleven trail runs since spring, plus a 50K in September. Race certificate and Strava map attached.',
  ],
  [
    'Six days and five nights on the PCT through Oregon, mostly forest trail with some lava rock.',
    'A 52 km mountain race with about 2,400 m of climbing. Almost all my running is single-track.',
  ],
  [
    'Shokz OpenRun Pro. I switched from AirPods after losing one on a descent.',
    'Powerbeats Pro, so not Shokz. They stay in, but I take one out near other people.',
  ],
  [
    'Podcasts on long climbs and music for the last hours of the day. Never at camp or near water crossings.',
    'Music for tempo efforts, audiobooks on long easy runs. Usually three to five hours at a time.',
  ],
  [
    'Battery is the big one: three days with no outlet means I ration listening. Sweat makes the band slip too.',
    'Fit under a cap and sunglasses. Sound gets thin in wind, and the buds get gross with sweat.',
  ],
  [
    'A horse rider once had to shout twice before I heard her. Since then I keep the volume really low.',
    'Other runners think I can’t hear them, so I get the “on your left” yelled at me. The arms also clash with my visor.',
  ],
  [
    'Hiking solo I need to hear rockfall, rattlesnakes and the weather turning. Open-ear is non-negotiable.',
    'On shared trails I need to hear bikes coming. Today I just run with one bud in.',
  ],
  [
    'I’d try an ear-clip if it stays put on rough ground. Battery life and weight matter most, then sound.',
    'Ear-clips look comfortable with a cap. I’d rank fit and stability first, then sweat resistance and simple buttons.',
  ],
];

const SUMMARIES: Record<AnswerQuality, string> = {
  strong:
    'Clear proof of activity and detailed stories on pain points, awareness and the ear-clip.',
  good: 'Qualifies on activity and headphones; lighter on conflicts and feature priorities.',
  weak: 'Short, general answers and no proof of recent activity yet.',
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
