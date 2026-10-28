import type { CallDetail, CallRecord, Meeting } from '@/features/admin';
import { buildSchedule } from './schedule';

/**
 * The Calls page: every booked call from the PM's calendar, with the record the AI keeps of
 * it. Past calls are completed (transcript, summary, follow-ups); the one in progress is live
 * (transcript so far); the rest are upcoming. Content is scripted per project and reads the
 * same each time, with the people's names filled in.
 */

type Line = { at: number; speaker: 'client' | 'expert' | 'pm'; text: string };
type Script = {
  questions: string[];
  /** Which questions a full call covers (by index). */
  covered: number[];
  purpose: string;
  takeaways: string[];
  nextSteps: { text: string; owner: 'pm' | 'expert' | 'client'; at: number }[];
  moments: { at: number; title: string }[];
  /** What the expert said to each question, in order; null where the call didn't get to it. */
  answers: ({ text: string; at: number } | null)[];
  lines: Line[];
  requests: {
    kind: 'document' | 'remove_requirement' | 'new_requirement';
    text: string;
    at: number;
  }[];
  subject: string;
  body: string;
};

const SCRIPTS: Record<string, Script> = {
  'PRJ-1039': {
    questions: [
      'How far along are German mid-size plants with line automation?',
      'Which vendors win most retrofit projects today?',
      'What does a typical retrofit cost and how long does it take?',
      'Where do automation projects usually stall?',
      'How is the labour shortage changing buying decisions?',
    ],
    answers: [
      {
        text: 'About a third of mid-size plants run partly automated lines. Full retrofits are still rare, mostly because owners can’t afford the downtime.',
        at: 345,
      },
      {
        text: 'Siemens and two regional integrators win most retrofit work. Plants pick on track record and service cover; price is rarely the deciding factor.',
        at: 1290,
      },
      {
        text: 'A single-line retrofit costs €1.2–2m and takes 9–14 months, at the long end when the plant keeps producing alongside.',
        at: 880,
      },
      {
        text: 'Projects stall on integrating with old MES systems, and on getting the works council to sign off.',
        at: 1510,
      },
      null,
    ],
    covered: [0, 1, 2, 3],
    purpose:
      'Test how ready German mid-size manufacturers are for line automation, and who they buy from.',
    takeaways: [
      'About a third of mid-size plants run partly automated lines; full retrofits are still rare.',
      'Siemens and two regional integrators win most retrofit work; price is rarely the deciding factor.',
      'A single-line retrofit runs €1.2–2m and 9–14 months, longer if the plant keeps producing.',
      'Projects stall on integration with old MES systems and on works-council sign-off.',
    ],
    nextSteps: [
      { text: 'Send {client} the retrofit cost ranges {expert} mentioned', owner: 'pm', at: 840 },
      { text: 'Share the anonymised vendor shortlist', owner: 'expert', at: 1260 },
      { text: 'Find a second expert on works-council approvals', owner: 'pm', at: 2100 },
    ],
    moments: [
      { at: 0, title: 'Introductions' },
      { at: 300, title: 'How automated plants are today' },
      { at: 840, title: 'Retrofit cost and timeline' },
      { at: 1500, title: 'Where projects stall' },
      { at: 2400, title: 'Wrap-up and next steps' },
    ],
    lines: [
      {
        at: 5,
        speaker: 'pm',
        text: 'Thanks both for joining. {expert}, could you start with your background in plant automation?',
      },
      {
        at: 40,
        speaker: 'expert',
        text: 'Sure. I ran operations for a contract manufacturer with four plants in Bavaria and Saxony for nine years.',
      },
      {
        at: 310,
        speaker: 'client',
        text: 'How far along are mid-size plants with automating their lines, in your view?',
      },
      {
        at: 345,
        speaker: 'expert',
        text: 'About a third run partly automated lines. Full retrofits are still rare, mostly because of downtime.',
      },
      { at: 850, speaker: 'client', text: 'What does a retrofit of one line actually cost?' },
      {
        at: 880,
        speaker: 'expert',
        text: 'Between 1.2 and 2 million euros, and nine to fourteen months if you keep producing alongside.',
      },
      {
        at: 1270,
        speaker: 'client',
        text: 'Could you send us the vendors you saw win most of that work?',
      },
      {
        at: 1290,
        speaker: 'expert',
        text: 'Yes, I can share an anonymised shortlist after the call.',
      },
      {
        at: 1510,
        speaker: 'expert',
        text: 'Most projects stall on the old MES integration and on getting the works council to sign off.',
      },
      {
        at: 2110,
        speaker: 'client',
        text: 'We should talk to someone who has been through a works-council approval directly.',
      },
      {
        at: 2410,
        speaker: 'pm',
        text: 'Noted, I’ll find a second expert for that. Thanks both, I’ll send notes today.',
      },
    ],
    requests: [
      { kind: 'document', text: 'Anonymised list of the vendors that win retrofit work', at: 1270 },
      {
        kind: 'new_requirement',
        text: 'A second expert who has been through a works-council approval',
        at: 2110,
      },
    ],
    subject: 'Notes from your call with {expert}',
    body: 'Hi {clientFirst},\n\nThanks for the call today. The short version: about a third of mid-size plants run partly automated lines, a one-line retrofit costs €1.2–2m over 9–14 months, and projects mostly stall on MES integration and works-council sign-off.\n\nThe vendor shortlist {expertFirst} mentioned is attached, and I’m finding a second expert on works-council approvals.\n\nBest,\nUmer',
  },
  'PRJ-1041': {
    questions: [
      'Which origins do GCC specialty roasters buy from most?',
      'How do buyers judge quality before a contract?',
      'What price premium does specialty grade carry?',
      'How long are typical supply contracts?',
      'Which importers dominate the region?',
      'How is demand changing in Saudi Arabia?',
    ],
    answers: [
      {
        text: 'Ethiopia and Colombia make up most specialty volume. Yemeni lots are small but sell at a large premium.',
        at: 280,
      },
      {
        text: 'Buyers cup samples in-house and score them; anything under 84 points is rarely bought.',
        at: 740,
      },
      { text: 'Specialty lots carry a 30–60% premium over commercial grade.', at: 1335 },
      null,
      {
        text: 'A handful of Dubai-based importers handle most specialty volume; few roasters buy direct at origin yet.',
        at: 1700,
      },
      {
        text: 'Saudi demand is growing fastest, driven by new cafe chains in Riyadh.',
        at: 2010,
      },
    ],
    covered: [0, 1, 2, 4, 5],
    purpose:
      'Understand how GCC specialty roasters source green coffee, and what they pay for quality.',
    takeaways: [
      'Ethiopia and Colombia make up most specialty volume; Yemeni lots sell at a large premium.',
      'Buyers cup samples in-house and score them; anything under 84 points is rarely bought.',
      'Specialty lots carry a 30–60% premium over commercial grade.',
      'Saudi demand is growing fastest, driven by new cafe chains in Riyadh.',
    ],
    nextSteps: [
      { text: 'Send {client} the cupping score sheet {expert} uses', owner: 'expert', at: 760 },
      { text: 'Check whether {client} still needs contract-length data', owner: 'pm', at: 1900 },
    ],
    moments: [
      { at: 0, title: 'Introductions' },
      { at: 240, title: 'Where the coffee comes from' },
      { at: 700, title: 'Judging quality' },
      { at: 1300, title: 'Price premiums' },
      { at: 2000, title: 'Saudi demand' },
    ],
    lines: [
      {
        at: 6,
        speaker: 'pm',
        text: 'Welcome both. {expert}, a quick word on your buying background to start?',
      },
      {
        at: 35,
        speaker: 'expert',
        text: 'I bought green coffee for a GCC roaster for eight years, mostly East African and Latin American lots.',
      },
      { at: 250, speaker: 'client', text: 'Which origins do roasters here lean on most?' },
      {
        at: 280,
        speaker: 'expert',
        text: 'Ethiopia and Colombia by far. Yemeni lots are small but sell at a big premium.',
      },
      { at: 710, speaker: 'client', text: 'How do buyers judge quality before they sign?' },
      {
        at: 740,
        speaker: 'expert',
        text: 'We cup every sample in-house and score it. Below 84 points we rarely buy. I can share our score sheet.',
      },
      { at: 1310, speaker: 'client', text: 'And the premium for specialty grade?' },
      {
        at: 1335,
        speaker: 'expert',
        text: 'Thirty to sixty percent over commercial, depending on the lot and the score.',
      },
      {
        at: 2010,
        speaker: 'expert',
        text: 'Saudi is where demand is growing fastest, mostly from the new cafe chains in Riyadh.',
      },
      {
        at: 2300,
        speaker: 'pm',
        text: 'That’s great, thank you. I’ll send a summary with the score sheet.',
      },
    ],
    requests: [
      { kind: 'document', text: 'The cupping score sheet used to judge samples', at: 740 },
    ],
    subject: 'Notes from your call with {expert}',
    body: 'Hi {clientFirst},\n\nThanks for the call. Highlights: Ethiopia and Colombia lead specialty volume, buyers rarely take lots under 84 points, specialty carries a 30–60% premium, and Saudi demand is growing fastest.\n\n{expertFirst}’s cupping score sheet is attached.\n\nBest,\nUmer',
  },
  'PRJ-1040': {
    questions: [
      'How much cold-storage capacity is under construction in the UAE?',
      'Which operators lead the market?',
      'What occupancy do new facilities reach in year one?',
      'How do hotels source chilled logistics today?',
    ],
    answers: [
      {
        text: 'Around 400,000 pallet positions are being built, mostly in Dubai South and Abu Dhabi.',
        at: 335,
      },
      {
        text: 'Three operators hold most of the market. Hotels rarely contract with them directly.',
        at: 930,
      },
      null,
      {
        text: 'Hotel groups buy through food distributors, who bundle cold storage into delivery.',
        at: 1510,
      },
    ],
    covered: [0, 1, 3],
    purpose: 'Size UAE cold-chain capacity and see how hotel groups buy chilled logistics.',
    takeaways: [
      'Around 400,000 pallet positions are being built, mostly in Dubai South and Abu Dhabi.',
      'Three operators hold most of the market; hotels rarely contract directly.',
      'Hotel groups buy through food distributors who bundle cold storage into delivery.',
    ],
    nextSteps: [
      { text: 'Send {client} the operator list {expert} named', owner: 'pm', at: 900 },
      { text: 'Ask {expert} for first-year occupancy data', owner: 'pm', at: 1500 },
    ],
    moments: [
      { at: 0, title: 'Introductions' },
      { at: 300, title: 'Capacity being built' },
      { at: 900, title: 'Who runs the market' },
      { at: 1500, title: 'How hotels buy' },
    ],
    lines: [
      {
        at: 5,
        speaker: 'pm',
        text: 'Thanks for making time. {expert}, would you introduce yourself?',
      },
      {
        at: 30,
        speaker: 'expert',
        text: 'I ran logistics for a cold-chain operator in Jebel Ali for six years.',
      },
      { at: 310, speaker: 'client', text: 'How much capacity is being built right now?' },
      {
        at: 335,
        speaker: 'expert',
        text: 'Roughly 400,000 pallet positions, most of it in Dubai South and Abu Dhabi.',
      },
      { at: 910, speaker: 'client', text: 'Who leads the market today?' },
      {
        at: 930,
        speaker: 'expert',
        text: 'Three operators hold most of it. I can name them after the call.',
      },
      {
        at: 1510,
        speaker: 'expert',
        text: 'Hotels rarely contract cold storage directly. Their food distributors bundle it into delivery.',
      },
      { at: 1800, speaker: 'pm', text: 'Very helpful. I’ll follow up with notes.' },
    ],
    requests: [
      { kind: 'document', text: 'Names of the three leading cold-chain operators', at: 930 },
    ],
    subject: 'Notes from your call with {expert}',
    body: 'Hi {clientFirst},\n\nThanks for the call. In short: about 400,000 pallet positions are being built, three operators lead the market, and hotels buy cold storage through their food distributors rather than directly.\n\nI’ll send the operator list shortly and I’ve asked {expertFirst} for first-year occupancy figures.\n\nBest,\nUmer',
  },
  'PRJ-1043': {
    questions: [
      'What does it take to hold your own Part 145 approval?',
      'Which quality functions are hardest to separate?',
      'How do customers react to a change of approval holder?',
      'What does a first CAA audit usually find?',
    ],
    answers: [
      {
        text: 'The CAA wants an accountable manager and a quality system separate from the parent before it grants approval.',
        at: 280,
      },
      {
        text: 'Continuing airworthiness and the stores system are the hardest to separate.',
        at: 910,
      },
      null,
      {
        text: 'First audits mostly find procedures still pointing at the parent’s manuals.',
        at: 1530,
      },
    ],
    covered: [0, 1, 3],
    purpose: 'Test how ready a carved-out MRO is to hold its own Part 145 approval.',
    takeaways: [
      'The CAA wants an accountable manager and a separate quality system before it grants approval.',
      'Continuing airworthiness and the stores system are the hardest to separate.',
      'First audits mostly find procedures still pointing at the parent’s manuals.',
    ],
    nextSteps: [
      {
        text: 'Send {client} the exposition checklist {expert} described',
        owner: 'expert',
        at: 700,
      },
      { text: 'Find an expert on customer reaction to approval changes', owner: 'pm', at: 1600 },
    ],
    moments: [
      { at: 0, title: 'Introductions' },
      { at: 240, title: 'Getting your own approval' },
      { at: 900, title: 'Hardest functions to separate' },
      { at: 1500, title: 'First CAA audit' },
    ],
    lines: [
      {
        at: 5,
        speaker: 'pm',
        text: 'Thanks both. {expert}, could you start with your Part 145 background?',
      },
      {
        at: 30,
        speaker: 'expert',
        text: 'I was Head of Quality at a Part 145 MRO through its separation from an airline.',
      },
      {
        at: 250,
        speaker: 'client',
        text: 'What does the CAA need before it grants a new approval?',
      },
      {
        at: 280,
        speaker: 'expert',
        text: 'Your own accountable manager and a separate quality system. I have an exposition checklist I can share.',
      },
      {
        at: 910,
        speaker: 'expert',
        text: 'Continuing airworthiness and the stores system are the hardest; they’re woven into the airline.',
      },
      { at: 1510, speaker: 'client', text: 'What does a first audit usually find?' },
      {
        at: 1530,
        speaker: 'expert',
        text: 'Procedures still pointing at the parent’s manuals. Clean those first.',
      },
      {
        at: 1610,
        speaker: 'client',
        text: 'We still need a view on how customers react to the change.',
      },
    ],
    requests: [
      { kind: 'document', text: 'The Part 145 exposition checklist', at: 280 },
      {
        kind: 'new_requirement',
        text: 'An expert on customer reaction to a change of approval holder',
        at: 1610,
      },
    ],
    subject: 'Notes from your call with {expert}',
    body: 'Hi {clientFirst},\n\nThanks for the call. Key points: the CAA needs your own accountable manager and quality system, continuing airworthiness and stores are the hardest to separate, and first audits mostly find procedures still pointing at the parent’s manuals.\n\n{expertFirst}’s exposition checklist is attached, and I’m finding an expert on customer reaction.\n\nBest,\nUmer',
  },
};

