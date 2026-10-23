import type { Booking, CallSession, TranscriptLine } from '@/features/admin';

const t = (minutes: number, seconds: number) => minutes * 60 + seconds;

/**
 * Screen 14: the scripted live call with Expert A. The transcript picks up 20 minutes in; the
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
  const dropped = topics.indexOf('Current headphones');

  const lines: TranscriptLine[] = [
    {
      id: 'ln_1',
      at: t(20, 52),
      speaker: 'client',
      text: 'So on battery: how do you manage listening over a multi-day hike?',
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_2',
      at: t(21, 18),
      speaker: 'expert',
      text: 'I ration it. My Shokz last about ten hours, so on a five-night trip I only listen on the long climbs, and I carry a small power bank.',
      highlight: null,
      covers: find('Pain points'),
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
      text: 'Mostly podcasts in the afternoon, when the miles get slow. Never at camp, and never near river crossings.',
      highlight: null,
      covers: find('Use cases'),
    },
    {
      id: 'ln_6',
      at: t(25, 30),
      speaker: 'client',
      text: 'Have headphones ever caused trouble with other people on the trail?',
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_7',
      at: t(26, 5),
      speaker: 'expert',
      text: 'Once, with a horse rider who had to call out twice before I heard her. Now I keep the volume low enough to hear voices.',
      highlight: null,
      covers: find('Wearing conflicts'),
    },
    {
      id: 'ln_8',
      at: t(27, 5),
      speaker: 'client',
      text: 'Actually, let’s drop the question on current headphones — we have that from the screener.',
      highlight:
        'Actually, let’s drop the question on current headphones — we have that from the screener.',
      covers: [],
    },
    {
      id: 'ln_9',
      at: t(27, 40),
      speaker: 'expert',
      text: 'Sure. Hiking solo, hearing what’s around me matters most: rockfall, the weather turning, a rattlesnake on the path.',
      highlight: null,
      covers: find('Hearing surroundings'),
    },
    {
      id: 'ln_10',
      at: t(31, 12),
      speaker: 'client',
      text: 'Could we also talk to a hiker who doesn’t use Shokz, for contrast?',
      highlight: 'Could we also talk to a hiker who doesn’t use Shokz, for contrast?',
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
              quote: 'Drop the question on current headphones.',
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
        quote: 'A hiker who doesn’t use Shokz.',
        documents: [],
        questionIndex: null,
        matches: 4,
        matchNote: other ? `${other.name} (Expert ${other.letter}) is one of them.` : null,
        status: 'open',
      },
    ],
    questionTopics: topics,
    coveredBefore: [...find('Activity record'), ...find('Longest outing')],
    notes: [],
    endedAt: null,
    duration: null,
    sentToClientAt: null,
    expertPaidAt: null,
    version: booking.version,
  };
}
