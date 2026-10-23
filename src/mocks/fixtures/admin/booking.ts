import type {
  Booking,
  BookingPick,
  ChecklistItem,
  ClientDraft,
  InboxRequest,
  NotPicked,
  Project,
  TimeSlot,
} from '@/features/admin';
import { PM_NAME, PROJECTS_INBOX } from './seed';

const PLATFORM = 'Xpert Network';

/** "Thu 29 Oct at 15:00", the way a client writes it in an email (GMT). */
function spoken(slot: TimeSlot): string {
  const date = new Date(slot.startsAt);
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day} at ${time}`;
}

const HOUR = 60 * 60 * 1000;
const at = (iso: string, deltaMs: number) =>
  new Date(new Date(iso).getTime() + deltaMs).toISOString();

/**
 * Screen 11: the client's scripted reply to the email sent from screen 10. They pick the first
 * one or two experts, and for PRJ-1042 add a note for Expert B.
 */
export function buildBooking(project: Project, draft: ClientDraft, now: Date): Booking {
  const first = draft.to.name.split(' ')[0] ?? draft.to.name;
  const count = draft.settings.pickUpToTwo ? Math.min(2, draft.experts.length) : 1;
  const chosen = draft.experts.slice(0, count);
  const rest = draft.experts.slice(count);
  const noteFor = (index: number) =>
    project.id === 'PRJ-1042' && index === 1 ? 'contract pricing in Poland' : null;

  const picks: BookingPick[] = chosen.map((expert, index) => ({
    expertId: expert.expertId,
    letter: expert.letter,
    name: expert.name,
    photoUrl: expert.photoUrl,
    role: expert.role,
    rateHint: expert.rateHint,
    // Expert A's later free time and B's earlier one, so the calls fall on different days.
    slot: (index === 0 ? expert.slots.at(-1) : expert.slots[0]) ??
      expert.slots[0] ?? { id: 'slot_tbd', startsAt: now.toISOString() },
    covers: expert.covers,
    note: noteFor(index),
    confirmedAt: null,
  }));
  const notPicked: NotPicked[] = rest.map((expert, index) => ({
    expertId: expert.expertId,
    letter: expert.letter,
    name: expert.name,
    photoUrl: expert.photoUrl,
    role: expert.role,
    rateHint: expert.rateHint,
    // The AI suggests keeping the next two on standby and releasing anyone after them.
    standby: index < 2,
  }));

  const choices = picks.map((p) => `Expert ${p.letter} on ${spoken(p.slot)}`).join(' and ');
  const noted = picks.find((p) => p.note);
  const body = `Thanks — I choose ${choices}.${noted ? ` Please make sure Expert ${noted.letter} can talk about ${noted.note}.` : ''}`;
  const letters = picks.map((p) => `Expert ${p.letter}`).join(' and ');
  const plural = picks.length > 1;

  const nextSteps: Booking['nextSteps'] = [
    { lead: 'Sync:', text: `confirm ${first}’s times with ${letters} by email + SMS` },
    ...(noted
      ? [
          {
            lead: null,
            text: `Add ${first}’s note about ${noted.note} to Expert ${noted.letter}’s briefing pack`,
          },
        ]
      : []),
    ...(notPicked.length > 0
      ? [
          {
            lead: null,
            text:
              notPicked.length > 1
                ? `Release the held slots of the other ${notPicked.length} experts`
                : 'Release the held slot of the expert not picked',
          },
        ]
      : []),
    { lead: `Tell ${first}`, text: 'the times are locked, with calendar invites' },
    { lead: 'Lock', text: 'the project scope and questions as v1.0' },
  ];

  const signOff = `Thanks,\n${PM_NAME} · ${PLATFORM}`;
  const ai = {
    intro: `Hi ${first},\n\n${plural ? 'Both experts' : 'Your expert'} confirmed. Your call${plural ? 's are' : ' is'} locked:`,
    closing: `Calendar invites with the video link are on their way.${noted ? ` I’ve asked Expert ${noted.letter} to cover ${noted.note}, as you requested.` : ''}\n\n${signOff}`,
  };
  const short = {
    intro: `Hi ${first}, your call${plural ? 's are' : ' is'} locked:`,
    closing: `Invites to follow.\n\n${signOff}`,
  };

  const reply = {
    inboxId: `req_reply_${project.id}`,
    from: draft.to.email,
    to: PROJECTS_INBOX,
    subject: `Re: ${draft.subject}`,
    body,
    receivedAt: now.toISOString(),
  };

  return {
    projectId: project.id,
    client: { name: draft.to.name, email: draft.to.email, company: project.client.name },
    reply,
    questionTopics: draft.questionTopics,
    picks,
    notPicked,
    nextSteps,
    stage: 'picked',
    syncedAt: null,
    message: {
      subject: `Your ${picks.length} expert call${plural ? 's are' : ' is'} booked`,
      ...ai,
      attachInvites: true,
      revealNames: true,
      ai,
      short,
    },
    messageSavedAt: null,
    bookedAt: null,
    version: project.version,
    checklist: [],
    call: {
      moderator: 'You',
      where: 'Video link + dial-in',
      recording: 'Transcript on (client OK’d)',
      reminders: '24 h + 1 h before',
    },
    briefing: {
      context:
        project.id === 'PRJ-1042'
          ? 'An investor is studying the European EV battery recycling market: feedstock, recovery costs, regulation and the leading players.'
          : `A client is researching ${project.name}.`,
      questions: project.questions.map((q) => q.text),
      doNotShare:
        'Confidential information from current or former employers, or anything under NDA.',
    },
  };
}

/** The client's reply as it lands in the projects inbox (screen 02). */
export function replyInboxRequest(project: Project, booking: Booking): InboxRequest {
  const picked = booking.picks.map((p) => `Expert ${p.letter} ${spoken(p.slot)}`).join(' · ');
  const t = booking.reply.receivedAt;
  return {
    id: booking.reply.inboxId,
    from: { name: booking.client.name, email: booking.client.email },
    company: booking.client.company,
    to: booking.reply.to,
    subject: booking.reply.subject,
    body: booking.reply.body,
    receivedAt: t,
    status: 'client_reply',
    attachment: null,
    steps: [
      { label: `Reply matched to ${project.id}`, done: true, at: t },
      { label: `AI read the picks: ${picked}`, done: true, at: t },
      { label: 'Waiting for you to sync with the experts', done: false, at: null },
    ],
    confirmations: [],
    autoReply: null,
    projectId: project.id,
  };
}

/** Screen 13: what the AI did when the PM locked the project, and what is still scheduled. */
export function buildChecklist(booking: Booking, now: Date): ChecklistItem[] {
  const iso = now.toISOString();
  const first = [...booking.picks].sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt));
  const earliest = first[0]?.slot.startsAt ?? iso;
  const standby = booking.notPicked.filter((e) => e.standby).map((e) => e.letter);
  const letters = booking.picks.map((p) => p.letter).join(' and ');
  return [
    {
      label: `Expert ${letters} re-confirmed the slot${booking.picks.length > 1 ? 's' : ''} by SMS`,
      doneAt: booking.syncedAt ?? iso,
      scheduledFor: null,
    },
    ...(booking.notPicked.length > 0
      ? [
          {
            label:
              standby.length === booking.notPicked.length
                ? `Expert ${standby.join(' & ')} kept on standby`
                : `Held slots of the ${booking.notPicked.length} not picked released${standby.length ? `; ${standby.join(' & ')} on standby` : ''}`,
            doneAt: booking.syncedAt ?? iso,
            scheduledFor: null,
          },
        ]
      : []),
    {
      label: booking.message.attachInvites
        ? 'Calendar invites sent to client, experts and you'
        : 'Times sent to client, experts and you',
      doneAt: iso,
      scheduledFor: null,
    },
    { label: 'Video room + dial-in created', doneAt: iso, scheduledFor: null },
    { label: 'Experts signed compliance + confidentiality terms', doneAt: iso, scheduledFor: null },
    {
      label: 'Send briefing pack to experts',
      doneAt: null,
      scheduledFor: at(earliest, -24 * HOUR),
    },
    { label: 'Send call agenda to client', doneAt: null, scheduledFor: at(earliest, -6 * HOUR) },
  ];
}