const first = (name: string) => name.split(' ')[0] ?? name;

function fill(text: string, meeting: Meeting): string {
  return text
    .replaceAll('{expert}', meeting.expert.name)
    .replaceAll('{expertFirst}', first(meeting.expert.name))
    .replaceAll('{client}', meeting.client.name)
    .replaceAll('{clientFirst}', first(meeting.client.name));
}

// ——— Cameras ————————————————————————————————————————————————————————————————————
// The prototype has no recordings, so each person on a call is played by a free webcam clip
// (Pexels licence; public/videos/calls), picked to sit close to their profile photo. On the
// Calls pages their face is a still from that clip, so the video and the face agree.
const CLIPS = ['5941020', '5442623', '8865875', '8048255', '4928377', '6290465'] as const;
type Clip = (typeof CLIPS)[number];
const CLIP_FOR: Record<string, Clip> = {
  'Tom Becker': '4928377',
  'Bilal Haddad': '4928377',
  'Ayesha Rahman': '8865875',
  'Amy Wang': '8865875',
  'Jessica Lane': '5442623',
  'Kayla Hughes': '8865875',
  'Nathan Ellis': '8048255',
  'Evan Porter': '6290465',
  'Marcus Hayes': '8048255',
  'Olivia Bennett': '5442623',
  'Megan Price': '5941020',
  'Natalie Grant': '5442623',
  'Chris Dalton': '6290465',
  'Rachel Adams': '5941020',
  'Justin Wade': '6290465',
  'Ashley Turner': '5941020',
  'Emily Carter': '5442623',
  'Kevin Walsh': '8048255',
};
const MODERATOR_CLIP = '7682580';

