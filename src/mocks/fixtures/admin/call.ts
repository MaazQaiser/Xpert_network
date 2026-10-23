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
  const oem = topics.indexOf('OEM pricing');

  const lines: TranscriptLine[] = [
    {
      id: 'ln_1',
      at: t(20, 52),
      speaker: 'client',
      text: 'So on recovery costs — what’s realistic per tonne for a hydro plant today?',
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_2',
      at: t(21, 18),
      speaker: 'expert',
      text: 'It depends a lot on feedstock quality. For a plant around 20 kt, you’re looking at roughly €1,000 to €1,400 per tonne, all in.',
      highlight: null,
      covers: find('Recovery costs'),
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
      text: 'On black mass, a handful of traders still control most of the flow into Germany and Poland.',
      highlight: null,
      covers: find('Black mass supply'),
    },
    {
      id: 'ln_6',
      at: t(25, 30),
      speaker: 'client',
      text: 'And who are the players you’d watch most closely?',
      highlight: null,
      covers: [],
    },
    {
      id: 'ln_7',
      at: t(26, 5),
      speaker: 'expert',
      text: 'The two big hydro operators in the Nordics, plus a German OEM joint venture that’s scaling fast.',
      highlight: null,
      covers: find('Leading players'),
    },
    {
      id: 'ln_8',
      at: t(27, 5),
      speaker: 'client',
      text: 'Actually, let’s drop the question on OEM pricing — it’s not relevant to us anymore.',
      highlight:
        'Actually, let’s drop the question on OEM pricing — it’s not relevant to us anymore.',
      covers: [],
    },
    {
      id: 'ln_9',
      at: t(27, 40),
      speaker: 'expert',
      text: 'Sure. On the regulation side, the recycled-content targets in the EU Battery Regulation are what really drive demand.',
      highlight: null,
      covers: find('EU regulation'),
    },
    {
      id: 'ln_10',
      at: t(31, 12),
      speaker: 'client',
      text: 'Could we also get someone who knows the Polish market specifically?',
      highlight: 'Could we also get someone who knows the Polish market specifically?',
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
      ...(oem >= 0
        ? [
            {
              id: 'rq_drop',
              kind: 'remove_requirement' as const,
              at: t(27, 5),
              lineId: 'ln_8',
              quote: 'Drop the question on OEM pricing.',
              documents: [],
              questionIndex: oem,
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
        quote: 'Someone who knows the Polish market.',
        documents: [],
        questionIndex: null,
        matches: 4,
        matchNote: other ? `${other.name} (Expert ${other.letter}) is one of them.` : null,
        status: 'open',
      },
    ],
    questionTopics: topics,
    coveredBefore: find('Market size'),
    notes: [],
    endedAt: null,
    duration: null,
    sentToClientAt: null,
    expertPaidAt: null,
    version: booking.version,
  };
}
