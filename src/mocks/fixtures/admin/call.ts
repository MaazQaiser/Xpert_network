import type { Booking, CallSession, TranscriptLine } from '@/features/admin';
import { storyFor, type CallScript } from './stories';

const t = (minutes: number, seconds: number) => minutes * 60 + seconds;

/** A call for projects without a story: it walks through the first questions by number. */
function genericScript(topics: string[]): CallScript {
  const topic = (index: number) => topics[index] ?? `Question ${index + 1}`;
  return {
    open: {
      client: `Let’s start with ${topic(0).toLowerCase()}. What have you seen?`,
      expert: 'It depends mostly on scale. The larger operators handle it very differently.',
      covers: topic(0),
    },
    middle: {
      expert: 'The biggest change in the last two years has been timing.',
      covers: topic(1),
    },
    ask: 'Who would you watch most closely?',
    answer: {
      expert: 'Two or three larger players set the pace for everyone else.',
      covers: topic(2),
    },
    drop: {
      topic: topic(3),
      line: `Actually, let’s drop the question on ${topic(3).toLowerCase()}.`,
      quote: `Drop the question on ${topic(3).toLowerCase()}.`,
    },
    next: { expert: 'Sure. On the next point, costs have come down a little.', covers: topic(4) },
    request: {
      line: 'Could we also get someone with a different regional view?',
      quote: 'Someone with a different regional view.',
    },
    coveredBefore: [],
  };
}

/**
 * Screen 14: the scripted live call with Expert A, from the project's story. The transcript picks up 20 minutes in; the
 * client asks for documents, drops a question and asks for another expert along the way.
 */
export function buildCallSession(booking: Booking): CallSession {
  const pick = booking.picks.find((p) => p.letter === 'A') ?? booking.picks[0];
  if (!pick) throw new Error('buildCallSession needs a booked expert');
  const first = pick.name.split(' ')[0] ?? pick.name;
  const topics = booking.questionTopics;
  const find = (topic: string) => {
    const index = topics.indexOf(topic);
    return index >= 0 ? [index] : [];
  };
  const script = storyFor(booking.projectId)?.call ?? genericScript(topics);
  const dropped = topics.indexOf(script.drop.topic);

  const lines: TranscriptLine[] = [
    {
      id: 'ln_1',
      at: t(20, 52),
      speaker: 'client',
      text: script.open.client,
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_2',
      at: t(21, 18),
      speaker: 'expert',
      text: script.open.expert,
      highlight: null,
      covers: find(script.open.covers),
    },
    {
      id: 'ln_3',
      at: t(21, 40),
      speaker: 'client',
      text: `Great. Can you send us a short summary of this call and Expert ${pick.letter}’s background after?`,
      highlight: `Can you send us a short summary of this call and Expert ${pick.letter}’s background after?`,
      covers: [],
    },
    {
      id: 'ln_4',
      at: t(21, 52),
      speaker: 'moderator',
      text: 'Of course, we’ll send it today.',
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_5',
      at: t(24, 10),
      speaker: 'expert',
      text: script.middle.expert,
      highlight: null,
      covers: find(script.middle.covers),
    },
    {
      id: 'ln_6',
      at: t(25, 30),
      speaker: 'client',
      text: script.ask,
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_7',
      at: t(26, 5),
      speaker: 'expert',
      text: script.answer.expert,
      highlight: null,
      covers: find(script.answer.covers),
    },
    {
      id: 'ln_8',
      at: t(27, 5),
      speaker: 'client',
      text: script.drop.line,
      highlight: script.drop.line,
      covers: [],
    },
    {
      id: 'ln_9',
      at: t(27, 40),
      speaker: 'expert',
      text: script.next.expert,
      highlight: null,
      covers: find(script.next.covers),
    },
    {
      id: 'ln_10',
      at: t(31, 12),
      speaker: 'client',
      text: script.request.line,
      highlight: script.request.line,
      covers: [],
    },
  ];

  const other = booking.picks.find((p) => p.expertId !== pick.expertId);
  return {
    projectId: booking.projectId,
    client: { name: booking.client.name },
    expert: {
      expertId: pick.expertId,
      name: pick.name,
      letter: pick.letter,
      photoUrl: pick.photoUrl,
    },
    startAt: t(20, 40),
    lines,
    speakingAfter: 'expert',
    requests: [
      {
        id: 'rq_docs',
        kind: 'document',
        at: t(21, 40),
        lineId: 'ln_3',
        quote: `Send a short summary of this call and Expert ${pick.letter}’s background.`,
        documents: ['Call summary', `${first}’s bio (anonymised)`],
        questionIndex: null,
        matches: null,
        matchNote: null,
        status: 'open',
      },
      ...(dropped >= 0
        ? [
            {
              id: 'rq_drop',
              kind: 'remove_requirement' as const,
              at: t(27, 5),
              lineId: 'ln_8',
              quote: script.drop.quote,
              documents: [],
              questionIndex: dropped,
              matches: null,
              matchNote: null,
              status: 'open' as const,
            },
          ]
        : []),
      {
        id: 'rq_new',
        kind: 'new_requirement',
        at: t(31, 12),
        lineId: 'ln_10',
        quote: script.request.quote,
        documents: [],
        questionIndex: null,
        matches: 4,
        matchNote: other ? `${other.name} (Expert ${other.letter}) is one of them.` : null,
        status: 'open',
      },
    ],
    questionTopics: topics,
    coveredBefore: script.coveredBefore.flatMap(find),
    notes: [],
    endedAt: null,
    duration: null,
    sentToClientAt: null,
    expertPaidAt: null,
    version: booking.version,
  };
}