function clipOf(videoUrl: string): string | undefined {
  return /pexels-(\d+)\.mp4$/.exec(videoUrl)?.[1];
}

function clipFiles(clip: string) {
  return {
    photoUrl: `/videos/calls/pexels-${clip}-face.jpg`,
    videoUrl: `/videos/calls/pexels-${clip}.mp4`,
  };
}

/** A person's camera; never the same clip as the other side of the same call. */
function cameraFor(name: string, avoid?: string): ReturnType<typeof clipFiles> {
  const index = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  let clip: string = CLIP_FOR[name] ?? CLIPS[index % CLIPS.length] ?? CLIPS[0];
  if (clip === avoid) clip = CLIPS[(CLIPS.indexOf(clip as Clip) + 1) % CLIPS.length] ?? CLIPS[0];
  return clipFiles(clip);
}

/** When this page (and so the mock backend) opened; the live call streams from here. */
const OPENED_AT = Date.now();
/** How often the live call's next line arrives in the demo. */
const LIVE_LINE_EVERY_MS = 6000;

/** Each project's industry, for the knowledge base. */
const INDUSTRY: Record<string, string> = {
  'PRJ-1039': 'Industrial automation',
  'PRJ-1040': 'Cold chain & logistics',
  'PRJ-1041': 'Food & beverage',
  'PRJ-1043': 'Aviation & MRO',
};

