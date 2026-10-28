import {
  conversationChannelFor,
  type AnswerQuality,
  type ExpertResponse,
  type MatchedExpert,
  type Project,
  type ResponsesResult,
  type ResponseStatus,
} from '@/features/admin';
import { storyFor } from './stories';

const FALLBACK_SUMMARIES: Record<AnswerQuality, string> = {
  strong: 'Deep, specific answers from direct experience.',
  good: 'Solid answers on most questions; lighter on a few.',
  weak: 'Broad, general answers with few specifics from direct experience.',
};

/** The project's answers by question position; projects without a story answer generically. */
function answerBank(projectId: string): string[][] {
  return (
    storyFor(projectId)?.answers ?? [
      [
        'From my time running this, the answer depends mostly on scale and timing.',
        'In my experience the main driver is the customer mix, not the technology.',
      ],
    ]
  );
}

/** The same expert always gets the same status and answers (deterministic for demos and tests). */
function hash(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

/** The answer an expert gave to one question (same text the screening answers screen shows). */
export function answerFor(
  projectId: string,
  expertId: string,
  questionIndex: number,
): string | null {
  const answers = answerBank(projectId);
  const bank = answers[questionIndex % answers.length] ?? [];
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
  const answers = answerBank(project.id);
  const summaries = storyFor(project.id)?.summaries ?? FALLBACK_SUMMARIES;
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
      name: expert.name,
      years: expert.years,
      country: expert.country,
      linkedinUrl: expert.linkedinUrl,
      photoUrl: expert.photoUrl,
      source: expert.source,
      channel: conversationChannelFor(expert.id),
      status,
      answeredCount: reached,
      quality: answered ? quality : null,
      qualityScore: answered ? score : null,
      aiPick: false,
      submittedAt: answered
        ? new Date(now.getTime() - (index + 1) * 37 * 60_000).toISOString()
        : null,
      summary: answered ? summaries[quality] : null,
      answers: questions.map((question, qIndex) => {
        const bank = answers[qIndex % answers.length] ?? [];
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