function statusOf(meeting: Meeting, now: Date): CallRecord['status'] {
  if (new Date(meeting.endsAt) <= now) return 'completed';
  if (new Date(meeting.startsAt) <= now) return 'live';
  return 'upcoming';
}

function toDetail(meeting: Meeting, now: Date, sentAt: string | null): CallDetail | null {
  const script = SCRIPTS[meeting.projectId];
  const schedule = buildSchedule(now);
  const project = schedule.projects.find((p) => p.id === meeting.projectId);
  if (!script || !project || !meeting.meetUrl) return null;
  const status = statusOf(meeting, now);
  const length = (new Date(meeting.endsAt).getTime() - new Date(meeting.startsAt).getTime()) / 1000;
  // Fit the script to this call's length, and to what has been said so far when it's live.
  const scale = Math.min(1, length / 2700);
  const elapsed =
    status === 'live' ? (now.getTime() - new Date(meeting.startsAt).getTime()) / 1000 : length;
  const lines = script.lines.map((line, i) => ({
    id: `${meeting.id}_l${i}`,
    at: Math.round(line.at * scale),
    speaker: line.speaker,
    text: fill(line.text, meeting),
  }));
  // A live call keeps talking while you watch: on top of what was said before the page
  // opened, the next line arrives every few seconds (demo pace, not real time).
  const before = lines.filter((line) => line.at <= elapsed).length;
  const streamed =
    status === 'live' ? Math.floor((now.getTime() - OPENED_AT) / LIVE_LINE_EVERY_MS) : 0;
  const said = status === 'upcoming' ? [] : lines.slice(0, before + Math.max(0, streamed));
  // How far the conversation has got, for what the AI has picked up so far.
  const reached = status === 'live' ? Math.max(elapsed, said.at(-1)?.at ?? 0) : elapsed;
  const heard = (at: number) => status === 'completed' || Math.round(at * scale) <= reached;
  // A live call covers the client's questions in step with the time gone.
  const coveredSoFar =
    status === 'completed'
      ? script.covered
      : script.covered.slice(
          0,
          Math.floor((Math.min(reached, length) / length) * script.covered.length),
        );
  const requests =
    status === 'upcoming'
      ? []
      : script.requests
          .filter((r) => heard(r.at))
          .map((r, i) => ({
            id: `${meeting.id}_r${i}`,
            kind: r.kind,
            text: fill(r.text, meeting),
            at: Math.round(r.at * scale),
          }));
  const followUpsOpen = status === 'completed' && !sentAt ? requests.length + 1 : 0;
  const clientCamera = cameraFor(meeting.client.name);

  return {
    id: meeting.id,
    status,
    projectId: meeting.projectId,
    projectName: project.name,
    industry: INDUSTRY[meeting.projectId] ?? 'Research',
    colour: project.colour,
    client: {
      name: meeting.client.name,
      detail: meeting.client.detail,
      ...clientCamera,
    },
    expert: {
      name: meeting.expert.name,
      detail: meeting.expert.detail,
      ...cameraFor(meeting.expert.name, clipOf(clientCamera.videoUrl)),
    },
    moderator: { name: 'Umer', detail: 'Project manager', ...clipFiles(MODERATOR_CLIP) },
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    meetUrl: meeting.meetUrl,
    briefingSent:
      status !== 'upcoming' ||
      new Date(meeting.startsAt).getTime() - now.getTime() < 24 * 3_600_000,
    questionCount: script.questions.length,
    questionsCovered: status === 'upcoming' ? 0 : coveredSoFar.length,
    followUpsOpen,
    followUpsSentAt: sentAt,
    purpose: script.purpose,
    takeaways: status === 'completed' ? script.takeaways : [],
    questions: script.questions.map((text, i) => {
      const covered = status !== 'upcoming' && coveredSoFar.includes(i);
      const answer = covered ? script.answers[i] : null;
      return {
        text,
        covered,
        answer: answer ? fill(answer.text, meeting) : null,
        at: answer ? Math.round(answer.at * scale) : null,
      };
    }),
    nextSteps:
      status === 'completed'
        ? script.nextSteps.map((step, i) => ({
            id: `${meeting.id}_s${i}`,
            text: fill(step.text, meeting),
            owner:
              step.owner === 'pm'
                ? 'Umer'
                : step.owner === 'expert'
                  ? first(meeting.expert.name)
                  : first(meeting.client.name),
            at: Math.round(step.at * scale),
          }))
        : [],
    moments: script.moments
      .map((m) => ({ at: Math.round(m.at * scale), title: m.title }))
      .filter((m) => status === 'completed' || m.at <= reached),
    transcript: said,
    requests,
    email: {
      to: meeting.client.name,
      toEmail: meeting.client.email ?? '',
      subject: fill(script.subject, meeting),
      body: fill(script.body, meeting),
    },
  };
}

/** Every booked call, with its record; follow-ups already sent are passed in by id. */
export function buildCalls(now: Date, sent: Record<string, string>): CallDetail[] {
  return buildSchedule(now)
    .meetings.filter((m) => m.kind === 'booked')
    .map((m) => toDetail(m, now, sent[m.id] ?? null))
    .filter((c): c is CallDetail => c !== null);
}

/** The list view: the record without the long parts. */
export function toRecord(call: CallDetail): CallRecord {
  return {
    id: call.id,
    status: call.status,
    projectId: call.projectId,
    projectName: call.projectName,
    industry: call.industry,
    colour: call.colour,
    client: call.client,
    expert: call.expert,
    startsAt: call.startsAt,
    endsAt: call.endsAt,
    meetUrl: call.meetUrl,
    briefingSent: call.briefingSent,
    questionCount: call.questionCount,
    questionsCovered: call.questionsCovered,
    followUpsOpen: call.followUpsOpen,
    followUpsSentAt: call.followUpsSentAt,
  };
}
